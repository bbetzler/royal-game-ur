# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

An implementation of the **Royal Game of Ur**, an ancient Mesopotamian race board game (c. 2600 BCE). Rules references are listed in [README.md](README.md). Use them for rule questions instead of guessing.

## Current state

The project is just starting. The repo holds only `README.md` and this file, with no code or build tooling yet. GitHub repo: https://github.com/bbetzler/royal-game-ur (public, default branch `main`). Update this file as decisions are made and structure appears (commands, folders, conventions).

## Targets

- **Primary:** Android phones (portrait phone layout comes first), then Android tablets.
- **Secondary:** iOS, desktop browsers, Windows, Linux.
- Design mobile-first: touch input, small screens, and offline play once installed.

## Tech stack

- **PWA** (installable, works offline: service worker + web app manifest).
- **UI framework:** Vue or React. **Not decided yet.** Ask before picking one.
- **Hosting:** GitHub Pages (static build only, no backend). Configure the build's base path to match the repo's Pages URL.

## Guidelines

- Keep the game rules and state logic in plain TypeScript, separate from the UI, so they can be unit-tested without the framework.
- Rule sets differ between sources (e.g. Finkel's rules vs. other reconstructions). Make the active rule set explicit and configurable rather than hard-coding one variant silently.
- Board layout: 20 squares (a 3×4 block, a 1×2 bridge, and a 3×2 block), 7 pieces per player, and four binary tetrahedral dice (rolls of 0–4).
