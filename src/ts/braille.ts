import "../css/common.css";
import "../css/braille.css";

import { type BrailleCell, BrailleConverter, type BrailleParams } from "./braille_converter.ts";

window.addEventListener("DOMContentLoaded", () =>
{
    init();
});

function init(): void
{
    setupImageUploading();
}

function setupImageUploading(): void
{
    const input = document.getElementById("image-file") as HTMLInputElement;

    if (!input)
    {
        return;
    }

    input.addEventListener("change", async () =>
    {
        const file = input.files?.[0];
        if (!file)
        {
            return;
        }

        const sourceImage = document.getElementById("source-image") as HTMLCanvasElement;
        const resultImage = document.getElementById("result-image");
        const ctx         = sourceImage.getContext("2d");

        if (!resultImage)
        {
            return;
        }

        if (!ctx)
        {
            return;
        }

        try
        {
            const bitmap = await createImageBitmap(file);

            try
            {
                sourceImage.width  = bitmap.width;
                sourceImage.height = bitmap.height;

                ctx.drawImage(bitmap, 0, 0);
                const pixels: ImageData = ctx.getImageData(0, 0, sourceImage.width, sourceImage.height);

                const brailleConverter = new BrailleConverter(pixels);

                const brailleParams: BrailleParams = {
                    columns           : 128,
                    rows              : 128,
                    blackThreshold    : 64,
                    alphaThreshold    : 32,
                    gamma             : 0.6,
                    greyscale         : true,
                    normalizeGreyscale: false
                };

                const brailleCellMap = brailleConverter.Generate(brailleParams);

                const text: string = brailleCellMap
                    .map(row => row
                        .map(cell => String.fromCodePoint(0x2800 + cell.dotMask))
                        .join(""))
                    .join("\n");

                resultImage.textContent = text;

            } finally
            {
                bitmap.close();
            }
        } catch (error)
        {
            console.error("Could not load the image:", error);
        }
    });
}
