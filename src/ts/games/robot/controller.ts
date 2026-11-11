import { GameLoop }                                               from "./game_loop.ts";
import { getOrderedRooms, type RoomDefinition }                   from "./levels.ts";
import { RobotMovement }                                          from "./movement.ts";
import type { RobotPageView }                                     from "./page_view.ts";
import { clearRoomCheckpoint, loadRoomIndex, saveRoomCheckpoint } from "./progress.ts";
import { RobotRenderer }                                          from "./renderer.ts";
import { RobotRoom }                                              from "./room.ts";

export class RobotController
{
    private readonly page: RobotPageView;
    private readonly renderer: RobotRenderer;
    private readonly rooms: readonly RoomDefinition[];
    private readonly url: URL;
    private readonly practice: boolean;
    private readonly movement: RobotMovement;
    private readonly loop: GameLoop;
    private readonly resetControls: () => void;

    private roomIndex: number;
    private room: RobotRoom;

    private constructor(page: RobotPageView,
                        renderer: RobotRenderer,
                        rooms: readonly RoomDefinition[],
                        url: URL,
                        roomIndex: number)
    {
        this.page      = page;
        this.renderer  = renderer;
        this.rooms     = rooms;
        this.url       = url;
        this.practice  = url.searchParams.has("room");
        this.roomIndex = roomIndex;
        this.room      = this.loadRoom();

        page.observeSize();

        this.movement      = new RobotMovement(() => this.room,
                                               () => this.onArrival(),
                                               {
                                                   onPickup: () => page.showStatus(this.room)
                                               });

        this.loop          = new GameLoop(this.update);
        this.resetControls = page.bindControls(direction =>
                                               {
                                                   if (this.movement.press(direction, this.loop.elapsedSinceFrameMS))
                                                   {
                                                       this.render();
                                                   }
                                               },
                                               () => this.room.status === "playing",
                                               direction => this.movement.release(direction, this.loop.elapsedSinceFrameMS));

        page.observePause(paused =>
                          {
                              if (paused)
                              {
                                  this.loop.stop();
                                  this.resetControls();
                              }
                              this.movement.setPaused(paused);
                              if (!paused)
                              {
                                  this.loop.start();
                              }
                          });

        page.showStatus(this.room);
        this.render();

        page.enableRestart(() =>
                           {
                               this.resetControls();
                               this.movement.reset();
                               this.room = this.loadRoom();
                               page.showStatus(this.room);
                               this.render();
                           });
    }

    public static async start(page: RobotPageView): Promise<void>
    {
        page.enableReset(() =>
                         {
                             clearRoomCheckpoint();
                             window.location.assign(`${import.meta.env.BASE_URL}robot.html`);
                         });

        const rooms        = getOrderedRooms();
        const url          = new URL(window.location.href);
        const practiceRoom = url.searchParams.get("room");
        const roomIndex    = practiceRoom === null
                             ? loadRoomIndex(rooms)
                             : rooms.findIndex(room => `${room.level}-${room.room}` === practiceRoom);
        if (roomIndex === -1)
        {
            throw new Error(`Practice room ${practiceRoom} not found.\nUse robot resume in the terminal to return to saved progress.`);
        }

        const renderer = await RobotRenderer.load(page.canvas);
        new RobotController(page, renderer, rooms, url, roomIndex);
    }

    private loadRoom(): RobotRoom
    {
        const definition = this.rooms[this.roomIndex]!;
        const room       = new RobotRoom(definition.map);
        this.page.showRoom(definition, this.practice);

        if (this.practice)
        {
            this.url.searchParams.set("room", `${definition.level}-${definition.room}`);
            window.history.replaceState(null, "", this.url);
        }
        else
        {
            saveRoomCheckpoint(definition);
        }
        return room;
    }

    private onArrival(): void
    {
        if (this.room.status === "complete" && this.roomIndex + 1 < this.rooms.length)
        {
            this.resetControls();
            this.movement.reset();
            this.roomIndex++;
            this.room = this.loadRoom();
        }
        this.page.showStatus(this.room);
    }

    private readonly update = (deltaMS: number): void =>
    {
        const movementDeltaMS = this.movement.update(deltaMS);
        if (movementDeltaMS !== undefined)
        {
            this.render(movementDeltaMS);
        }
    };

    private render(movementDeltaMS = 0): void
    {
        const step = this.movement.step;
        this.renderer.updateAnimation(movementDeltaMS, step !== undefined);
        this.renderer.render(this.room, step, this.movement.facing);
    }
}
