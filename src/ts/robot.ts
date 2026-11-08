import "./common.ts";
import { initGameControls }                  from "./game_controls.ts";
import { RobotGame }                         from "./robot_game.ts";
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
        let game      = new RobotGame(firstRoom.map);
        canvas.width  = game.rows[0]!.length * tileSize;
        canvas.height = game.rows.length * tileSize;

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

        const drawSprite = (name: keyof typeof sprites,
                            column: number,
                            row: number): void =>
        {
            const sprite = sprites[name];
            context.drawImage(sheet,
                              sprite.column * tileSize,
                              sprite.row * tileSize,
                              tileSize,
                              tileSize,
                              column * tileSize,
                              row * tileSize,
                              tileSize,
                              tileSize);
        };

        const render = () =>
        {
            context.clearRect(0, 0, canvas.width, canvas.height);

            for (const [row, cells] of game.rows.entries())
            {
                for (const [column, cell] of Array.from(cells).entries())
                {
                    drawSprite(cell === "#" ? "wall" : "floor", column, row);
                }
            }

            for (const crate of game.crates)
            {
                drawSprite("crate", crate.column, crate.row);
            }

            drawSprite("robot", game.robot.column, game.robot.row);
        };

        render();

        const resetControls = initGameControls(direction =>
        {
            if (game.move(direction))
            {
                render();
            }
        });

        const restartButton = document.querySelector<HTMLButtonElement>("#robot-restart")!;
        restartButton.disabled = false;
        restartButton.addEventListener("click", () =>
        {
            resetControls();
            game = new RobotGame(firstRoom.map);
            render();
        });
    } catch (error)
    {
        document.getElementById("robot-instructions")!.textContent = "The room could not be loaded.";
        console.error(error);
    }
}
