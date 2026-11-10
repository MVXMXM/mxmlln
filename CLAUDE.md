# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

> **Design system:** Before designing or generating any new UI, read `content/system.mdx` — the reference for color/type/radius/elevation/motion tokens, chrome components (logo, nav, minimap), and the `registry/` primitives. It renders at the unlisted `/system` route (`app/system/`). `app/globals.css` is the canonical source for token values: when the code and the doc disagree, the code wins — update `content/system.mdx` to match.
>
> **Decks:** Before authoring or editing presentation slides, read `app/decks/README.md` — the deck visual system (type specs, the lowercase-handwritten rule, slide archetypes, logo-border bookends) and how to add a deck/slide.

## Project Overview

Personal design portfolio of Maximillian Piras — product design (UX/UI) for tech startups, focused on AI, with roots in branding, animation, & illustration.

- **Live site**: https://www.maximin.design
- **Stack**: Next.js (App Router) + React + TypeScript + Tailwind v4. Storage via Vercel Postgres. AI via the Vercel AI SDK (`ai` + `@ai-sdk/openai`) and `OPENAI_API_KEY`.
- **Deployment**: Vercel (auto-deploys on push to `main`).

## Architecture

One Next.js app. New work goes in `app/` and `app/api/`.

- **Next.js `app/`** — routes (`blog`, `decks`, `system`, `experiments`) and API routes. Homepage chat is `app/api/openai/meta` (returns `{ AiResponse }` as a JSON string for the legacy homepage). `app/api/submit` stores input in Postgres. `app/api/reading-list` serves the reader. `app/api/chat` is the separate streaming chat.
- **Design system** — `content/system.mdx` (doc) + `registry/` (primitives) + `app/globals.css` (canonical tokens). See the banner above.
- **Legacy homepage** — the interactive card-stack at `/` is static on purpose, rewritten in `next.config.ts` to `public/portfolio.html`. Its logic lives in `public/` (`FolioEngine.js`, `NavBar.js`, `ChatIntelligence.js`) — vanilla JS + jQuery, no bundler. Leave it until a real redesign.
- **Experiments** — the Interaction Sketchbook at `/experiments` iframes published snapshots in `public/static/NNN` and Next pages under `app/experiments/`. New interactive work lives in `app/experiments/<name>`. A frozen piece is one HTML snapshot under `public/static/`. Do not add a `package.json` under `public/`. Older prototype source is archived in `archive/exp/` and is not deployed.

## Development

```bash
npm run dev     # Next.js dev server (Turbopack) on http://localhost:3000
npm run build   # production build
npm run lint    # lint
```

## Conventions

### Copy

In user-facing copy, prefer ampersands over "and" (e.g. "animation & illustration").

### Code comments

Explain **why**, never **what**. No narration, no restating the code, no commented-out code. Add a comment only for non-obvious rationale, constraints, gotchas, sync points ("keep in sync with X"), or public API docs. Default sparse and let good names carry the meaning; match the surrounding file's density.

### Pull requests

- **Title**: imperative mood, ≤72 chars, no trailing period (e.g. `Reader: add Muon optimizer link`).
- **Description**: one sentence if possible, focused on *why* the change was made — not the low-level details, which the code & diff already explain. Less, but better; expand only when the change genuinely needs it. Link related issues.

## Environment & deployment

- Env (set in Vercel / local `.env`): `OPENAI_API_KEY` for chat, Vercel Postgres credentials for stored input.

## Testing

No automated test suite — verify manually in the browser. Check card-stack interactions (hover/expand/collapse), video playback across Safari and Chrome, homepage chat (`/api/openai/meta` still renders a card), the reader, and the design-system routes.
