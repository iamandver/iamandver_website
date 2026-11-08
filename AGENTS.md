# Project direction

- A personal, old-school website: static, minimal, playful, and full of Easter eggs. Preserve the handmade, pre-commercial-web spirit.
- Inspirations: [Devin.LA](https://devin.la/), [Cameron's World](https://www.cameronsworld.net/), and [Android Arts](https://androidarts.com/).
- Desktop-first, with basic mobile support. Use the device-width viewport, let layouts shrink, and stack panels and control labels on narrow screens. Preserve the retro fonts, colors, borders, and desktop composition.
- Keep pixel artwork at a consistent scale using the shared `--art-pixel` value and explicit per-asset dimensions.

# Implementation preferences

- Favor plain HTML, CSS, and small amounts of TypeScript within the existing Vite project. Keep architecture proportional to the site.
- Keep verification lightweight: use the existing build and focused browser checks. Do not add automated test files, test scripts, or test infrastructure unless explicitly requested.
- Run features in the visitor's browser. Use GitHub Pages for hosting; introduce a backend only when a concrete requirement needs one, after discussion.
- Use `localStorage` for local preferences and Easter egg progress. Keep saved state small and versioned; no accounts or server synchronization by default.
- No cookies, analytics, marketing, third-party tracking, or consent banners by default. Prefer locally hosted assets.
- Screen-reader support and accessibility/compliance work are outside the current scope. Do not add complexity to satisfy standards unless requested.
- Track only assets the site uses, with their licenses. Keep the rest of the downloaded asset library ignored.
- Keep changes and documentation small. Ask before consequential design decisions; leave commits and pushes to explicit requests.
