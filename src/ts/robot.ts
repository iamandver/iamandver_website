import "./common.ts";
import { initGameControls }                                             from "./game_controls.ts";
import { RobotGame }                                                    from "./robot_game.ts";
import { boardSize, getOrderedRooms, type RoomDefinition, roomSymbols } from "./robot_levels.ts";
import { clearRoomCheckpoint, loadRoomIndex, saveRoomCheckpoint }       from "./robot_progress.ts";
import { spriteSheetUrl, sprites, tileSize }                            from "./robot_sprites.ts";

window.addEventListener("DOMContentLoaded", () =>
{
    void init();
});

async function init(): Promise<void>
{
    const canvas      = document.querySelector<HTMLCanvasElement>("#robot-board")!;
    const resetButton = document.querySelector<HTMLButtonElement>("#robot-reset")!;
    resetButton.addEventListener("click", () =>
    {
        clearRoomCheckpoint();
        window.location.assign(`${import.meta.env.BASE_URL}robot.html`);
    });
    resetButton.disabled = false;

    try
    {
        const rooms: readonly RoomDefinition[] = getOrderedRooms();
        const url: URL                         = new URL(window.location.href);
        const practiceRoom: string | null      = url.searchParams.get("room");
        const practice: boolean                = practiceRoom !== null;
        let roomIndex: number                  = practice
                                                 ? rooms.findIndex(room => `${room.level}-${room.room}` === practiceRoom)
                                                 : loadRoomIndex(rooms);
        if (roomIndex === -1)
        {
            throw new Error(`Practice room ${practiceRoom} not found.\nUse robot resume in the terminal to return to saved progress.`);
        }

        const context = canvas.getContext("2d");
        if (!context)
        {
            throw new Error("Canvas 2D is unavailable.");
        }

        canvas.width                  = boardSize.columns * tileSize;
        canvas.height                 = boardSize.rows * tileSize;
        context.imageSmoothingEnabled = false;

        const sheet = new Image();
        sheet.src   = spriteSheetUrl;
        await sheet.decode();

        const instructions = document.getElementById("robot-instructions")!;

        const loadRoom = (): RobotGame =>
        {
            const room = rooms[roomIndex]!;
            const game = new RobotGame(room.map);

            document.getElementById("robot-practice")!.hidden       = !practice;
            document.getElementById("robot-level")!.textContent     = `Level ${room.level}`;
            document.getElementById("robot-room")!.textContent      = `Room ${room.room}`;
            document.getElementById("robot-room-name")!.textContent = room.name;

            if (practice)
            {
                url.searchParams.set("room", `${room.level}-${room.room}`);
                window.history.replaceState(null, "", url);
            }
            else
            {
                saveRoomCheckpoint(room);
            }
            return game;
        };

        let game = loadRoom();

        const drawSprite = (name: keyof typeof sprites,
                            column: number,
                            row: number): void =>
        {
            const sprite       = sprites[name];
            const offsetColumn = Math.floor((boardSize.columns - game.rows[0]!.length) / 2);
            const offsetRow    = Math.floor((boardSize.rows - game.rows.length) / 2);
            context.drawImage(sheet,
                              sprite.column * tileSize,
                              sprite.row * tileSize,
                              tileSize,
                              tileSize,
                              (column + offsetColumn) * tileSize,
                              (row + offsetRow) * tileSize,
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
                                           ? "Exit open · Swipe / arrows"
                                           : `${game.scraps.length} scrap left · Swipe / arrows`;
            }
            resizeBoard();
        };

        const container   = document.querySelector<HTMLElement>(".robot-container")!;
        const gameElement = document.querySelector<HTMLElement>(".robot-game")!;
        const frame       = document.querySelector<HTMLElement>(".robot-board-frame")!;
        const touchScreen = window.matchMedia("(pointer: coarse)");

        const resizeBoard = () =>
        {
            const available        = container.getBoundingClientRect();
            const containerStyle   = getComputedStyle(container);
            const availableWidth   = available.width - parseFloat(containerStyle.paddingLeft) - parseFloat(containerStyle.paddingRight);
            const availableHeight  = available.height - parseFloat(containerStyle.paddingTop) - parseFloat(containerStyle.paddingBottom);
            const frameStyle       = getComputedStyle(frame);
            const maxScale         = parseFloat(frameStyle.getPropertyValue("--art-pixel"));
            const frameInsetsWidth = parseFloat(frameStyle.borderLeftWidth) + parseFloat(frameStyle.borderRightWidth)
                                     + parseFloat(frameStyle.paddingLeft) + parseFloat(frameStyle.paddingRight);
            const widthFit         = Math.max(0, Math.min((availableWidth - frameInsetsWidth) / canvas.width, maxScale));

            // A short viewport must not collapse the board and its unscaled controls.
            const minimumScale = touchScreen.matches ? Math.min(1, widthFit) : 1;
            let scale = touchScreen.matches ? widthFit : Math.max(1, Math.floor(widthFit));
            while (true)
            {
                canvas.style.inlineSize      = `${canvas.width * scale}px`;
                gameElement.style.inlineSize = `${canvas.width * scale + frameInsetsWidth}px`;

                // Measure at the chosen width so wrapped text and the whole frame count toward height.
                const overflow = gameElement.getBoundingClientRect().height - availableHeight;
                if (overflow <= 0 || scale <= minimumScale)
                {
                    break;
                }
                const heightFit = Math.max(minimumScale, scale - overflow / canvas.height);
                scale           = touchScreen.matches ? heightFit : Math.max(1, Math.floor(heightFit));
            }
        };

        const boardResizeObserver = new ResizeObserver(resizeBoard);
        boardResizeObserver.observe(container);
        touchScreen.addEventListener("change", resizeBoard);
        void document.fonts.ready.then(resizeBoard);

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
        document.getElementById("robot-instructions")!.textContent = error instanceof Error ? error.message : "The room could not be loaded.";
        console.error(error);
    }
}
