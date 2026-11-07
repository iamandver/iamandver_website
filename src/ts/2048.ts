import "./common.ts";
import { isTerminalOpen } from "./terminal.ts";

type Direction = "up" | "down" | "left" | "right";
type GameResult = "won" | "lost";
type ScoreRecords = { last: number | null; best: number };

const scoreStorageKey = "andver.2048.scores.v1";

window.addEventListener("DOMContentLoaded", init);

function init(): void
{
    let game    = new Game2048();
    let records = loadScoreRecords();

    const scoreElement     = document.getElementById("game-score")!;
    const lastScoreElement = document.getElementById("last-score")!;
    const bestScoreElement = document.getElementById("best-score")!;
    const statusElement    = document.getElementById("game-status")!;
    const newGameButton    = document.getElementById("new-game")!;
    const boardElement     = document.querySelector<HTMLTableElement>(".game-board")!;

    const cellElements = game.cells.map((rowCells, row) =>
                                            rowCells.map((_, column) =>
                                                             document.getElementById(`cell-${row}-${column}`)!));

    function render(): void
    {
        scoreElement.textContent     = String(game.score);
        lastScoreElement.textContent = records.last === null ? "—" : String(records.last);
        bestScoreElement.textContent = String(records.best);
        statusElement.textContent    = game.status === "won" ? "You reached 2048!" :
                                       game.status === "lost" ? "No moves left." : "Swipe or use arrow keys.";

        for (const [row, rowCells] of game.cells.entries())
        {
            for (const [column, value] of rowCells.entries())
            {
                const cell       = cellElements[row]![column]!;
                cell.textContent = value === 0 ? "" : String(value);

                let colorGroup = "empty";
                if (value >= 1024)
                {
                    colorGroup = "highest";
                }
                else if (value >= 128)
                {
                    colorGroup = "high";
                }
                else if (value >= 16)
                {
                    colorGroup = "medium";
                }
                else if (value > 0)
                {
                    colorGroup = "low";
                }

                cell.dataset.colorGroup = colorGroup;
            }
        }
    }

    function takeTurn(direction: Direction): void
    {
        if (game.status !== "playing")
        {
            return;
        }

        game.play(direction);

        // Save only the transition from playing to a completed game.
        if (game.status !== "playing")
        {
            records = { last: game.score, best: Math.max(records.best, game.score) };
            try
            {
                localStorage.setItem(scoreStorageKey, JSON.stringify(records));
            } catch
            {
                // Scores still work for this page when browser storage is unavailable.
            }
        }

        render();
    }

    const directions: Partial<Record<string, Direction>> = {
        ArrowUp   : "up",
        ArrowDown : "down",
        ArrowLeft : "left",
        ArrowRight: "right"
    };

    document.addEventListener("keydown", event =>
    {
        const direction = directions[event.key];
        if (!direction
            || event.defaultPrevented
            || isTerminalOpen()
            || event.altKey
            || event.ctrlKey
            || event.metaKey)
        {
            return;
        }

        event.preventDefault();
        if (!event.repeat)
        {
            takeTurn(direction);
        }
    });

    let swipeStart: { pointerId: number; x: number; y: number } | undefined;

    boardElement.addEventListener("pointerdown", event =>
    {
        if (!event.isPrimary)
        {
            swipeStart = undefined;
            return;
        }

        if (event.button !== 0 || isTerminalOpen() || game.status !== "playing")
        {
            return;
        }

        swipeStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        boardElement.setPointerCapture(event.pointerId);
    });

    boardElement.addEventListener("pointerup", event =>
    {
        if (swipeStart?.pointerId !== event.pointerId)
        {
            return;
        }

        const deltaX = event.clientX - swipeStart.x;
        const deltaY = event.clientY - swipeStart.y;
        swipeStart = undefined;

        // Ignore taps and small movements. The dominant axis determines the move.
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24 || isTerminalOpen())
        {
            return;
        }

        const direction: Direction = Math.abs(deltaX) > Math.abs(deltaY)
            ? (deltaX > 0 ? "right" : "left")
            : (deltaY > 0 ? "down" : "up");
        takeTurn(direction);
    });

    const cancelSwipe = (event: PointerEvent) =>
    {
        if (swipeStart?.pointerId === event.pointerId)
        {
            swipeStart = undefined;
        }
    };
    boardElement.addEventListener("pointercancel", cancelSwipe);
    boardElement.addEventListener("lostpointercapture", cancelSwipe);

    newGameButton.addEventListener("click", () =>
    {
        swipeStart = undefined;
        game = new Game2048();
        render();
    });

    render();
}

function loadScoreRecords(): ScoreRecords
{
    try
    {
        const saved = localStorage.getItem(scoreStorageKey);
        if (saved !== null)
        {
            const records = JSON.parse(saved) as ScoreRecords;

            if (Number.isSafeInteger(records.best) && records.best >= 0
                && (records.last === null || (Number.isSafeInteger(records.last) && records.last >= 0)))
            {
                return { last: records.last, best: Math.max(records.best, records.last ?? 0) };
            }
        }
    } catch
    {
        // Start without records when storage is unavailable or contains invalid data.
    }

    return { last: null, best: 0 };
}

class Game2048
{
    public readonly boardSize: number     = 4;
    public readonly cells: number[][]     = [];
    public score: number                  = 0;
    public status: "playing" | GameResult = "playing";

    constructor()
    {
        for (let row = 0; row < this.boardSize; row++)
        {
            const rowCells: number[] = [];

            for (let col = 0; col < this.boardSize; col++)
            {
                rowCells.push(0);
            }

            this.cells.push(rowCells);
        }

        this.spawnTile();
        this.spawnTile();
    }

    private spawnTile(): void
    {
        const emptyCellCoordinates = this.getEmptyCellCoordinates();

        if (emptyCellCoordinates.length === 0)
        {
            return;
        }

        const randomTilePosition = emptyCellCoordinates[this.getRandomInteger(0, emptyCellCoordinates.length)]!;

        this.cells[randomTilePosition.row]![randomTilePosition.column] = this.randomTileValue();
    }

    private getEmptyCellCoordinates(): { column: number; row: number }[]
    {
        const emptyCellCoordinates: { column: number; row: number }[] = [];

        for (let row = 0; row < this.boardSize; row++)
        {
            for (let column = 0; column < this.boardSize; column++)
            {
                const isTilePositionOccupied: boolean = this.isTilePositionOccupied({ column, row });

                if (isTilePositionOccupied)
                {
                    continue;
                }

                emptyCellCoordinates.push({ column, row });
            }
        }

        return emptyCellCoordinates;
    }

    private hasAvailableMoves(): boolean
    {
        if (this.getEmptyCellCoordinates().length > 0)
        {
            return true;
        }

        for (let row = 0; row < this.boardSize; row++)
        {
            for (let column = 0; column < this.boardSize; column++)
            {
                const value = this.cells[row]![column]!;

                if (column + 1 < this.boardSize && value === this.cells[row]![column + 1])
                {
                    return true;
                }

                if (row + 1 < this.boardSize && value === this.cells[row + 1]![column])
                {
                    return true;
                }
            }
        }

        return false;
    }

    private isTilePositionOccupied(tilePosition: { column: number; row: number }): boolean
    {
        const cell: number = this.cells[tilePosition.row]![tilePosition.column]!;
        return cell !== 0;
    }

    private randomTileValue(): 2 | 4
    {
        return Math.random() < 0.9 ? 2 : 4;
    }

    private getRandomInteger(min: number, max: number): number
    {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    public play(direction: Direction): void
    {
        if (this.status !== "playing")
        {
            return;
        }

        let boardChanged: boolean = false;
        const isVertical          = direction === "up" || direction === "down";
        const isReversed          = direction === "right" || direction === "down";

        for (let lineIndex = 0; lineIndex < this.boardSize; lineIndex++)
        {
            const originalLine = isVertical
                                 ? this.cells.map(row => row[lineIndex]!)
                                 : this.cells[lineIndex]!;

            const mergedLine = this.mergeLine(isReversed ? originalLine.toReversed() : originalLine);
            if (isReversed)
            {
                mergedLine.reverse();
            }

            const lineChanged = mergedLine.some((value, index) => value !== originalLine[index]);
            boardChanged      = boardChanged || lineChanged;

            if (isVertical)
            {
                for (let rowIndex = 0; rowIndex < this.boardSize; rowIndex++)
                {
                    this.cells[rowIndex]![lineIndex] = mergedLine[rowIndex]!;
                }
            }
            else
            {
                this.cells[lineIndex] = mergedLine;
            }
        }

        if (boardChanged)
        {
            this.spawnTile();
        }

        if (this.cells.some(row => row.includes(2048)))
        {
            this.finish("won");
        }
        else if (!this.hasAvailableMoves())
        {
            this.finish("lost");
        }
    }

    private mergeLine(line: number[]): number[]
    {
        const mergedLine = line.filter(value => value !== 0);

        for (let index = 0; index < mergedLine.length - 1; index++)
        {
            if (mergedLine[index] === mergedLine[index + 1])
            {
                mergedLine[index]! *= 2;
                mergedLine.splice(index + 1, 1);

                this.score += mergedLine[index]!;
            }
        }

        while (mergedLine.length < this.boardSize)
        {
            mergedLine.push(0);
        }

        return mergedLine;
    }

    public finish(result: GameResult): void
    {
        if (this.status === "playing")
        {
            this.status = result;
        }
    }
}
