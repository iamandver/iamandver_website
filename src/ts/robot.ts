import "./common.ts";
import { initGameControls }                 from "./game_controls.ts";
import { RobotGame }                        from "./robot_game.ts";
import { getOrderedRooms, roomSymbols }     from "./robot_levels.ts";
import type { RoomDefinition }              from "./robot_levels.ts";
import { spriteSheetUrl, sprites, tileSize } from "./robot_sprites.ts";

const progressStorageKey = "robot-progress-v1";

window.addEventListener("DOMContentLoaded", () =>
{
    void init();
});

async function init(): Promise<void>
{
    const canvas = document.querySelector<HTMLCanvasElement>("#robot-board")!;

    try
    {
        const rooms   = getOrderedRooms();
        let roomIndex = loadRoomIndex(rooms);
        const context = canvas.getContext("2d");
        if (!context)
        {
            throw new Error("Canvas 2D is unavailable.");
        }

        const sheet = new Image();
        sheet.src   = spriteSheetUrl;
        await sheet.decode();

        const instructions = document.getElementById("robot-instructions")!;

        const loadRoom = (): RobotGame =>
        {
            const room    = rooms[roomIndex]!;
            const game    = new RobotGame(room.map);
            canvas.width  = game.rows[0]!.length * tileSize;
            canvas.height = game.rows.length * tileSize;
            canvas.style.setProperty("--room-width", String(canvas.width));
            canvas.style.setProperty("--room-height", String(canvas.height));
            context.imageSmoothingEnabled = false;
            document.getElementById("robot-room-title")!.textContent = `Level ${room.level} · Room ${room.room} · ${room.name}`;
            saveRoomCheckpoint(room);
            return game;
        };

        let game = loadRoom();

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
                    drawSprite(cell === roomSymbols.wall ? "wall" : "floor", column, row);
                }
            }

            drawSprite("door", game.exit.column, game.exit.row);

            for (const sentry of game.sentries)
            {
                drawSprite("sentry", sentry.column, sentry.row);
            }
            for (const scrap of game.scraps)
            {
                drawSprite("scrap", scrap.column, scrap.row);
            }
            for (const crate of game.crates)
            {
                drawSprite("crate", crate.column, crate.row);
            }

            drawSprite("robot", game.robot.column, game.robot.row);

            instructions.dataset.state = game.status;
            if (game.status === "caught")
            {
                instructions.textContent = "Caught by security.";
            }
            else if (game.status === "complete")
            {
                instructions.textContent = "All rooms complete!\nRestart to replay this room.";
            }
            else
            {
                instructions.textContent = game.active
                                           ? "Exit open · Swipe / arrows\nSecurity active."
                                           : `${game.scraps.length} scrap left · Swipe / arrows\nLast scrap wakes the sentry.`;
            }
        };

        render();

        const resetControls = initGameControls(direction =>
                                               {
                                                   if (game.move(direction))
                                                   {
                                                       if (game.status === "complete" && roomIndex + 1 < rooms.length)
                                                       {
                                                           resetControls();
                                                           roomIndex++;
                                                           game = loadRoom();
                                                       }
                                                       render();
                                                   }
                                               }, () => game.status === "playing");

        const restartButton    = document.querySelector<HTMLButtonElement>("#robot-restart")!;
        restartButton.disabled = false;
        restartButton.addEventListener("click", () =>
        {
            resetControls();
            game = loadRoom();
            render();
        });
    } catch (error)
    {
        document.getElementById("robot-instructions")!.textContent = "The room could not be loaded.";
        console.error(error);
    }
}

function loadRoomIndex(rooms: readonly RoomDefinition[]): number
{
    try
    {
        const saved = localStorage.getItem(progressStorageKey);
        if (saved !== null)
        {
            const checkpoint = JSON.parse(saved) as Pick<RoomDefinition, "level" | "room">;
            const index = rooms.findIndex(room => room.level === checkpoint.level && room.room === checkpoint.room);
            if (index !== -1)
            {
                return index;
            }
        }
    } catch
    {
        // Start at the first room if storage is unavailable or invalid.
    }

    return 0;
}

function saveRoomCheckpoint(room: RoomDefinition): void
{
    try
    {
        localStorage.setItem(progressStorageKey, JSON.stringify({ level: room.level, room: room.room }));
    } catch
    {
        // Progression still works for this visit when storage is unavailable.
    }
}
