import type { Direction }                                                             from "../controls.ts";
import { AnimationPlayer }                                                            from "./animation_player.ts";
import { boardSize, roomSymbols }                                                     from "./levels.ts";
import type { RobotMovement }                                                         from "./movement.ts";
import type { Position, RobotRoom }                                                   from "./room.ts";
import { robotSprites, spriteSheetUrl, sprites, tileSize, wallSpriteAt, type Sprite } from "./sprites.ts";

export class RobotRenderer
{
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly sheet: HTMLImageElement;
    private readonly walkAnimation = new AnimationPlayer<Sprite>();

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

    public updateAnimation(deltaMS: number, walking: boolean): void
    {
        if (walking)
        {
            this.walkAnimation.update(deltaMS);
        }
        else
        {
            this.walkAnimation.reset();
        }
    }

    public render(room: RobotRoom, step: RobotMovement["step"], facing: Direction): void
    {
        const offsetColumn = Math.floor((boardSize.columns - room.rows[0]!.length) / 2);
        const offsetRow    = Math.floor((boardSize.rows - room.rows.length) / 2);

        const drawSprite = (sprite: Sprite, column: number, row: number, flipX = false): void =>
        {
            const x = Math.round((column + offsetColumn) * tileSize);
            const y = Math.round((row + offsetRow) * tileSize);
            if (flipX)
            {
                this.context.save();
                this.context.translate(x + tileSize, 0);
                this.context.scale(-1, 1);
            }

            this.context.drawImage(this.sheet,
                                   sprite.column * tileSize,
                                   sprite.row * tileSize,
                                   tileSize,
                                   tileSize,
                                   flipX ? 0 : x,
                                   y,
                                   tileSize,
                                   tileSize);

            if (flipX)
            {
                this.context.restore();
            }
        };

        const drawMovingSprite = (sprite: Sprite, from: Position, to: Position, progress: number, flipX = false): void =>
        {
            drawSprite(sprite,
                       from.column + (to.column - from.column) * progress,
                       from.row + (to.row - from.row) * progress,
                       flipX);
        };

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const [row, cells] of room.rows.entries())
        {
            for (const [column, cell] of Array.from(cells).entries())
            {
                const sprite = cell === roomSymbols.wall ? wallSpriteAt(room.rows, column, row) : sprites.floor;
                drawSprite(sprite, column, row);
            }
        }

        drawSprite(room.allScrapCollected ? sprites.doorOpen : sprites.doorClosed, room.exit.column, room.exit.row);

        const sentrySprite = room.allScrapCollected ? sprites.sentryActive : sprites.sentryPassive;
        for (const sentry of room.sentries)
        {
            drawSprite(sentrySprite, sentry.column, sentry.row);
        }
        for (const scrap of room.scraps)
        {
            drawSprite(sprites.scrap, scrap.column, scrap.row);
        }
        for (const [index, crate] of room.crates.entries())
        {
            if (step?.move.crate?.index === index)
            {
                drawMovingSprite(sprites.crate, step.move.crate.from, step.move.crate.to, step.progress);
            }
            else
            {
                drawSprite(sprites.crate, crate.column, crate.row);
            }
        }

        const robot = robotSprites[step?.move.direction ?? facing];
        if (step)
        {
            drawMovingSprite(this.walkAnimation.frame(robot.walk), step.move.from, step.move.to, step.progress, robot.flipX);
        }
        else
        {
            drawSprite(robot.idle, room.robot.column, room.robot.row, robot.flipX);
        }
    }
}
