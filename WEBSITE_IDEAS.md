# Website ideas

A personal corner of the web: old-school, handmade, playful, and deliberately a little messy. Useful content should be easy to find, with oddities and secrets rewarding exploration.

## Starting layout

- A desktop-first, fixed-width web portal with a masthead, three uneven columns, and a footer. Mobile should work, but remains secondary; preserve the composition.
- Use CSS Grid for the main layout, with a wide centre for introductions and projects and narrower side columns for navigation, links, and curiosities.
- Build the old table-layout feel through borders, varied panel heights, colours, and pixel artwork. Keep the underlying structure predictable.
- Retain the current black background, monospace text, and IBM VGA headings.

## Terminal and Easter eggs

- A discoverable terminal opener reveals an output history and a styled text input. Recognised commands trigger responses or actions; other input can receive playful replies.
- Hide clues in page text, artwork, labels, and other small details. Some clues unlock commands that are absent from ordinary help.
- Commands can launch tiny games, such as a falling-block puzzle or a 2048-style game, on separate pages in the same tab. Browser Back returns home; games also provide a home link.
- Remember discoveries locally, following the persistence guidance in [AGENTS.md](AGENTS.md).

## Possible content

- **Workbench:** projects, experiments, and interesting unfinished prototypes, with screenshots and short notes.
- **Oddities cabinet:** small interactive toys, peculiar machines, or pixel creatures.
- **Hidden arcade:** start with one game and one satisfying discovery path.
- **Personal directory:** favourite obscure websites, tools, art, and games, with brief annotations.

## First workbench project

The image-to-Braille converter from the C# `a_weird_day` project. Plan to port its conversion logic to TypeScript so visitors can try it in their browser.

Colour output always uses a selected colour palette. The initial palette collection and any custom-palette controls are still open. Cascadia Mono is the starting font candidate for Braille output.

Proposed first milestone: render a bundled sample image as Braille and compare it with the C# output. Then add local image selection, conversion controls, and text copying. Feature it on the homepage with a preview and a link to its own tool page.

## Still open

Exact dimensions, panel contents, artwork, terminal appearance, commands, and the first game. A draggable terminal is an option to explore; a full window-based desktop is not part of the starting layout.
