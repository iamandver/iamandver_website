import "../css/common.css";
import "../css/braille.css";

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

        const canvas = document.getElementById("source-image") as HTMLCanvasElement;
        const ctx    = canvas.getContext("2d");

        if (!ctx)
        {
            return;
        }

        try
        {
            const bitmap = await createImageBitmap(file);

            try
            {
                canvas.width  = bitmap.width;
                canvas.height = bitmap.height;

                ctx.drawImage(bitmap, 0, 0);
                const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

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




