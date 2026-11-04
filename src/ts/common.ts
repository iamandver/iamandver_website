// Import from each page script to load the site's shared styles and control behaviour.
import "../css/common.css";
import { initNumberControls } from "./controls.ts";

window.addEventListener("DOMContentLoaded", () => initNumberControls());
