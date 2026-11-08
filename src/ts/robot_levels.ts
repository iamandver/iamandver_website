export const roomSymbols = {
    wall  : "#",
    floor : ".",
    robot : "@",
    crate : "C",
    scrap : "S",
    exit  : "E", // opens after collecting every scrap
    sentry: "+"  // sees along all four axes after the final scrap
} as const;

export const firstRoom = {
    level: 1,
    room : 1,
    name : "Cargo bay",
    map  : `
#########E##
#+S.....S..#
#..##......#
#..#.......#
#..#..##...#
#.....#....#
#..@..#....#
#.....#.C..#
#..........#
############
`
};
