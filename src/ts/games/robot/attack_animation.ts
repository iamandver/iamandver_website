import { attackSprites } from "./sprites.ts";

const chargeDurationMS = 80;
const fireDurationMS   = 2 * attackSprites.robotHit.frames.length * attackSprites.robotHit.frameDurationMS;
const deathStartsMS    = chargeDurationMS + fireDurationMS;
const durationMS       = deathStartsMS + attackSprites.robotDeath.frames.length * attackSprites.robotDeath.frameDurationMS;

export type AttackPose = Readonly<{
    phase: "charge" | "fire" | "death";
    elapsedMS: number;
}>;

export class AttackAnimation
{
    private elapsedMS: number | undefined;

    public reset(): void
    {
        this.elapsedMS = undefined;
    }

    public update(deltaMS: number, caught: boolean): boolean
    {
        if (!caught || this.elapsedMS === durationMS)
        {
            return false;
        }

        // Start at the catch. The movement frame's elapsed time predates it.
        this.elapsedMS = this.elapsedMS === undefined ? 0 : Math.min(this.elapsedMS + deltaMS, durationMS);
        return true;
    }

    public get pose(): AttackPose | undefined
    {
        if (this.elapsedMS === undefined)
        {
            return undefined;
        }
        if (this.elapsedMS < chargeDurationMS)
        {
            return { phase: "charge", elapsedMS: this.elapsedMS };
        }
        if (this.elapsedMS < deathStartsMS)
        {
            return { phase: "fire", elapsedMS: this.elapsedMS - chargeDurationMS };
        }
        return { phase: "death", elapsedMS: this.elapsedMS - deathStartsMS };
    }
}
