import "../css/common.css";
import "../css/braille.css";

import { type BrailleCell, BrailleConverter, type BrailleParams } from "./braille_converter.ts";

window.addEventListener("DOMContentLoaded", init);

function init(): void
{
    const input         = document.querySelector<HTMLInputElement>("#image-upload-button");
    const sourceImage   = document.querySelector<HTMLCanvasElement>("#source-image");
    const resultImage   = document.querySelector<HTMLCanvasElement>("#result-image");
    const resultPreview = document.querySelector<HTMLElement>("#result-preview");
    const status        = document.querySelector<HTMLElement>("#image-status");
    const copyButton    = document.querySelector<HTMLButtonElement>("#copy-braille");
    const copyStatus    = document.querySelector<HTMLElement>("#copy-status");

    if (!input || !sourceImage || !resultImage || !resultPreview || !status || !copyButton || !copyStatus)
    {
        return;
    }

    const ctx = sourceImage.getContext("2d", { willReadFrequently: true });
    if (!ctx)
    {
        return;
    }

    let converter: BrailleConverter | null = null;
    let cells: BrailleCell[][]             = [];
    let imageRequest                       = 0;
    let previewWidth                       = 0;
    let drawnPixelRatio                    = window.devicePixelRatio || 1;

    const params: BrailleParams = {
        columns           : 128,
        rows              : 128,
        blackThreshold    : 64,
        alphaThreshold    : 32,
        gamma             : 0.6,
        greyscale         : true,
        normalizeGreyscale: true
    };

    const drawResult = () =>
    {
        drawnPixelRatio = window.devicePixelRatio || 1;
        renderBraille(cells, resultImage, previewWidth);
    };
    const observer   = new ResizeObserver(entries =>
                                          {
                                              const width = entries[0]!.contentRect.width;
                                              if (width === previewWidth)
                                              {
                                                  return;
                                              }

                                              previewWidth = width;
                                              drawResult();
                                          });
    observer.observe(resultPreview);
    window.addEventListener("resize", () =>
    {
        if ((window.devicePixelRatio || 1) !== drawnPixelRatio)
        {
            drawResult();
        }
    });

    // Future settings handlers can regenerate from the same original pixels.
    const updateResult = () =>
    {
        if (!converter)
        {
            return;
        }

        cells                  = converter.Generate(params);
        const mode             = params.greyscale ? "greyscale" : "palette";
        status.textContent     = `${cells[0]!.length} × ${cells.length} cells · ${mode}`;
        copyButton.disabled    = false;
        copyStatus.textContent = "";

        drawResult();
    };

    copyButton.addEventListener("click", async () =>
    {
        const text = cells.map(row => row.map(cell => String.fromCodePoint(0x2800 + cell.dotMask)).join("")).join("\n");

        try
        {
            await navigator.clipboard.writeText(text);
            copyStatus.textContent = "Copied! Now go and paste it somewhere cool.";
        } catch (error)
        {
            copyStatus.textContent = "Could not copy. Most likely because your clipboard permissions are a little strict. Sorry!";
            console.error("Could not copy Braille text:", error);
        }
    });

    input.addEventListener("change", async () =>
    {
        const file = input.files?.[0];
        if (!file)
        {
            return;
        }

        const request      = ++imageRequest;
        status.textContent = "Opening image…";

        try
        {
            const bitmap = await createImageBitmap(file);

            try
            {
                if (request !== imageRequest)
                {
                    return;
                }

                sourceImage.width  = bitmap.width;
                sourceImage.height = bitmap.height;
                ctx.drawImage(bitmap, 0, 0);

                const pixels = ctx.getImageData(0, 0, sourceImage.width, sourceImage.height);
                converter    = new BrailleConverter(pixels);
                updateResult();
            } finally
            {
                bitmap.close();
            }
        } catch (error)
        {
            if (request === imageRequest)
            {
                status.textContent = "Could not open this image. Try another file.";
                console.error("Could not load the image:", error);
            }
        }
    });
}

function renderBraille(cells: BrailleCell[][], output: HTMLCanvasElement, width: number): void
{
    const rows    = cells.length;
    const columns = cells[0]?.length ?? 0;
    if (rows === 0 || columns === 0 || width <= 0)
    {
        return;
    }

    const ctx = output.getContext("2d");
    if (!ctx)
    {
        return;
    }

    const spacing    = width / (columns * 2);
    const height     = rows * 4 * spacing;
    const pixelRatio = window.devicePixelRatio || 1;

    output.width        = Math.max(1, Math.round(width * pixelRatio));
    output.height       = Math.max(1, Math.round(height * pixelRatio));
    output.style.width  = `${width}px`;
    output.style.height = `${height}px`;
    ctx.setTransform(output.width / width, 0, 0, output.height / height, 0, 0);
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const dotBits = [[1, 8], [2, 16], [4, 32], [64, 128]] as const;

    const dotFill = 0.6;
    const radius  = spacing * dotFill / 2;

    for (const [rowIndex, row] of cells.entries())
    {
        for (const [columnIndex, cell] of row.entries())
        {
            ctx.fillStyle = `rgb(${cell.color.r}, ${cell.color.g}, ${cell.color.b})`;

            for (const [dotRow, bits] of dotBits.entries())
            {
                for (const [dotColumn, bit] of bits.entries())
                {
                    if ((cell.dotMask & bit) === 0)
                    {
                        continue;
                    }

                    const x = (columnIndex * 2 + dotColumn + 0.5) * spacing;
                    const y = (rowIndex * 4 + dotRow + 0.5) * spacing;
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
}
