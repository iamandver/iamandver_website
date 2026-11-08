import type { Direction } from "./game_controls.ts";

export class RobotGame
{
    public readonly rows: readonly string[];
    private robotPosition: Readonly<{ column: number; row: number }>;

    constructor(map: string)
    {
        this.rows = parseRoom(map);
        const row = this.rows.findIndex(cells => cells.includes("@"));
        this.robotPosition = { column: this.rows[row]!.indexOf("@"), row };
    }

    public get robot(): Readonly<{ column: number; row: number }>
    {
        return this.robotPosition;
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
            if (!"#.@".includes(cell))
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
