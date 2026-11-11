import { isTerminalOpen }                   from "../../site/terminal.ts";
import { initGameControls, type Direction } from "../controls.ts";
import type { RobotRoom }                   from "./room.ts";
import type { RoomDefinition }              from "./levels.ts";

export class RobotPageView
{
    public readonly canvas = document.querySelector<HTMLCanvasElement>("#robot-board")!;

    private readonly instructions = document.getElementById("robot-instructions")!;
    private readonly container    = document.querySelector<HTMLElement>(".robot-container")!;
    private readonly gameElement  = document.querySelector<HTMLElement>(".robot-game")!;
    private readonly frame        = document.querySelector<HTMLElement>(".robot-board-frame")!;
    private readonly navigation   = document.querySelector<HTMLElement>(".page-navigation")!;
    private readonly touchScreen  = window.matchMedia("(pointer: coarse)");

    public showRoom(room: RoomDefinition, practice: boolean): void
    {
        document.getElementById("robot-practice")!.hidden       = !practice;
        document.getElementById("robot-level")!.textContent     = `Level ${room.level}`;
        document.getElementById("robot-room")!.textContent      = `Room ${room.room}`;
        document.getElementById("robot-room-name")!.textContent = room.name;
    }

    public showStatus(room: Pick<RobotRoom, "status" | "allScrapCollected" | "scraps">): void
    {
        this.instructions.dataset.state = room.status;
        if (room.status === "caught")
        {
            this.instructions.textContent = "Caught by security.";
        }
        else if (room.status === "complete")
        {
            this.instructions.textContent = "All rooms complete!";
        }
        else
        {
            this.instructions.textContent = room.allScrapCollected
                                            ? "Exit open · Swipe / arrows"
                                            : `${room.scraps.length} scrap left · Swipe / arrows`;
        }
        this.resizeBoard();
    }

    public showError(message: string): void
    {
        this.instructions.textContent = message;
    }

    public enableReset(onReset: () => void): void
    {
        const button = document.querySelector<HTMLButtonElement>("#robot-reset")!;
        button.addEventListener("click", onReset);
        button.disabled = false;
    }

    public enableRestart(onRestart: () => void): void
    {
        const button = document.querySelector<HTMLButtonElement>("#robot-restart")!;
        button.addEventListener("click", onRestart);
        button.disabled = false;
    }

    public bindControls(onPress: (direction: Direction) => void,
                        canMove: () => boolean,
                        onRelease: (direction: Direction) => void): () => void
    {
        return initGameControls(onPress, canMove, onRelease);
    }

    public observePause(onPauseChange: (paused: boolean) => void): void
    {
        const syncPause = () => onPauseChange(document.hidden || !document.hasFocus() || isTerminalOpen());
        window.addEventListener("blur", () => onPauseChange(true));
        window.addEventListener("focus", syncPause);
        document.addEventListener("visibilitychange", syncPause);

        const terminalObserver = new MutationObserver(syncPause);
        terminalObserver.observe(document.getElementById("terminal")!, { attributes: true, attributeFilter: ["hidden"] });
        syncPause();
    }

    public observeSize(): void
    {
        const observer = new ResizeObserver(this.resizeBoard);
        observer.observe(this.container);
        this.touchScreen.addEventListener("change", this.resizeBoard);
        void document.fonts.ready.then(this.resizeBoard);
    }

    private readonly resizeBoard = (): void =>
    {
        const available        = this.container.getBoundingClientRect();
        const containerStyle   = getComputedStyle(this.container);
        const availableWidth   = available.width - parseFloat(containerStyle.paddingLeft) - parseFloat(containerStyle.paddingRight);
        const availableHeight  = available.height - parseFloat(containerStyle.paddingTop) - parseFloat(containerStyle.paddingBottom);
        const frameStyle       = getComputedStyle(this.frame);
        const maxScale         = parseFloat(frameStyle.getPropertyValue("--art-pixel"));
        const frameInsetsWidth = parseFloat(frameStyle.borderLeftWidth) + parseFloat(frameStyle.borderRightWidth)
                                 + parseFloat(frameStyle.paddingLeft) + parseFloat(frameStyle.paddingRight);
        const widthFit         = Math.max(0, Math.min((availableWidth - frameInsetsWidth) / this.canvas.width, maxScale));

        // A short viewport must not collapse the board and its unscaled controls.
        const minimumScale = this.touchScreen.matches ? Math.min(1, widthFit) : 1;
        let scale          = this.touchScreen.matches ? widthFit : Math.max(1, Math.floor(widthFit));
        while (true)
        {
            this.canvas.style.inlineSize      = `${this.canvas.width * scale}px`;
            this.gameElement.style.inlineSize = `${this.canvas.width * scale + frameInsetsWidth}px`;

            // Measure at the chosen width so wrapped text and the whole frame count toward height.
            const overflow = this.gameElement.getBoundingClientRect().height - availableHeight;

            if (overflow <= 0 || scale <= minimumScale)
            {
                break;
            }

            const heightFit = Math.max(minimumScale, scale - overflow / this.canvas.height);
            scale           = this.touchScreen.matches ? heightFit : Math.max(1, Math.floor(heightFit));
        }

        this.navigation.style.setProperty("--game-width", this.gameElement.style.inlineSize);
    };
}
