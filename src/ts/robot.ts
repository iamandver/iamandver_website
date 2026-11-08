import "./common.ts";
import { firstRoom }                         from "./robot_levels.ts";
import { spriteSheetUrl, sprites, tileSize } from "./robot_sprites.ts";

window.addEventListener("DOMContentLoaded", () =>
{
    void init();
});

async function init(): Promise<void>
{
    const canvas = document.querySelector<HTMLCanvasElement>("#robot-board")!;

    try
    {
        const rows    = parseRoom(firstRoom.map);
        canvas.width  = rows[0]!.length * tileSize;
        canvas.height = rows.length * tileSize;

        canvas.style.setProperty("--room-width", String(canvas.width));
        canvas.style.setProperty("--room-height", String(canvas.height));
        document.getElementById("robot-room-title")!.textContent = firstRoom.name;

        const context = canvas.getContext("2d");
        if (!context)
        {
            throw new Error("Canvas 2D is unavailable.");
        }

        const sheet = new Image();
        sheet.src   = spriteSheetUrl;
        await sheet.decode();

        context.imageSmoothingEnabled = false;

        const drawSprite = (name: keyof typeof sprites, column: number, row: number): void =>
        {
            const sprite = sprites[name];
            context.drawImage(sheet,
                              sprite.column * tileSize, sprite.row * tileSize, tileSize, tileSize,
                              column * tileSize, row * tileSize, tileSize, tileSize);
        };

        for (const [row, cells] of rows.entries())
        {
            for (const [column, cell] of Array.from(cells).entries())
            {
                drawSprite(cell === "#" ? "wall" : "floor", column, row);
                if (cell === "@")
                {
                    drawSprite("robot", column, row);
                }
            }
        }
    } catch (error)
    {
        document.getElementById("robot-instructions")!.textContent = "The room could not be loaded.";
        console.error(error);
    }
}

function parseRoom(map: string): string[]
{
    const rows  = map.trim().split("\n").map(row => row.trim());
    const width = rows[0]!.length;
    if (width === 0 || rows.some(row => row.length !== width))
    {
        throw new Error("Room rows must be non-empty and have equal lengths.");
    }

    let robotCount = 0;
    for (const row of rows)
    {
        for (const cell of row)
        {
            if (!"#.@".includes(cell))
            {
                throw new Error(`Unknown room symbol: ${cell}`);
            }
            if (cell === "@")
            {
                robotCount++;
            }
        }
    }

    if (robotCount !== 1)
    {
        throw new Error("A room must contain exactly one robot start (@).");
    }

    return rows;
}
