import spriteSheetUrl from "../../../assets/game_assets/art/robot_sprite_sheet.png";

export { spriteSheetUrl };

export const tileSize = 16;

// Coordinates are measured in tiles from the top-left of the sheet.
export const sprites = {
    wall          : { column: 0, row: 0 },
    floor         : { column: 1, row: 0 },
    water         : { column: 2, row: 0 },

    crate         : { column: 0, row: 1 },
    scrap         : { column: 1, row: 1 },
    doorClosed    : { column: 2, row: 1 },
    doorOpen      : { column: 3, row: 1 },

    robotIdleFront: { column: 0, row: 2 },
    sentryPassive : { column: 0, row: 6 },
    sentryActive  : { column: 1, row: 6 }
};
