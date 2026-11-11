import { isTerminalOpen } from "../site/terminal.ts";

export type Direction = "up" | "down" | "left" | "right";

// Optional release handling supports held keys; a swipe remains one press/release.
// Returns a function to discard a pending gesture when restarting a game.
export function initGameControls(onMove: (direction: Direction) => void,
                                 canMove: () => boolean = () => true,
                                 onRelease?: (direction: Direction) => void): () => void
{
    const gestureSurface = document.body;
    const directions: Partial<Record<string, Direction>> = {
        ArrowUp   : "up",
        ArrowDown : "down",
        ArrowLeft : "left",
        ArrowRight: "right"
    };

    document.addEventListener("keydown", event =>
    {
        const direction = directions[event.key];
        const target    = event.target;
        if (!direction
            || event.defaultPrevented
            || isTerminalOpen()
            || event.altKey
            || event.ctrlKey
            || event.metaKey
            || (target instanceof Element && target.closest("input, select, textarea, [contenteditable]")))
        {
            return;
        }

        event.preventDefault();
        if (!event.repeat && canMove())
        {
            onMove(direction);
        }
    });

    document.addEventListener("keyup", event =>
    {
        const direction = directions[event.key];
        if (direction)
        {
            onRelease?.(direction);
        }
    });

    let swipeStart: { pointerId: number; x: number; y: number } | undefined;

    gestureSurface.addEventListener("pointerdown", event =>
    {
        if (!event.isPrimary)
        {
            swipeStart = undefined;
            return;
        }

        const target = event.target;
        if (event.button !== 0 || isTerminalOpen() || !canMove() ||
            (target instanceof Element && target.closest("a, button, input, select, textarea, [contenteditable], .controls")))
        {
            return;
        }

        swipeStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        gestureSurface.setPointerCapture(event.pointerId);
    });

    gestureSurface.addEventListener("pointerup", event =>
    {
        if (swipeStart?.pointerId !== event.pointerId)
        {
            return;
        }

        const deltaX = event.clientX - swipeStart.x;
        const deltaY = event.clientY - swipeStart.y;
        swipeStart   = undefined;

        // Preserve 2048's threshold and dominant-axis movement.
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24 || isTerminalOpen() || !canMove())
        {
            return;
        }

        const direction: Direction = Math.abs(deltaX) > Math.abs(deltaY)
                                     ? (deltaX > 0 ? "right" : "left")
                                     : (deltaY > 0 ? "down" : "up");
        onMove(direction);
        onRelease?.(direction);
    });

    const cancelSwipe = (event: PointerEvent) =>
    {
        if (swipeStart?.pointerId === event.pointerId)
        {
            swipeStart = undefined;
        }
    };
    gestureSurface.addEventListener("pointercancel", cancelSwipe);
    gestureSurface.addEventListener("lostpointercapture", cancelSwipe);

    return () => { swipeStart = undefined; };
}
