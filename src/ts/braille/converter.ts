export type BrailleParams = {
    columns: number;
    rows: number;
    blackThreshold: number;
    alphaThreshold: number;
    gamma: number;
    greyscale: boolean;
    normalizeGreyscale: boolean;
    paletteSaturation: number;
    paletteBrightness: number;
    palette?: readonly RGBColor[];
};

export type RGBColor = {
    r: number;
    g: number;
    b: number;
};
type Pixel = {
    color: RGBColor;
    alpha: number;
};

export type BrailleCell = {
    dotMask: number;
    color: RGBColor;
};

export class BrailleConverter
{
    private static readonly _cellWidth: number     = 2;
    private static readonly _cellHeight: number    = 4;
    private static readonly _bytesPerPixel: number = 4;
    private static readonly _dotBits: number[][]   = [[1, 8], [2, 16], [4, 32], [64, 128]];

    private readonly _sourceImage: ImageData;

    constructor(sourceImage: ImageData)
    {
        this._sourceImage = sourceImage;
    }

    public Generate(params: BrailleParams): BrailleCell[][]
    {
        this.ValidateParams(params);

        const pixels: Pixel[][]       = this.SampleImage(params);
        const dotMap: number[][]      = this.CreateDotMap(pixels, params);
        const result: BrailleCell[][] = this.ApplyColors(pixels, dotMap, params);

        return params.greyscale && params.normalizeGreyscale
               ? this.NormalizeGreyscale(result)
               : result;
    }

    private SampleImage(params: BrailleParams): Pixel[][]
    {
        const scale = Math.min(1,
                               params.columns * BrailleConverter._cellWidth / this._sourceImage.width,
                               params.rows * BrailleConverter._cellHeight / this._sourceImage.height
        );

        const width             = Math.max(1, Math.floor(this._sourceImage.width * scale));
        const height            = Math.max(1, Math.floor(this._sourceImage.height * scale));
        const pixels: Pixel[][] = [];

        for (let row = 0; row < height; row++)
        {
            const pixelRow: Pixel[] = [];
            const sourceY           = Math.floor(row * this._sourceImage.height / height);

            for (let column = 0; column < width; column++)
            {
                const sourceX = Math.floor(column * this._sourceImage.width / width);
                const offset  = (sourceY * this._sourceImage.width + sourceX)
                                * BrailleConverter._bytesPerPixel;

                pixelRow.push({
                                  color: {
                                      r: this._sourceImage.data[offset]!,
                                      g: this._sourceImage.data[offset + 1]!,
                                      b: this._sourceImage.data[offset + 2]!
                                  },
                                  alpha: this._sourceImage.data[offset + 3]!
                              });
            }

            pixels.push(pixelRow);
        }

        return pixels;
    }

    private CreateDotMap(pixels: Pixel[][], params: BrailleParams): number[][]
    {
        const rows    = Math.ceil(pixels.length / BrailleConverter._cellHeight);
        const columns = Math.ceil(pixels[0]!.length / BrailleConverter._cellWidth);

        const dotMap: number[][] = [];

        for (let row = 0; row < rows; row++)
        {
            const dotRow: number[] = [];

            for (let column = 0; column < columns; column++)
            {
                let mask = 0;

                for (const { pixel, dotBit } of this.ReadCellPixels(pixels, row, column))
                {
                    if (pixel.alpha > params.alphaThreshold
                        && this.CalculateBrightness(pixel, params.gamma) >= params.blackThreshold)
                    {
                        mask |= dotBit;
                    }
                }

                dotRow.push(mask);
            }

            dotMap.push(dotRow);
        }

        return dotMap;
    }

    private ApplyColors(pixels: Pixel[][], dotMap: number[][], params: BrailleParams): BrailleCell[][]
    {
        return dotMap.map((dotRow, row) => dotRow.map((mask, column) =>
                                                      {
                                                          const dotColors: RGBColor[] = [];

                                                          for (const { pixel, dotBit } of this.ReadCellPixels(pixels, row, column))
                                                          {
                                                              if ((mask & dotBit) !== 0)
                                                              {
                                                                  dotColors.push(this.GetOutputColor(pixel, params));
                                                              }
                                                          }

                                                          const representative = this.SelectMedoid(dotColors);
                                                          const color          = params.greyscale
                                                                                 ? representative
                                                                                 : this.SelectPaletteColor(this.AdjustPaletteColor(representative, params), params.palette!);

                                                          return { dotMask: mask, color };
                                                      }));
    }

    private* ReadCellPixels(pixels: Pixel[][], cellRow: number, cellColumn: number): Generator<{ pixel: Pixel; dotBit: number }>
    {
        const top  = cellRow * BrailleConverter._cellHeight;
        const left = cellColumn * BrailleConverter._cellWidth;

        // Partial cells at the bottom and right contain fewer source pixels.
        for (let dotRow = 0; dotRow < BrailleConverter._cellHeight && top + dotRow < pixels.length; dotRow++)
        {
            const pixelRow = pixels[top + dotRow]!;
            const dotBits  = BrailleConverter._dotBits[dotRow]!;

            for (let dotColumn = 0; dotColumn < BrailleConverter._cellWidth && left + dotColumn < pixelRow.length; dotColumn++)
            {
                yield { pixel: pixelRow[left + dotColumn]!, dotBit: dotBits[dotColumn]! };
            }
        }
    }

    private CalculateBrightness(pixel: Pixel, gamma: number): number
    {
        const weightedRgb = 299 * pixel.color.r + 587 * pixel.color.g + 114 * pixel.color.b;
        const brightness  = Math.floor(weightedRgb * pixel.alpha / (1000 * 255));

        return this.RoundToEven(255 * Math.pow(brightness / 255, gamma));
    }

    private GetOutputColor(pixel: Pixel, params: BrailleParams): RGBColor
    {
        if (!params.greyscale)
        {
            return pixel.color;
        }

        const brightness = this.CalculateBrightness(pixel, params.gamma);
        return { r: brightness, g: brightness, b: brightness };
    }

    private SelectMedoid(colors: readonly RGBColor[]): RGBColor
    {
        let bestColor: RGBColor = { r: 0, g: 0, b: 0 };
        let bestDistance        = Infinity;
        let bestFrequency       = 0;
        const tieTolerance      = 1e-9;

        for (const candidate of colors)
        {
            let totalDistance = 0;
            let frequency     = 0;

            for (const other of colors)
            {
                const red   = candidate.r - other.r;
                const green = candidate.g - other.g;
                const blue  = candidate.b - other.b;
                totalDistance += Math.sqrt(red * red + green * green + blue * blue);

                if (red === 0 && green === 0 && blue === 0)
                {
                    frequency++;
                }
            }

            const tied = Math.abs(totalDistance - bestDistance) <= tieTolerance;
            if (totalDistance < bestDistance - tieTolerance || (tied && frequency > bestFrequency))
            {
                bestColor     = candidate;
                bestDistance  = totalDistance;
                bestFrequency = frequency;
            }
        }

        // Equal distance and frequency keep the first pixel in row order.
        return bestColor;
    }

    private AdjustPaletteColor(color: RGBColor, params: BrailleParams): RGBColor
    {
        const maximum = Math.max(color.r, color.g, color.b);
        if (maximum === 0)
        {
            return color;
        }

        // Scale HSV saturation and brightness while preserving hue.
        const chroma     = maximum - Math.min(color.r, color.g, color.b);
        const saturation = chroma === 0 ? 0 : Math.min(params.paletteSaturation, maximum / chroma);
        const brightness = Math.min(255, maximum * params.paletteBrightness) / maximum;

        return {
            r: Math.round((maximum - (maximum - color.r) * saturation) * brightness),
            g: Math.round((maximum - (maximum - color.g) * saturation) * brightness),
            b: Math.round((maximum - (maximum - color.b) * saturation) * brightness)
        };
    }

    private SelectPaletteColor(color: RGBColor, palette: readonly RGBColor[]): RGBColor
    {
        let bestColor    = palette[0]!;
        let bestDistance = Infinity;

        for (const candidate of palette)
        {
            const red      = color.r - candidate.r;
            const green    = color.g - candidate.g;
            const blue     = color.b - candidate.b;
            const distance = red * red + green * green + blue * blue;

            if (distance < bestDistance)
            {
                bestColor    = candidate;
                bestDistance = distance;
            }
        }

        return { ...bestColor };
    }

    private NormalizeGreyscale(cells: BrailleCell[][]): BrailleCell[][]
    {
        let brightest = 0;

        for (const row of cells)
        {
            for (const cell of row)
            {
                if (cell.dotMask !== 0)
                {
                    brightest = Math.max(brightest, cell.color.r);
                }
            }
        }

        if (brightest === 0)
        {
            return cells;
        }

        return cells.map(row => row.map(cell =>
                                        {
                                            if (cell.dotMask === 0)
                                            {
                                                return cell;
                                            }

                                            const brightness = this.RoundToEven(cell.color.r * 255 / brightest);
                                            return { dotMask: cell.dotMask, color: { r: brightness, g: brightness, b: brightness } };
                                        }));
    }

    private RoundToEven(value: number): number
    {
        const lower    = Math.floor(value);
        const fraction = value - lower;

        return fraction > 0.5 || (fraction === 0.5 && lower % 2 !== 0) ? lower + 1 : lower;
    }

    private ValidateParams(params: BrailleParams): void
    {
        if (!Number.isInteger(params.columns) || params.columns < 1
            || !Number.isInteger(params.rows) || params.rows < 1)
        {
            throw new RangeError("Columns and rows must be positive integers.");
        }

        if (!Number.isFinite(params.gamma) || params.gamma <= 0)
        {
            throw new RangeError("Gamma must be finite and greater than zero.");
        }

        this.ValidateByte(params.blackThreshold, "Black threshold");
        this.ValidateByte(params.alphaThreshold, "Alpha threshold");

        if (!params.greyscale)
        {
            if (!Number.isFinite(params.paletteSaturation) || params.paletteSaturation < 0
                || !Number.isFinite(params.paletteBrightness) || params.paletteBrightness < 0)
            {
                throw new RangeError("Palette saturation and brightness must be finite and non-negative.");
            }

            if (!params.palette?.length)
            {
                throw new RangeError("Colour mode requires a non-empty palette.");
            }

            for (const color of params.palette)
            {
                this.ValidateByte(color.r, "Palette red");
                this.ValidateByte(color.g, "Palette green");
                this.ValidateByte(color.b, "Palette blue");
            }
        }
    }

    private ValidateByte(value: number, name: string): void
    {
        if (!Number.isInteger(value) || value < 0 || value > 255)
        {
            throw new RangeError(`${name} must be an integer from 0 to 255.`);
        }
    }
}
