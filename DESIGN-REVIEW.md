# Design review log

Each phase was captured with a headless browser, compared to the references (`REFERENCES.md`), and scored 1 to 5 against the 11 design principles in the plan. Anything under 4 was fixed and re-captured before moving on. A 5 means I would not change it.

Principles: 1 Clarity in 5 seconds · 2 Clear hierarchy · 3 Restraint · 4 Legibility · 5 Consistency · 6 Alignment and rhythm · 7 Motion with purpose · 8 Feedback and affordance · 9 Speed · 10 Accessible by default · 11 Personality without gimmicks

Scores are my own reading of screenshots. Nobody else has reviewed them, and motion was judged from frame captures and timings, not from watching it on a real screen.

## Phase 1: loader and exterior

| Principle | Before | After | What changed |
|---|---|---|---|
| 1 Clarity | 4 | 4 | Name top-left, sign center, prompt below. |
| 2 Hierarchy | 3 | 5 | Sign board removed; sign enlarged; door glow toned down so the sign is the only bright thing. |
| 3 Restraint | 3 | 5 | Light pools tightened, corners vignetted; the wall now falls into darkness like the Flynn's still. |
| 4 Legibility | 2 | 4 | Tubes were blown out to white. Lowered the white mix and the bloom so the letters keep their color and edges. |
| 6 Alignment | 4 | 4 | Sign, door, prompt and skip link share one center line. |
| 11 Personality | 3 | 4 | Door was a flat orange panel; now framed glass doors with warm light behind. |

Biggest improvement: removing the grey sign board and letting the tubes light the brick directly.

Versus Flynn's: matches the darkness, the single light source, the lit brick and the warm doorway. The street reflection is faint: only the door reflects in frame, the sign's reflection falls below the bottom edge at this camera distance.

## Phase 2 and 3: entry, interior, cabinet row

| Principle | Before | After | What changed |
|---|---|---|---|
| 2 Hierarchy | 2 | 5 | Selected cabinet is lit and bright; neighbors are dimmed to about a third. Trim brightness cut so the screen leads. |
| 3 Restraint | 2 | 4 | Cyan wall strip bloomed across the whole top of the screen. Strips thinned and bloom threshold raised. Carpet confetti cut to half opacity and fewer shapes. |
| 4 Legibility | 3 | 5 | Marquee and label text stay crisp; the label is HTML so bloom never touches it. Strips moved below the menu. |
| 5 Consistency | 3 | 4 | Room went all-orange under amber light; focus light now mixes the project color with white, fill light is purple. |
| 6 Alignment | 3 | 4 | Camera pulled back and tilted down so the whole cabinet sits above the label instead of behind it. Cabinets are exactly 2 m apart. |
| 7 Motion | 4 | 4 | Entry 2.4 s with eased dolly, door swing and one glow wash; cabinet-to-cabinet 0.7 s; zoom 0.95 s. |
| 8 Feedback | 4 | 4 | Pointer cursor over cabinets, arrow buttons that disable at the ends, counter, label hover glow. |

Biggest improvement: making the cabinet bodies visible. Dark paint under dim lights rendered as pure black, so only the trim outlines showed.

Versus sadok.mx: same sequence of loader, one start prompt, then the thing powers on (the sign stutters on). Keyboard and click both work throughout. Not as rich: there is no sound and no idle animation inside.

## Phase 4: project pages and return

No visual fixes needed. Back link, Escape and the browser Back button all return to the same cabinet (covered by `npm run check`).

## Phase 5: flat pages

First version reused the arcade look (pixel-font headings, neon outlines, scanline placeholders). On 2026-11-13 Hudson asked for the flat pages to be normal, professional pages with no arcade or retro styling. Redone:

| Principle | Before | After | What changed |
|---|---|---|---|
| 2 Hierarchy | 3 | 5 | Large Inter headings, dim lede, quiet uppercase labels. |
| 3 Restraint | 2 | 5 | No glow, no pixel font, neutral greys; the project color appears only as a small dot and a faint placeholder tint. |
| 4 Legibility | 3 | 5 | Body text 17px Inter; contrast about 17:1 for text and 8:1 for dim text on the background. |
| 5 Consistency | 4 | 4 | Flat pages are one system (same margins, rows, buttons). They intentionally no longer match the arcade, by request. |
| 8 Feedback | 4 | 4 | Underline slides in on menu hover, cards lift, buttons brighten. |
| 11 Personality | 4 | 4 | The 404 keeps its "Game over / Insert coin to continue" wording, in the clean style. |

Biggest improvement: the pages now read as a professional portfolio first.

Versus logartis.info: same idea of plain text links top-right with even spacing. Their hover behaviour could not be captured, so mine is my own.

## Phase 6: fallback, mobile, accessibility, performance

| Principle | Before | After | What changed |
|---|---|---|---|
| 1 Clarity (phone) | 3 | 4 | Prompt says "swipe · tap" on touch devices instead of "scroll · click · enter". |
| 3 Restraint (phone) | 2 | 4 | The simplified phone street showed a hot yellow highlight under the door; made the surface rougher. |
| 4 Legibility | 3 | 4 | Micro 5 is a very small pixel font: raised from 22px to 26px in the menu and labels, 40px in the phone overlay. |
| 10 Accessible | 4 | 5 | Heading order fixed on Portfolio. Hidden summary links are out of the Tab order in 3D mode. |
| 9 Speed | 4 | 4 | See Lighthouse below. |

Later font changes requested by Hudson: Micro 5 for the home page menu and labels, Doto for the loading screen.

## Final pass

| Screen | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Loader | 4 | 5 | 5 | 4 | 4 | 5 | 4 | 4 | 4 | 5 | 4 |
| Exterior | 4 | 5 | 5 | 4 | 4 | 4 | 4 | 4 | 4 | 5 | 5 |
| Interior | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 5 | 4 |
| Project page | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 4 |
| About | 4 | 5 | 5 | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 4 |
| Portfolio | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 4 |
| Contact | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 4 |
| 404 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 4 |

Exceptions and caveats:
- **Consistency is 4 everywhere, not 5.** The home page and the flat pages are now two visual systems on purpose. Inside each one, spacing, type and interaction patterns are shared.
- **About is 4 on clarity** until the intro paragraph and awards are filled in; right now the first thing a visitor reads is a TODO.
- **Legibility on the home page is 4.** Micro 5 is legible at the current size but is a tight pixel font; anyone who finds it hard to read can use the flat pages, which are Inter.
- **Speed on the home page is 4.** It scores 73 in Lighthouse's throttled phone test, because starting Three.js and compiling shaders blocks the main thread for about 1.9 s there; first paint is still 1.0 s. The flat pages score 96 to 100.

Five-second test:
- **Landing:** "Hudson Bjerkness" top-left, a neon sign reading "Hudson's Arcade", one prompt telling you how to go in, and a skip link.
- **Interior:** one lit cabinet, a label with the project name, one sentence, and "Enter to play", arrows either side.
- **About:** title, then the facts in labelled rows. The intro is still a placeholder.

Nothing was copied from the references: no code, assets, layouts, lettering or logos.
