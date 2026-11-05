import "./common.ts";
import { isTerminalOpen } from "./terminal.ts";

import { type BrailleCell, BrailleConverter, type BrailleParams } from "./braille_converter.ts";
import { getPreset, palettePresets }                              from "./braille_palettes.ts";

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
    const settings      = document.querySelector<HTMLFieldSetElement>("#conversion-settings");

    if (!input || !sourceImage || !resultImage || !resultPreview || !status || !copyButton || !copyStatus || !settings)
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
    let dotFill                            = 0.6;
    let cellSpacing                        = 0.32;

    const defaultPalette = getPreset("Web Safe 216") ?? palettePresets[0]!;
    const params: BrailleParams = {
        columns           : 128,
        rows              : 128,
        blackThreshold    : 64,
        alphaThreshold    : 32,
        gamma             : 0.6,
        greyscale         : true,
        normalizeGreyscale: true,
        paletteSaturation : 1,
        paletteBrightness : 1,
        palette           : defaultPalette.colors
    };

    const drawResult = () =>
    {
        drawnPixelRatio = window.devicePixelRatio || 1;
        renderBraille(cells, resultImage, previewWidth, dotFill, cellSpacing);
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
        settings.disabled      = false;
        copyStatus.textContent = "";

        drawResult();
    };

    const numericControls = [
        ["max-columns", "columns"],
        ["max-rows", "rows"],
        ["gamma", "gamma"],
        ["black-threshold", "blackThreshold"],
        ["alpha-threshold", "alphaThreshold"]
    ] as const;

    for (const [id, key] of numericControls)
    {
        const control     = document.querySelector<HTMLInputElement>(`#${id}`)!;
        const value       = document.querySelector<HTMLOutputElement>(`#${id}-value`);
        control.value     = String(params[key]);
        const updateValue = () =>
        {
            if (value)
            {
                value.value = key === "gamma" ? params[key].toFixed(2) : String(params[key]);
            }
        };
        updateValue();

        control.addEventListener("input", () =>
        {
            // Number fields can be temporarily empty while the user edits them.
            if (!control.validity.valid)
            {
                return;
            }

            params[key] = control.valueAsNumber;
            updateValue();
            updateResult();
        });
    }

    const normalize   = document.querySelector<HTMLInputElement>("#normalize-greyscale")!;
    normalize.checked = params.normalizeGreyscale;
    normalize.addEventListener("input", () =>
    {
        params.normalizeGreyscale = normalize.checked;
        updateResult();
    });

    const greyscaleTab      = document.querySelector<HTMLButtonElement>("#greyscale-tab")!;
    const paletteTab        = document.querySelector<HTMLButtonElement>("#palette-tab")!;
    const greyscaleSettings = document.querySelector<HTMLElement>("#greyscale-settings")!;
    const paletteSettings   = document.querySelector<HTMLElement>("#palette-settings")!;
    const palettePreset     = document.querySelector<HTMLSelectElement>("#palette-preset")!;
    const paletteControls   = paletteSettings.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select");

    for (const [index, preset] of palettePresets.entries())
    {
        const option       = document.createElement("option");
        option.value       = String(index);
        option.textContent = preset.name;
        palettePreset.append(option);
    }
    palettePreset.value = String(palettePresets.indexOf(defaultPalette));
    palettePreset.addEventListener("change", () =>
    {
        params.palette = palettePresets[Number(palettePreset.value)]!.colors;
        updateResult();
    });

    for (const [id, key] of [["palette-saturation", "paletteSaturation"], ["palette-brightness", "paletteBrightness"]] as const)
    {
        const control = document.querySelector<HTMLInputElement>(`#${id}`)!;
        const value   = document.querySelector<HTMLOutputElement>(`#${id}-value`)!;
        control.value = String(params[key] * 100);
        value.value   = `${control.value}%`;
        control.addEventListener("input", () =>
        {
            params[key] = control.valueAsNumber / 100;
            value.value = `${control.value}%`;
            updateResult();
        });
    }

    const selectMode = (greyscale: boolean) =>
    {
        params.greyscale         = greyscale;
        greyscaleSettings.hidden = !greyscale;
        paletteSettings.hidden   = greyscale;
        normalize.disabled       = !greyscale;
        for (const control of paletteControls)
        {
            control.disabled = greyscale;
        }

        greyscaleTab.setAttribute("aria-selected", String(greyscale));
        paletteTab.setAttribute("aria-selected", String(!greyscale));
        greyscaleTab.tabIndex = greyscale ? 0 : -1;
        paletteTab.tabIndex   = greyscale ? -1 : 0;
        updateResult();
    };
    greyscaleTab.addEventListener("click", () => selectMode(true));
    paletteTab.addEventListener("click", () => selectMode(false));
    for (const tab of [greyscaleTab, paletteTab])
    {
        tab.addEventListener("keydown", event =>
        {
            if (event.defaultPrevented || isTerminalOpen())
            {
                return;
            }

            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            {
                return;
            }

            event.preventDefault();
            const greyscale = event.key === "Home" || (event.key !== "End" && !params.greyscale);
            selectMode(greyscale);
            (greyscale ? greyscaleTab : paletteTab).focus();
        });
    }

    const weight      = document.querySelector<HTMLInputElement>("#font-weight")!;
    const weightValue = document.querySelector<HTMLOutputElement>("#font-weight-value")!;
    weight.value      = String(dotFill * 100);
    weightValue.value = `${weight.value}%`;
    weight.addEventListener("input", () =>
    {
        dotFill           = weight.valueAsNumber / 100;
        weightValue.value = `${weight.value}%`;
        drawResult();
    });

    const spacing      = document.querySelector<HTMLInputElement>("#cell-spacing")!;
    const spacingValue = document.querySelector<HTMLOutputElement>("#cell-spacing-value")!;
    spacing.value      = String(cellSpacing * 100);
    spacingValue.value = `${spacing.value}%`;
    spacing.addEventListener("input", () =>
    {
        cellSpacing        = spacing.valueAsNumber / 100;
        spacingValue.value = `${spacing.value}%`;
        drawResult();
    });

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

function renderBraille(cells: BrailleCell[][],
                       output: HTMLCanvasElement,
                       width: number,
                       dotFill: number,
                       cellSpacing: number): void
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

    // The extra gap is measured in dot spacings and split equally around each cell.
    const cellWidth  = 2 + cellSpacing;
    const cellHeight = 4 + cellSpacing;
    const padding    = cellSpacing / 2;
    const spacing    = width / (columns * cellWidth);
    const height     = rows * cellHeight * spacing;
    const pixelRatio = window.devicePixelRatio || 1;

    output.width        = Math.max(1, Math.round(width * pixelRatio));
    output.height       = Math.max(1, Math.round(height * pixelRatio));
    output.style.width  = `${width}px`;
    output.style.height = `${height}px`;

    ctx.setTransform(output.width / width, 0, 0, output.height / height, 0, 0);
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const dotBits = [[1, 8], [2, 16], [4, 32], [64, 128]] as const;

    const radius = spacing * dotFill / 2;

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

                    const x = (columnIndex * cellWidth + padding + dotColumn + 0.5) * spacing;
                    const y = (rowIndex * cellHeight + padding + dotRow + 0.5) * spacing;
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
}
