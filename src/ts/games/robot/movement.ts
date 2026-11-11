import type { Direction }            from "../controls.ts";
import type { RobotRoom, RobotMove } from "./room.ts";

type RobotMovementOptions = Readonly<{
    stepDurationMS?: number; // Positive duration of one tile step.
    pickupProgress?: number; // Fraction of a step, from 0 to 1.
    onPickup?: () => void;
}>;

// Finish each tile step, then follow the most recently pressed direction that is still held.
export class RobotMovement
{
    private readonly getRoom: () => RobotRoom;
    private readonly onArrival: () => void;
    private readonly onPickup: (() => void) | undefined;
    private readonly stepDurationMS: number;
    private readonly pickupProgress: number;
    private readonly heldDirections: Direction[] = [];

    private activeMove: RobotMove | undefined;
    private elapsed             = 0;
    private elapsedBeforeStepMS = 0;
    private paused              = false;

    constructor(getRoom: () => RobotRoom,
                onArrival: () => void,
                options: RobotMovementOptions = {})
    {
        this.getRoom        = getRoom;
        this.onArrival      = onArrival;
        this.onPickup       = options.onPickup;
        this.stepDurationMS = options.stepDurationMS ?? 240;
        this.pickupProgress = options.pickupProgress ?? 0.5;
    }

    public get step(): Readonly<{ move: RobotMove; progress: number }> | undefined
    {
        return this.activeMove ? { move: this.activeMove, progress: this.elapsed / this.stepDurationMS } : undefined;
    }

    public press(direction: Direction, elapsedSinceFrameMS: number): void
    {
        if (this.paused || this.getRoom().status !== "playing" || this.heldDirections.includes(direction))
        {
            return;
        }

        this.heldDirections.push(direction);
        this.beginStep(elapsedSinceFrameMS);
    }

    public release(direction: Direction, elapsedSinceFrameMS: number): void
    {
        const index = this.heldDirections.indexOf(direction);
        if (index !== -1)
        {
            this.heldDirections.splice(index, 1);
        }
        this.beginStep(elapsedSinceFrameMS);
    }

    public reset(): void
    {
        this.clearInput();
        this.activeMove          = undefined;
        this.elapsed             = 0;
        this.elapsedBeforeStepMS = 0;
    }

    public setPaused(paused: boolean): void
    {
        if (paused)
        {
            this.clearInput();
            this.elapsedBeforeStepMS = 0;
        }
        this.paused = paused;
    }

    // Report whether a step was processed so the controller can redraw the board.
    public update(deltaMS: number): boolean
    {
        if (!this.activeMove || this.paused)
        {
            return false;
        }

        // The first frame can include time before the input that started this step.
        const stepDeltaMS        = Math.max(0, deltaMS - this.elapsedBeforeStepMS);
        this.elapsedBeforeStepMS = 0;
        // Limit progress after a long foreground stall to one tile's worth of time.
        this.elapsed += Math.min(stepDeltaMS, this.stepDurationMS);
        while (this.activeMove)
        {
            // Pick up before committing arrival, even when a frame crosses both moments.
            if (this.elapsed >= this.stepDurationMS * this.pickupProgress
                && this.getRoom().collectAt(this.activeMove.to))
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
            this.getRoom().move(move.direction);
            this.onArrival();
            this.beginStep();
        }

        if (!this.activeMove)
        {
            this.elapsed = 0;
        }
        return true;
    }

    private clearInput(): void
    {
        this.heldDirections.length = 0;
    }

    private beginStep(elapsedBeforeStepMS = 0): void
    {
        if (this.activeMove || this.paused)
        {
            return;
        }
        const direction          = this.heldDirections.at(-1);
        this.activeMove          = direction ? this.getRoom().getMove(direction) : undefined;
        this.elapsedBeforeStepMS = elapsedBeforeStepMS;
    }
}
