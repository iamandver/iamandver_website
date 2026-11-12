import spriteSheetUrl         from "../../../assets/game_assets/art/robot_sprite_sheet.png";
import type { AnimationClip } from "./animation_player.ts";
import { roomSymbols }        from "./levels.ts";

export { spriteSheetUrl };

export const tileSize = 16;

export type Sprite = Readonly<{ column: number; row: number }>;

// Coordinates are measured in tiles from the top-left of the sheet.
export const terrainSprites = {
    floor: { column: 0, row: 4 },
    water: { column: 1, row: 4 }
};

export const objectSprites = {
    crate     : { column: 0, row: 5 },
    scrap     : { column: 1, row: 5 },
    doorClosed: { column: 2, row: 5 },
    doorOpen  : { column: 3, row: 5 },

    sentryPassive: { column: 0, row: 10 },
    sentryActive : { column: 1, row: 10 }
};

const wallSprites = {
    wallStandalone: { column: 0, row: 0 },
    wallEW        : { column: 1, row: 0 },
    wallNS        : { column: 2, row: 0 },
    wallNESW      : { column: 3, row: 0 },

    wallN: { column: 0, row: 1 },
    wallE: { column: 1, row: 1 },
    wallS: { column: 2, row: 1 },
    wallW: { column: 3, row: 1 },

    wallNE: { column: 0, row: 2 },
    wallES: { column: 1, row: 2 },
    wallSW: { column: 2, row: 2 },
    wallNW: { column: 3, row: 2 },

    wallNES: { column: 0, row: 3 },
    wallESW: { column: 1, row: 3 },
    wallNSW: { column: 2, row: 3 },
    wallNEW: { column: 3, row: 3 }
};

export function wallSpriteAt(rows: readonly string[], column: number, row: number): Sprite
{
    const north = rows[row - 1]?.[column] === roomSymbols.wall ? "N" : "";
    const east  = rows[row]?.[column + 1] === roomSymbols.wall ? "E" : "";
    const south = rows[row + 1]?.[column] === roomSymbols.wall ? "S" : "";
    const west  = rows[row]?.[column - 1] === roomSymbols.wall ? "W" : "";

    const name = `wall${north}${east}${south}${west}` as const;

    return name === "wall" ? wallSprites.wallStandalone : wallSprites[name];
}

function rowClip(column: number,
                 row: number,
                 frameCount: number,
                 frameDurationMS: number,
                 mode: AnimationClip<Sprite>["mode"] = "loop"): AnimationClip<Sprite>
{
    const frames: [Sprite, ...Sprite[]] = [{ column, row }];

    for (let offset = 1; offset < frameCount; offset++)
    {
        frames.push({
                        column: column + offset,
                        row
                    });
    }

    return { frames, frameDurationMS, mode };
}

const walkFrameDurationMS = 120;

const side = {
    idle : { column: 1, row: 6 },
    walk : rowClip(0, 8, 4, walkFrameDurationMS),
    flipX: false
};

export const robotSprites = {
    down : {
        idle : { column: 0, row: 6 },
        walk : rowClip(0, 7, 4, walkFrameDurationMS),
        flipX: false
    },
    up   : {
        idle : { column: 2, row: 6 },
        walk : rowClip(0, 9, 4, walkFrameDurationMS),
        flipX: false
    },
    left : side,
    right: {
        ...side,
        flipX: true
    }
};

const attackFrameDurationMS = 60;
const shootLeft             = {
    clip : rowClip(0, 12, 2, attackFrameDurationMS),
    flipX: false
};

export const attackSprites = {
    sentryPowerUp : {
        column: 0,
        row   : 11
    },
    sentryShoot   : {
        down : {
            clip : rowClip(2, 11, 2, attackFrameDurationMS),
            flipX: false
        },
        left : shootLeft,
        right: { ...shootLeft, flipX: true },
        up   : {
            clip : rowClip(2, 12, 2, attackFrameDurationMS),
            flipX: false
        }
    },
    beamHorizontal: rowClip(0, 13, 2, attackFrameDurationMS),
    beamVertical  : rowClip(2, 13, 2, attackFrameDurationMS),
    robotHit      : rowClip(0, 14, 2, attackFrameDurationMS),
    robotDeath    : rowClip(0, 15, 4, 100, "once")
};
