export const boardSize = { columns: 17, rows: 10 } as const;

export const roomSymbols = {
    wall  : "#",
    floor : ".",
    robot : "@",
    crate : "C",
    scrap : "S",
    exit  : "E", // opens after collecting every scrap
    sentry: "+"  // sees along all four axes after the final scrap
} as const;

export type RoomDefinition = Readonly<{
    level: number;
    room: number;
    name: string;
    map: string;
}>;

export const rooms: readonly RoomDefinition[] = [
    {
        level: 1,
        room : 1,
        name : "Cargo bay",
        map  : `
######E######
#...........#
#...........#
#......S....#
#...........#
#...........#
#....@......#
#...........#
#...........#
#############
`
    },
    {
        level: 1,
        room : 2,
        name : "Cargo bay",
        map  : `
######E######
#.+#........#
#..#........#
#.S.........#
#...........#
#....S......#
#........+..#
#......@....#
#...........#
#############
`
    },
    {
        level: 1,
        room : 3,
        name : "Cargo bay",
        map  : `
#########E###
#+S.....S...#
#..##.......#
#..#........#
#..#..##....#
#.....#.....#
#..@..#.....#
#.....#.C...#
#...........#
#############
`
    },
    {
        level: 1,
        room : 4,
        name : "Cargo bay",
        map  : `
###########E#
#.........#.#
#.C.......#.#
#.C.....+.#.#
#.........#.#
#...@.......#
#.......S...#
#.....+.....#
#..........+#
#############
`
    }
];

export function getOrderedRooms(): readonly RoomDefinition[]
{
    const ordered = [...rooms].sort((a, b) => a.level - b.level || a.room - b.room);
    if (ordered.length === 0)
    {
        throw new Error("At least one robot room must be defined.");
    }

    for (const [index, room] of ordered.entries())
    {
        if (!Number.isSafeInteger(room.level) || room.level < 1 ||
            !Number.isSafeInteger(room.room) || room.room < 1)
        {
            throw new Error("Room level and room numbers must be positive integers.");
        }

        const previous = ordered[index - 1];
        if (previous?.level === room.level && previous.room === room.room)
        {
            throw new Error(`Duplicate robot room: Level ${room.level}, Room ${room.room}.`);
        }
    }

    return ordered;
}
