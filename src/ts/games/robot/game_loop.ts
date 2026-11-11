export class GameLoop
{
    private readonly onFrame: (deltaMS: number) => void;
    private frameId: number | undefined;
    private lastFrame = 0;

    constructor(onFrame: (deltaMS: number) => void)
    {
        this.onFrame = onFrame;
    }

    public get elapsedSinceFrameMS(): number
    {
        return performance.now() - this.lastFrame;
    }

    public start(): void
    {
        if (this.frameId !== undefined)
        {
            return;
        }

        this.lastFrame = performance.now();
        this.frameId   = requestAnimationFrame(this.tick);
    }

    public stop(): void
    {
        if (this.frameId !== undefined)
        {
            cancelAnimationFrame(this.frameId);
            this.frameId = undefined;
        }
    }

    private readonly tick = (timestamp: number): void =>
    {
        const deltaMS  = Math.max(0, timestamp - this.lastFrame);
        this.lastFrame = timestamp;
        this.frameId   = requestAnimationFrame(this.tick);
        this.onFrame(deltaMS);
    };
}
