import type { Direction } from "./game_controls.ts";

type Position = Readonly<{ column: number; row: number }>;

export class RobotGame
{
    public readonly rows: readonly string[];

    private robotPosition: Position;
    private readonly cratePositions: Position[] = [];

    constructor(map: string)
    {
        this.rows          = parseRoom(map);
        const row          = this.rows.findIndex(cells => cells.includes("@"));
        this.robotPosition = { column: this.rows[row]!.indexOf("@"), row };

        for (const [row, cells] of this.rows.entries())
        {
            for (const [column, cell] of Array.from(cells).entries())
            {
                if (cell === "C")
                {
                    this.cratePositions.push({ column, row });
                }
            }
        }
    }

    public get robot(): Position
    {
        return this.robotPosition;
    }

    public get crates(): readonly Position[]
    {
        return this.cratePositions;
    }

    public move(direction: Direction): boolean
    {
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

        const cell = this.rows[row]?.[column];
        if (cell === undefined || cell === "#")
        {
            return false;
        }

        const crateIndex = this.cratePositions.findIndex(crate => crate.column === column && crate.row === row);
        if (crateIndex !== -1)
        {
            const crateColumn = column + (column - this.robotPosition.column);
            const crateRow    = row + (row - this.robotPosition.row);
            const nextCell    = this.rows[crateRow]?.[crateColumn];
            if (nextCell === undefined || nextCell === "#" ||
                this.cratePositions.some(crate => crate.column === crateColumn && crate.row === crateRow))
            {
                return false;
            }

            this.cratePositions[crateIndex] = { column: crateColumn, row: crateRow };
        }

        this.robotPosition = { column, row };
        return true;
    }
}

function parseRoom(map: string): string[]
{
    const rows  = map.trim().split("\n").map(row => row.trim());
    const width = rows[0]!.length;
    if (width === 0 || rows.some(row => row.length !== width))
    {
        throw new Error("Room rows must be non-empty and have equal lengths.");
    }

    let robotCount = 0;
    for (const row of rows)
    {
        for (const cell of row)
        {
            if (!"#.@C".includes(cell))
            {
                throw new Error(`Unknown room symbol: ${cell}`);
            }
            if (cell === "@")
            {
                robotCount++;
            }
        }
    }

    if (robotCount !== 1)
    {
        throw new Error("A room must contain exactly one robot start (@).");
    }

    return rows;
}
