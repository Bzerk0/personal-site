# Hudson's Arcade

Hudson Bjerkness's personal site. The home page is a 3D arcade at night where every cabinet is a project. Everything is also available as plain, fast pages (About, Portfolio, Contact, one page per project).

## Run it on your computer

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open the address it prints (usually http://localhost:5173). The page reloads when you save a file.

| Command | What it does |
|---|---|
| `npm run dev` | Runs the site locally while you edit. |
| `npm run build` | Builds the finished site into the `dist/` folder. |
| `npm run preview` | Serves `dist/` so you can try the built site. |
| `npm run check` | Builds, then tests the whole site in a headless browser (about 4 minutes). Needs Google Chrome installed. |

## Add a project

Everything about a project lives in one place: `src/data/projects.json`. Adding an entry there adds a cabinet in the arcade, a card on the Portfolio page, and a page at `/projects/<slug>/`. No other code changes.

1. Copy an existing entry in `src/data/projects.json` and change the values:

   | Field | Meaning |
   |---|---|
   | `slug` | The URL name, lowercase with dashes: `my-project` becomes `/projects/my-project/`. |
   | `name` | The full project name. |
   | `marquee` | Short name for the cabinet's lit sign (about 13 characters or fewer). |
   | `tagline` | One sentence. Shown on the cabinet label, the card, and the page. |
   | `accent` | The project's color, e.g. `"#18e7ff"`. |
   | `image` | Path to a screenshot, e.g. `"/projects/my-project/screen.webp"`. Leave `""` to show a placeholder. |
   | `imageAlt` | A sentence describing the image for people who can't see it. |
   | `video` | Optional path to a short looping video (`.mp4` or `.webm`). It only downloads when its cabinet is selected. |
   | `whatItIs`, `whatIDid`, `status` | Text for the project page. |
   | `tools` | A list, e.g. `["Claude Code", "Figma"]`. |
   | `note` | Optional small print at the bottom of the page. |
   | `links` | A list like `[{ "label": "Live site", "url": "https://..." }]`. |

2. Put the project's images in `public/projects/<slug>/`. Use WebP or JPG, around 1600 x 1200 (4:3), under 300 KB.
3. Save. The dev server rebuilds the pages by itself.

Text that contains `TODO:` shows with a dashed orange outline on the site, so unfinished content is easy to spot.

For starting5pokemon: only use your own screenshots. No Nintendo or Pokémon logos or artwork.

## Change colors and fonts

**Colors** are defined once at the top of `src/styles/base.css` (the `--bg`, `--magenta`, `--cyan`, `--amber` lines). The 3D scene uses the same four colors from `src/constants.js`. If you change one, change it in both files.

**Fonts** are also at the top of `src/styles/base.css`:

| Variable | Font | Used for |
|---|---|---|
| `--font-body` | Inter | All the flat pages. |
| `--font-label` | Micro 5 | Home page menu and small labels (hints, counter). |
| `--font-loader` | Doto | The loading screen. |
| `--font-pixel` | Press Start 2P | Cabinet marquees, cabinet screens, the cabinet name label. |
| `--font-neon` | Tilt Neon | The "Hudson's Arcade" sign. |

All five are self-hosted: they are installed by npm (the `@fontsource` packages) and bundled into the site. To swap one, install another `@fontsource` package, change its `@import` line at the top of `base.css`, and change the name in the variable.

**The menu** is styled entirely in `src/styles/nav.css`.

**The flat pages** are styled in `src/styles/pages.css`. They are deliberately plain and professional; the arcade look is only on the home page (`src/styles/arcade.css`).

## Where things are

```
index.html                 The home page (3D arcade + the plain 2D version of it)
about/ portfolio/ contact/ The flat pages
404.html                   "Game over" page for wrong addresses
site.config.js             Site address, name, and the menu links
vite.config.js             Build setup. Fills in the shared menu, footer, and sharing tags
netlify.toml               Hosting setup for Netlify

src/data/projects.json     All project content (the single source of truth)
src/constants.js           The four site colors, for the 3D scene
src/main.js                Home page start-up: chooses 3D or 2D, runs the loading screen
src/page.js                Script for the flat pages (tiny)
src/ui/nav.js              The phone menu

src/scene/arcade.js        The 3D controller: renderer, camera, input, states
src/scene/exterior.js      The street: wall, doors, pavement, lights, sign flicker
src/scene/neonSign.js      The neon sign
src/scene/interior.js      The room: carpet, lamps, neon strips, the row of cabinets
src/scene/cabinet.js       createCabinet(project): builds one cabinet
src/scene/textures.js      Every texture, painted in code (brick, carpet, marquees, screens)
src/scene/transitions.js   The camera moves (walking in, zooming into a screen)
src/scene/loader.js        The loading counter and start button

src/styles/base.css        Colors, fonts, spacing (shared by every page)
src/styles/nav.css         The menu
src/styles/pages.css       The flat pages
src/styles/arcade.css      The home page overlays, loading screen, 2D landing

scripts/build-projects.js  Turns projects.json into the project pages and cards
scripts/check.js           The automated test (npm run check)
scripts/shoot.js           Takes screenshots with a headless browser
projects/                  GENERATED project pages. Don't edit; change projects.json instead
public/                    Files copied as-is: favicon, og-image.png, project images
screenshots/               Progress and final screenshots, plus the reference captures
```

## How the home page decides between 3D and 2D

`src/main.js` shows the simple 2D landing (CSS neon sign, menu, project grid) instead of the 3D arcade when:

- the browser has no WebGL 2, or only slow software rendering
- the device is clearly low-powered (2 CPU cores or fewer, or 2 GB of memory or less)
- the visitor has "save data" turned on
- JavaScript is off
- the address ends in `?2d` (useful for testing)

With "reduce motion" turned on in the operating system, the 3D still runs but the sign doesn't flicker, the camera doesn't sway or dolly, and scene changes are a short fade.

## Sharing image

`public/og-image.png` (1200 x 630) is the picture shown when the site is shared in a message or on social media. It is a capture of the street scene with the on-screen text hidden.

## Deploy (GitHub + Netlify)

1. **GitHub:** create a new empty repository at https://github.com/new (no README, no .gitignore). Then, in this folder:

   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   ```

   ```bash
   git push -u origin main
   ```

2. **Netlify:** sign up at https://app.netlify.com with your GitHub account. Choose "Add new project" > "Import an existing project" > GitHub > pick the repository. The build settings are read from `netlify.toml`, so just press Deploy.
3. **Contact form:** in Netlify, open the project > Forms > "Enable form detection", then trigger a new deploy. Submissions appear under Forms. Add your email under Forms > Notifications to get them by email.
4. **Custom domain (later):** Netlify > Domain management > "Add a domain". Either buy the domain there, or buy it elsewhere and point its nameservers at Netlify as instructed. HTTPS is set up automatically. Then set the same address as `url` in `site.config.js` and push.

Every push to GitHub redeploys the site.

## Still to fill in

Search the project for `TODO:` to find every placeholder. See the list in the final report or run:

```bash
git grep -n "TODO:" -- . ":!README.md" ":!DESIGN-REVIEW.md"
```
