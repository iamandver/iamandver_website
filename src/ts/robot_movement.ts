import type { Direction }            from "./game_controls.ts";
import type { RobotGame, RobotMove } from "./robot_game.ts";

type RobotMovementOptions = Readonly<{
    stepDurationMS?: number; // Positive duration of one tile step.
    pickupProgress?: number; // Fraction of a step, from 0 to 1.
    onPickup?: () => void;
}>;

// Only one tile step is active. Input may replace the next step, never the current one.
export class RobotMovement
{
    private readonly getGame: () => RobotGame;
    private readonly draw: () => void;
    private readonly onArrival: () => void;
    private readonly onPickup: (() => void) | undefined;
    private readonly stepDurationMS: number;
    private readonly pickupProgress: number;
    private readonly heldDirections: Direction[] = [];

    private pendingDirection: Direction | undefined;
    private activeMove: RobotMove | undefined;
    private elapsed = 0;
    private lastFrame: number | undefined;
    private frameId: number | undefined;
    private paused  = false;

    constructor(getGame: () => RobotGame, draw: () => void, onArrival: () => void,
                options: RobotMovementOptions = {})
    {
        this.getGame        = getGame;
        this.draw           = draw;
        this.onArrival      = onArrival;
        this.onPickup       = options.onPickup;
        this.stepDurationMS = options.stepDurationMS ?? 240;
        this.pickupProgress = options.pickupProgress ?? 0.5;
    }

    public get step(): Readonly<{ move: RobotMove; progress: number }> | undefined
    {
        return this.activeMove ? { move: this.activeMove, progress: this.elapsed / this.stepDurationMS } : undefined;
    }

    public press(direction: Direction): void
    {
        if (this.paused || this.getGame().status !== "playing" || this.heldDirections.includes(direction))
        {
            return;
        }

        this.heldDirections.push(direction);
        this.pendingDirection = direction;
        this.beginStep();
        this.requestFrame();
    }

    public release(direction: Direction): void
    {
        const index = this.heldDirections.indexOf(direction);
        if (index !== -1)
        {
            this.heldDirections.splice(index, 1);
        }
        this.beginStep();
        this.requestFrame();
    }

    public reset(): void
    {
        this.clearInput();
        this.stopFrames();
        this.activeMove = undefined;
        this.elapsed    = 0;
    }

    public setPaused(paused: boolean): void
    {
        if (paused)
        {
            this.clearInput();
            this.stopFrames();
        }
        this.paused = paused;
        if (!paused)
        {
            this.requestFrame();
        }
    }

    private clearInput(): void
    {
        this.heldDirections.length = 0;
        this.pendingDirection      = undefined;
    }

    private stopFrames(): void
    {
        if (this.frameId !== undefined)
        {
            cancelAnimationFrame(this.frameId);
        }
        this.frameId   = undefined;
        this.lastFrame = undefined;
    }

    private beginStep(): void
    {
        if (this.activeMove || this.paused)
        {
            return;
        }
        const direction       = this.pendingDirection ?? this.heldDirections.at(-1);
        this.pendingDirection = undefined;
        this.activeMove       = direction ? this.getGame().getMove(direction) : undefined;
    }

    private requestFrame(): void
    {
        if (!this.activeMove || this.paused || this.frameId !== undefined)
        {
            return;
        }
        this.lastFrame ??= performance.now();
        this.frameId = requestAnimationFrame(this.animate);
    }

    private readonly animate = (timestamp: number): void =>
    {
        this.frameId   = undefined;
        // Bound a long foreground stall; hidden tabs pause explicitly instead of catching up.
        this.elapsed += Math.max(0, Math.min(timestamp - this.lastFrame!, this.stepDurationMS));
        this.lastFrame = timestamp;

        while (this.activeMove)
        {
            // Pick up before committing arrival, even when a frame crosses both moments.
            if (this.elapsed >= this.stepDurationMS * this.pickupProgress
                && this.getGame().collectAt(this.activeMove.to))
            {
                this.onPickup?.();
            }

            if (this.elapsed < this.stepDurationMS)
            {
                break;
            }

            const move      = this.activeMove;
            this.elapsed -= this.stepDurationMS;
            this.activeMove = undefined;
            this.getGame().move(move.direction);
            this.onArrival();
            this.beginStep();
        }

        this.draw();

        if (this.activeMove)
        {
            this.requestFrame();
        }
        else
        {
            this.elapsed   = 0;
            this.lastFrame = undefined;
        }
    };
}
