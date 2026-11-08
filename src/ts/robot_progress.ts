import type { RoomDefinition } from "./robot_levels.ts";

const progressStorageKey = "robot-progress-v1";

export function loadRoomIndex(rooms: readonly RoomDefinition[]): number
{
    try
    {
        const saved = localStorage.getItem(progressStorageKey);
        if (saved !== null)
        {
            const checkpoint = JSON.parse(saved) as Pick<RoomDefinition, "level" | "room">;
            const index      = rooms.findIndex(room => room.level === checkpoint.level && room.room === checkpoint.room);
            if (index !== -1)
            {
                return index;
            }
        }
    } catch
    {
        // Start at the first room if storage is unavailable or invalid.
    }

    return 0;
}

export function saveRoomCheckpoint(room: RoomDefinition): void
{
    try
    {
        localStorage.setItem(progressStorageKey, JSON.stringify({ level: room.level, room: room.room }));
    } catch
    {
        // Progression still works for this visit when storage is unavailable.
    }
}

export function clearRoomCheckpoint(): void
{
    try
    {
        localStorage.removeItem(progressStorageKey);
    } catch
    {
        // Storage may be unavailable; normal play already falls back to the first room.
    }
}
