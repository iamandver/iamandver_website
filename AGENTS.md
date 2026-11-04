# Project direction

- A personal, old-school website: static, minimal, playful, and full of Easter eggs. Preserve the handmade, pre-commercial-web spirit.
- Inspirations: [Devin.LA](https://devin.la/), [Cameron's World](https://www.cameronsworld.net/), and [Android Arts](https://androidarts.com/).
- Desktop-first. Preserve the retro composition on phones using the current 880px viewport and minimum layout width.
- Keep pixel artwork at a consistent scale using the shared `--art-pixel` value and explicit per-asset dimensions.

# Implementation preferences

- Favor plain HTML, CSS, and small amounts of TypeScript within the existing Vite project. Keep architecture proportional to the site.
- Run features in the visitor's browser. Use GitHub Pages for hosting; introduce a backend only when a concrete requirement needs one, after discussion.
- Use `localStorage` for local preferences and Easter egg progress. Keep saved state small and versioned; no accounts or server synchronization by default.
- No cookies, analytics, marketing, third-party tracking, or consent banners by default. Prefer locally hosted assets.
- Screen-reader support and accessibility/compliance work are outside the current scope. Do not add complexity to satisfy standards unless requested.
- Track only assets the site uses, with their licenses. Keep the rest of the downloaded asset library ignored.
- Keep changes and documentation small. Ask before consequential design decisions; leave commits and pushes to explicit requests.
