import "../../site/common.ts";

import { RobotController } from "./controller.ts";
import { RobotPageView }   from "./page_view.ts";

window.addEventListener("DOMContentLoaded", () =>
{
    const page = new RobotPageView();
    void RobotController.start(page)
                        .catch(error =>
                               {
                                   page.showError(error instanceof Error ? error.message : "The room could not be loaded.");
                                   console.error(error);
                               });
});
