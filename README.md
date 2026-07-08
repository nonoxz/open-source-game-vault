# Open Source Game Vault

A browser-based launcher for preserving and running classic game engines whose source code has been released, while keeping commercial game data separate.

The project is intentionally legal-first:

- Engine/source code and source-port metadata can live in the app.
- Commercial assets such as WAD, PAK, PK3, GRP, BIG, MIX, maps, sounds, and art are uploaded by the user locally.
- Uploaded files are stored in the browser with IndexedDB and are not sent to a server.
- Each game is represented by a manifest entry that declares its source, license boundary, expected assets, and runner status.

## Current MVP

- React + Vite app shell.
- Catalog for Wolfenstein 3D, Doom/Freedoom, Quake I/II/III, Micropolis, Command & Conquer/Red Alert, Homeworld, Prince of Persia, Marathon, and Duke Nukem 3D.
- Local asset vault with upload, extension filtering, persistent IndexedDB storage, file counts, sizes, and delete actions.
- Sandboxed iframe runner model.
- Built-in Micropolis planning sandbox runner as a functional proof of execution.
- Source links and legal/technical notes per game.

## What Runs Today

The included `public/runners/micropolis/index.html` runner is a small local planning sandbox that demonstrates the runner contract. It is not the full Micropolis engine yet.

Other games are wired as adapter slots. They can accept local assets now, but their full WebAssembly/source-port runners still need to be compiled and attached.

## Add A Real Runner

1. Compile or provide a browser-safe build for the engine.
2. Place it under `public/runners/<game-id>/index.html`.
3. Add `runnerPath: '/runners/<game-id>/index.html'` in `src/data/games.ts`.
4. Keep commercial data out of the repository. Read it from browser storage, drag-and-drop, or a user-provided file picker.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The output is a static site in `dist/`, suitable for GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any static host.

## Deploy To GitHub Pages

The simplest path is to publish this repository and configure GitHub Pages to serve the Vite build output from your preferred deployment workflow.

A future improvement is to add a GitHub Actions workflow that runs `npm ci`, `npm run build`, and publishes `dist/` automatically.
