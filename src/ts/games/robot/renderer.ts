import type { Position, RobotRoom }          from "./room.ts";
import { boardSize, roomSymbols }            from "./levels.ts";
import type { RobotMovement }                from "./movement.ts";
import { spriteSheetUrl, sprites, tileSize } from "./sprites.ts";

export class RobotRenderer
{
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly sheet: HTMLImageElement;

    private constructor(canvas: HTMLCanvasElement,
                        context: CanvasRenderingContext2D,
                        sheet: HTMLImageElement)
    {
        this.canvas  = canvas;
        this.context = context;
        this.sheet   = sheet;
    }

    public static async load(canvas: HTMLCanvasElement): Promise<RobotRenderer>
    {
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

        return new RobotRenderer(canvas, context, sheet);
    }

    public render(room: RobotRoom, step: RobotMovement["step"]): void
    {
        const offsetColumn = Math.floor((boardSize.columns - room.rows[0]!.length) / 2);
        const offsetRow    = Math.floor((boardSize.rows - room.rows.length) / 2);

        const drawSprite = (name: keyof typeof sprites, column: number, row: number): void =>
        {
            const sprite = sprites[name];
            this.context.drawImage(this.sheet,
                                   sprite.column * tileSize,
                                   sprite.row * tileSize,
                                   tileSize,
                                   tileSize,
                                   Math.round((column + offsetColumn) * tileSize),
                                   Math.round((row + offsetRow) * tileSize),
                                   tileSize,
                                   tileSize);
        };

        const drawMovingSprite = (name: keyof typeof sprites, from: Position, to: Position, progress: number): void =>
        {
            drawSprite(name,
                       from.column + (to.column - from.column) * progress,
                       from.row + (to.row - from.row) * progress);
        };

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const [row, cells] of room.rows.entries())
        {
            for (const [column, cell] of Array.from(cells).entries())
            {
                drawSprite(cell === roomSymbols.wall ? "wall" : "floor", column, row);
            }
        }

        drawSprite(room.allScrapCollected ? "doorOpen" : "doorClosed", room.exit.column, room.exit.row);

        const sentrySprite = room.allScrapCollected ? "sentryActive" : "sentryPassive";
        for (const sentry of room.sentries)
        {
            drawSprite(sentrySprite, sentry.column, sentry.row);
        }
        for (const scrap of room.scraps)
        {
            drawSprite("scrap", scrap.column, scrap.row);
        }
        for (const [index, crate] of room.crates.entries())
        {
            if (step?.move.crate?.index === index)
            {
                drawMovingSprite("crate", step.move.crate.from, step.move.crate.to, step.progress);
            }
            else
            {
                drawSprite("crate", crate.column, crate.row);
            }
        }

        if (step)
        {
            drawMovingSprite("robotIdleFront", step.move.from, step.move.to, step.progress);
        }
        else
        {
            drawSprite("robotIdleFront", room.robot.column, room.robot.row);
        }
    }
}
