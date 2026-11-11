import type { Direction }         from "../controls.ts";
import { boardSize, roomSymbols } from "./levels.ts";

export type Position = Readonly<{ column: number; row: number }>;

type SentryState = Position & { triggered: boolean };

export type RobotMove = Readonly<{
    direction: Direction;
    from: Position;
    to: Position;
    crate: Readonly<{ index: number; from: Position; to: Position }> | undefined;
}>;

export class RobotRoom
{
    public readonly rows: readonly string[];
    public readonly exit: Position;

    private robotPosition: Position;
    private readonly cratePositions: Position[]  = [];
    private readonly scrapPositions: Position[]  = [];
    private readonly sentryStates: SentryState[] = [];

    private gameStatus: "playing" | "caught" | "complete" = "playing";

    constructor(map: string)
    {
        const rows         = parseRoom(map);
        const row          = rows.findIndex(cells => cells.includes(roomSymbols.robot));
        this.robotPosition = { column: rows[row]!.indexOf(roomSymbols.robot), row };
        const exitRow      = rows.findIndex(cells => cells.includes(roomSymbols.exit));
        this.exit          = { column: rows[exitRow]!.indexOf(roomSymbols.exit), row: exitRow };

        for (const [row, cells] of rows.entries())
        {
            for (const [column, cell] of Array.from(cells).entries())
            {
                if (cell === roomSymbols.crate)
                {
                    this.cratePositions.push({ column, row });
                }
                else if (cell === roomSymbols.scrap)
                {
                    this.scrapPositions.push({ column, row });
                }
                else if (cell === roomSymbols.sentry)
                {
                    this.sentryStates.push({ column, row, triggered: false });
                }
            }
        }

        this.rows = rows.map(cells => cells
            .replaceAll(roomSymbols.robot, roomSymbols.floor)
            .replaceAll(roomSymbols.crate, roomSymbols.floor)
            .replaceAll(roomSymbols.scrap, roomSymbols.floor));
    }

    public get robot(): Position
    {
        return this.robotPosition;
    }

    public get crates(): readonly Position[]
    {
        return this.cratePositions;
    }

    public get scraps(): readonly Position[]
    {
        return this.scrapPositions;
    }

    public get sentries(): readonly Readonly<SentryState>[]
    {
        return this.sentryStates;
    }

    public get allScrapCollected(): boolean
    {
        return this.scrapPositions.length === 0;
    }

    public get status(): "playing" | "caught" | "complete"
    {
        return this.gameStatus;
    }

    // Inspect a step without changing room state.
    public getMove(direction: Direction): RobotMove | undefined
    {
        if (this.gameStatus !== "playing")
        {
            return undefined;
        }

        let { column, row } = this.robotPosition;
        switch (direction)
        {
            case "up":
                row--;
                break;
            case "down":
                row++;
                break;
            case "left":
                column--;
                break;
            case "right":
                column++;
                break;
        }

        if (this.isFixedObstacle(column, row))
        {
            return undefined;
        }

        const crateIndex = this.cratePositions.findIndex(crate => crate.column === column && crate.row === row);
        if (crateIndex !== -1)
        {
            const crateColumn = column + (column - this.robotPosition.column);
            const crateRow    = row + (row - this.robotPosition.row);

            if (!this.canCrateEnter(crateColumn, crateRow))
            {
                return undefined;
            }

            return {
                direction,
                from : this.robotPosition,
                to   : { column, row },
                crate: { index: crateIndex, from: this.cratePositions[crateIndex]!, to: { column: crateColumn, row: crateRow } }
            };
        }

        return { direction, from: this.robotPosition, to: { column, row }, crate: undefined };
    }

    public collectAt({ column, row }: Position): boolean
    {
        const scrapIndex = this.scrapPositions.findIndex(scrap => scrap.column === column && scrap.row === row);
        if (scrapIndex === -1)
        {
            return false;
        }

        this.scrapPositions.splice(scrapIndex, 1);
        return true;
    }

    public move(direction: Direction): boolean
    {
        const move = this.getMove(direction);
        if (!move)
        {
            return false;
        }

        if (move.crate)
        {
            this.cratePositions[move.crate.index] = move.crate.to;
        }
        this.robotPosition    = move.to;
        const { column, row } = move.to;

        this.collectAt(move.to);

        // Resolve security and completion only after reaching the destination tile.
        if (!this.allScrapCollected)
        {
            return true;
        }

        const detectingSentries = this.sentryStates.filter(sentry => this.canSeeRobot(sentry));
        for (const sentry of detectingSentries)
        {
            sentry.triggered = true;
        }

        if (detectingSentries.length > 0)
        {
            this.gameStatus = "caught";
        }
        else if (column === this.exit.column && row === this.exit.row)
        {
            this.gameStatus = "complete";
        }
        return true;
    }

    private isFixedObstacle(column: number, row: number): boolean
    {
        const cell = this.rows[row]?.[column];
        return cell === undefined
               || cell === roomSymbols.wall
               || cell === roomSymbols.sentry
               || (cell === roomSymbols.exit && !this.allScrapCollected);
    }

    private canCrateEnter(column: number, row: number): boolean
    {
        return !this.isFixedObstacle(column, row)
               && !this.cratePositions.some(crate => crate.column === column && crate.row === row)
               && !this.scrapPositions.some(scrap => scrap.column === column && scrap.row === row);
    }

    private canSeeRobot(sentry: Position): boolean
    {
        if (sentry.row !== this.robotPosition.row && sentry.column !== this.robotPosition.column)
        {
            return false;
        }

        const stepColumn = Math.sign(this.robotPosition.column - sentry.column);
        const stepRow    = Math.sign(this.robotPosition.row - sentry.row);
        let column       = sentry.column + stepColumn;
        let row          = sentry.row + stepRow;

        while (column !== this.robotPosition.column || row !== this.robotPosition.row)
        {
            if (this.isFixedObstacle(column, row) ||
                this.cratePositions.some(crate => crate.column === column && crate.row === row))
            {
                return false;
            }

            column += stepColumn;
            row += stepRow;
        }

        return true;
    }
}

function parseRoom(map: string): string[]
{
    const rows         = map.trim().split("\n").map(row => row.trim());
    const width        = rows[0]!.length;
    const validSymbols = Object.values(roomSymbols).join("");
    if (width === 0 || rows.some(row => row.length !== width))
    {
        throw new Error("Room rows must be non-empty and have equal lengths.");
    }

    if (width > boardSize.columns || rows.length > boardSize.rows)
    {
        throw new Error(`Room is ${width}×${rows.length} tiles; maximum size is ${boardSize.columns}×${boardSize.rows}.`);
    }

    let robotCount = 0;
    let exitCount  = 0;
    for (const row of rows)
    {
        for (const cell of row)
        {
            if (!validSymbols.includes(cell))
            {
                throw new Error(`Unknown room symbol: ${cell}`);
            }
            if (cell === roomSymbols.robot)
            {
                robotCount++;
            }
            if (cell === roomSymbols.exit)
            {
                exitCount++;
            }
        }
    }

    if (robotCount !== 1)
    {
        throw new Error(`A room must contain exactly one robot start (${roomSymbols.robot}).`);
    }

    if (exitCount !== 1)
    {
        throw new Error(`A room must contain exactly one exit (${roomSymbols.exit}).`);
    }

    return rows;
}
