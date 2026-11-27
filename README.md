# ClipSpill

ClipSpill turns viewer questions into ideas for YouTube Shorts and Instagram Reels. The Phase 1 workspace contains the Next.js shell, comment engine, Prisma schema, and browser test gate.

## Run locally

```sh
npm install
npx playwright install chromium
npm run dev
```

Open http://localhost:3000. To use an existing Chromium-based browser for tests, set `PLAYWRIGHT_CHROME` to its executable path.

## Phase 1 gate

```sh
npm run typecheck
npm run lint
npx playwright test tests/phase1-engine.spec.ts
```

Playwright starts a local Next.js server and uses deterministic fixture comments. The test endpoint exists only in development with both test flags enabled by the runner. The gate requires access to the local server over loopback.

## MySQL setup

Copy `.env.example` to `.env`, set `DATABASE_URL` to a development MySQL database, then run `npm run db:generate` and `npm run db:push`. Add YouTube and Gemini keys before connecting live data. The current app shell does not call either service. The schema defines database storage for directories, viewer comments, batch indices, topic assignments, and digests.

## Source

```text
app/                         Next.js shell and fixture-only test route
lib/comments/                Question filter, clustering and Growth Mode selection
lib/youtube/                 URL normalization and quota-aware YouTube client
lib/niches.ts                 Niche keywords and suggested creators
prisma/schema.prisma          MySQL data model
tests/phase1-engine.spec.ts   Playwright gate
```
