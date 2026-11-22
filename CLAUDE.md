# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

An implementation of the **Royal Game of Ur**, an ancient Mesopotamian race board game (c. 2600 BCE). Rules references are listed in [README.md](README.md). Use them for rule questions instead of guessing.

## Current state

A playable MVP: you (white) play against a simple computer opponent (black) using the Finkel rules. The board uses tile artwork cut from `artwork/Board Game png.png` (rosette, four patterned squares, lapis separator) on a dark bitumen background; the rest of the UI is kept simple. It is an installable PWA that works offline, deployed to GitHub Pages.

- GitHub repo: https://github.com/bbetzler/royal-game-ur (public, default branch `main`).
- Live site: https://bbetzler.github.io/royal-game-ur/. Every push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml) (tests, build, deploy). The Pages source is set to "GitHub Actions".

Update this file as decisions are made.

## Commands

- `npm run dev`: dev server on port 5173. Open http://127.0.0.1:5173, because on this machine `localhost:5173` can reach a different app.
- `npm test`: unit tests (Vitest).
- `npm run typecheck`: `vue-tsc --noEmit`.
- `npm run build`: type-check and production build into `dist/` (base path `/royal-game-ur/`; the dev server uses `/`).
- `npm run icons`: regenerate the PNG icons and favicon in `public/` from `public/icon.png` (the rosette tile; left out of the offline cache) (config in `pwa-assets.config.ts`). Commit the generated files.

**Windows gotcha:** Vitest fails with `Cannot read properties of undefined (reading 'config')` when it is started from a lowercase drive path (`c:\...`), which is what Git Bash and VS Code terminals may give. Run it from `C:\Users\...` (for example `Set-Location 'C:\Users\boasb\source\royal-game-ur'` in PowerShell).

## Code layout

- `src/game/rules.ts`: `RuleConfig`, board geometry (rosettes, gaps, paths) and `FINKEL_RULES`.
- `src/game/engine.ts`: pure, immutable game logic: `newGame`, `applyRoll`, `legalMoves`, `applyMove`, `passTurn`. Piece position 0 = waiting at the start, 1..14 = path square, 15 = borne off.
- `src/game/ai.ts`: heuristic computer opponent (`chooseMove`).
- `src/game/engine.test.ts`: rule tests plus a computer-vs-computer full-game check.
- `src/App.vue`: turn flow, messages, and the timer that drives the computer's turns. Shows `GameBoard3D` when WebGL is available, otherwise `GameBoard`.
- `src/components/GameBoard3D.vue`: the 3D board (Three.js). Same props and `select` event as `GameBoard`. The board is extruded from its outline and is as high as a square is wide; the top is a canvas texture painted from the same tile artwork and `TILE_LAYOUT` (highlights are painted into it too), the sides use a procedural sandstone texture. The camera is fitted to the canvas and looks down from the front at `ELEVATION`/`AZIMUTH`. It renders on demand (no animation loop), and taps are raycast to a square.
- `src/components/GameBoard.vue`: the flat 2D board (fallback without WebGL), drawn upright for portrait screens (board columns are screen rows; black's lane on the left, white's on the right). Its `TILE_LAYOUT` places the patterned tiles; rosettes come from the rule config. Each square has a lapis frame, so neighbouring frames form the grout lines.
- `src/assets/board/`: the tile images (240 px JPEG crops from `artwork/`).

## Targets

- **Primary:** Android phones (portrait phone layout comes first), then Android tablets.
- **Secondary:** iOS, desktop browsers, Windows, Linux.
- Design mobile-first: touch input, small screens, and offline play once installed.

## Tech stack

- **PWA** (installable, works offline): `vite-plugin-pwa` generates the manifest and a Workbox service worker that precaches the whole app; `registerType: autoUpdate`. Configured in `vite.config.ts`.
- **UI:** Vue 3 (`<script setup>`) + TypeScript + Vite. Tests use Vitest.
- **3D:** Three.js (plain, no Vue wrapper). It is the bulk of the JS bundle (about 175 KB gzipped).
- **Hosting:** GitHub Pages (static build only, no backend). Configure the build's base path to match the repo's Pages URL.

## Guidelines

- Keep the game rules and state logic in plain TypeScript, separate from the UI, so they can be unit-tested without the framework.
- **Rules:** the default is the **Finkel rule set**. [RuleOfTheGame.md](RuleOfTheGame.md) is the source of truth for the rules, the variants and the configurable rule parameters. Don't hard-code the rules; drive them from a rule configuration object.
- Board layout: 20 squares (a 3×4 block, a 1×2 bridge, and a 3×2 block), 7 pieces per player, and four binary tetrahedral dice (rolls of 0–4).
