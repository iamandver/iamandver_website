import spriteSheetUrl from "../../../assets/game_assets/art/robot_sprite_sheet.png";

export { spriteSheetUrl };

export const tileSize = 16;

// Coordinates are measured in tiles from the top-left of the sheet.
export const sprites = {
    wall  : { column: 0, row: 0 },
    floor : { column: 1, row: 0 },
    robot : { column: 2, row: 0 },
    crate : { column: 3, row: 0 },
    door  : { column: 4, row: 0 },
    scrap : { column: 5, row: 0 },
    sentry: { column: 6, row: 0 },
    water : { column: 7, row: 0 }
};
