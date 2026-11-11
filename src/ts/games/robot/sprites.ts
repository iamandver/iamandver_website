import spriteSheetUrl         from "../../../assets/game_assets/art/robot_sprite_sheet.png";
import type { AnimationClip } from "./animation_player.ts";

export { spriteSheetUrl };

export const tileSize = 16;

export type Sprite = Readonly<{ column: number; row: number }>;

// Coordinates are measured in tiles from the top-left of the sheet.
export const sprites = {
    wall : { column: 0, row: 0 },
    floor: { column: 1, row: 0 },
    water: { column: 2, row: 0 },

    crate     : { column: 0, row: 1 },
    scrap     : { column: 1, row: 1 },
    doorClosed: { column: 2, row: 1 },
    doorOpen  : { column: 3, row: 1 },

    sentryPassive: { column: 0, row: 6 },
    sentryActive : { column: 1, row: 6 }
};

function walkClip(row: number): AnimationClip<Sprite>
{
    return {
        frames         : [
            { column: 0, row },
            { column: 1, row },
            { column: 2, row },
            { column: 3, row }
        ],
        frameDurationMS: 120,
        mode           : "loop"
    };
}

const side = { idle: { column: 1, row: 2 }, walk: walkClip(4), flipX: false };

export const robotSprites = {
    down : { idle: { column: 0, row: 2 }, walk: walkClip(3), flipX: false },
    up   : { idle: { column: 2, row: 2 }, walk: walkClip(5), flipX: false },
    left : side,
    right: { ...side, flipX: true }
};
