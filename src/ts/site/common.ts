// Import from each page script to initialize shared controls and terminal behaviour.
import { initNumberControls } from "./controls.ts";
import { initTerminal }       from "./terminal.ts";

window.addEventListener("DOMContentLoaded", () =>
{
    initNumberControls();
    initTerminal();
});
