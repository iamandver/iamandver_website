import type { Direction }           from "../controls.ts";
import { AnimationPlayer, frameAt } from "./animation_player.ts";
import type { AttackPose }          from "./attack_animation.ts";
import { boardSize, roomSymbols }   from "./levels.ts";
import type { RobotMovement }       from "./movement.ts";
import type { Position, RobotRoom }  from "./room.ts";
import {
    attackSprites,
    objectSprites,
    robotSprites,
    spriteSheetUrl,
    terrainSprites,
    tileSize,
    wallSpriteAt,
    type Sprite
} from "./sprites.ts";

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

    public render(room: RobotRoom, step: RobotMovement["step"], facing: Direction, attack: AttackPose | undefined): void
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
                const sprite = cell === roomSymbols.wall ? wallSpriteAt(room.rows, column, row) : terrainSprites.floor;
                drawSprite(sprite, column, row);
            }
        }

        drawSprite(room.allScrapCollected ? objectSprites.doorOpen : objectSprites.doorClosed, room.exit.column, room.exit.row);

        const sentrySprite = room.allScrapCollected ? objectSprites.sentryActive : objectSprites.sentryPassive;
        for (const sentry of room.sentries)
        {
            drawSprite(sentrySprite, sentry.column, sentry.row);
        }
        for (const scrap of room.scraps)
        {
            drawSprite(objectSprites.scrap, scrap.column, scrap.row);
        }
        for (const [index, crate] of room.crates.entries())
        {
            if (step?.move.crate?.index === index)
            {
                drawMovingSprite(objectSprites.crate, step.move.crate.from, step.move.crate.to, step.progress);
            }
            else
            {
                drawSprite(objectSprites.crate, crate.column, crate.row);
            }
        }

        const target = room.robot;
        if (attack?.phase === "charge")
        {
            for (const sentry of room.sentries)
            {
                if (sentry.triggered)
                {
                    drawSprite(attackSprites.sentryPowerUp, sentry.column, sentry.row);
                }
            }
        }
        else if (attack?.phase === "fire")
        {
            const horizontalBeam = frameAt(attackSprites.beamHorizontal, attack.elapsedMS);
            const verticalBeam   = frameAt(attackSprites.beamVertical, attack.elapsedMS);
            const targetX        = (target.column + offsetColumn + 0.5) * tileSize;
            const targetY        = (target.row + offsetRow + 0.5) * tileSize;
            for (const sentry of room.sentries)
            {
                if (!sentry.triggered)
                {
                    continue;
                }

                const stepColumn    = Math.sign(target.column - sentry.column);
                const stepRow       = Math.sign(target.row - sentry.row);
                const horizontal    = stepColumn !== 0;
                const direction     = horizontal ? (stepColumn > 0 ? "right" : "left") : (stepRow > 0 ? "down" : "up");
                const { clip, flipX } = attackSprites.sentryShoot[direction];
                drawSprite(frameAt(clip, attack.elapsedMS), sentry.column, sentry.row, flipX);

                const beam     = horizontal ? horizontalBeam : verticalBeam;
                const sentryX  = (sentry.column + offsetColumn + 0.5) * tileSize;
                const sentryY  = (sentry.row + offsetRow + 0.5) * tileSize;
                const distance = Math.abs(target.column - sentry.column) + Math.abs(target.row - sentry.row);

                // The firing pose covers the first tile. Clip the beam halfway into the target tile.
                this.context.save();
                this.context.beginPath();
                this.context.rect(horizontal ? Math.min(sentryX, targetX) : targetX - tileSize / 2,
                                  horizontal ? targetY - tileSize / 2 : Math.min(sentryY, targetY),
                                  horizontal ? distance * tileSize : tileSize,
                                  horizontal ? tileSize : distance * tileSize);
                this.context.clip();
                for (let tile = 1; tile <= distance; tile++)
                {
                    drawSprite(beam, sentry.column + tile * stepColumn, sentry.row + tile * stepRow);
                }
                this.context.restore();
            }
            drawSprite(frameAt(attackSprites.robotHit, attack.elapsedMS), target.column, target.row);
            return;
        }
        else if (attack?.phase === "death")
        {
            drawSprite(frameAt(attackSprites.robotDeath, attack.elapsedMS), target.column, target.row);
            return;
        }

        const robot = robotSprites[step?.move.direction ?? facing];
        if (step)
        {
            drawMovingSprite(this.walkAnimation.frame(robot.walk), step.move.from, step.move.to, step.progress, robot.flipX);
        }
        else
        {
            drawSprite(robot.idle, target.column, target.row, robot.flipX);
        }
    }
}
