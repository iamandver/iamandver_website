export type AnimationClip<Frame> = Readonly<{
    frames: readonly [Frame, ...Frame[]];
    frameDurationMS: number;
    mode: "loop" | "once";
}>;

export class AnimationPlayer<Frame>
{
    private elapsedMS = 0;

    public update(deltaMS: number): void
    {
        this.elapsedMS += deltaMS;
    }

    public reset(): void
    {
        this.elapsedMS = 0;
    }

    public frame(clip: AnimationClip<Frame>): Frame
    {
        const elapsedFrames = Math.floor(this.elapsedMS / clip.frameDurationMS);
        const frameIndex    = clip.mode === "loop"
                              ? elapsedFrames % clip.frames.length
                              : Math.min(elapsedFrames, clip.frames.length - 1);

        return clip.frames[frameIndex]!;
    }
}
