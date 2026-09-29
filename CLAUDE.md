# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

> **Design system:** Before designing or generating any new UI, read `content/system.mdx` — the reference for color/type/radius/elevation/motion tokens, chrome components (logo, nav, minimap), and the `registry/` primitives. It renders at the unlisted `/system` route (`app/system/`). `app/globals.css` is the canonical source for token values: when the code and the doc disagree, the code wins — update `content/system.mdx` to match.
>
> **Decks:** Before authoring or editing presentation slides, read `app/decks/README.md` — the deck visual system (type specs, the lowercase-handwritten rule, slide archetypes, logo-border bookends) and how to add a deck/slide.

## Project Overview

Personal design portfolio of Maximillian Piras — product design (UX/UI) for tech startups, focused on AI, with roots in branding, animation, & illustration.

- **Live site**: https://www.maximin.design
- **Stack**: Next.js (App Router) + React + TypeScript + Tailwind v4, with a legacy Express handler still serving some endpoints. Storage via Vercel Postgres.
- **Deployment**: Vercel (auto-deploys on push to `main`).

## Architecture

This is a **hybrid** app — a modern Next.js surface layered over the original vanilla portfolio:

- **Next.js `app/`** — newer routes (`blog`, `decks`, `system`, `sebastian`, `experiments`), the design system, and Next API routes (`app/api/chat`). For AI work here, use the Vercel AI SDK (`ai` + `@ai-sdk/openai`), as `app/api/chat` does.
- **Design system** — `content/system.mdx` (doc) + `registry/` (primitives) + `app/globals.css` (canonical tokens). See the banner above.
- **Legacy portfolio** — the interactive card-stack homepage is static and served at `/` via a rewrite in `next.config.ts` (`/` → `public/portfolio.html`). Its logic lives in `public/` (`FolioEngine.js`, `NavBar.js`, `ChatIntelligence.js`, `CardStack.js`) — vanilla JS + jQuery, no bundler. Treat as legacy; prefer the Next.js surface for new work.
- **Legacy Express** — `api/index.js` + `controllers/openaiController.js` (which calls the OpenAI API directly, not the AI SDK) still serve `/api/openai/*`, `/api/submit`, and `/api/reading-list` on Vercel (wired in `vercel.json`).
- **Experiments** — `public/exp/NNN` holds independent numbered prototypes (standalone HTML or their own Next/React apps), each with its own `package.json` and `node_modules`.

## Development

```bash
npm run dev     # Next.js dev server (Turbopack) on http://localhost:3000
npm run build   # production build
npm run lint    # lint

# An experiment:  cd public/exp/NNN && npm run dev  (or npm start for CRA-based ones)
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

- Env (set in Vercel / local `.env`): OpenAI API key for chat, Vercel Postgres credentials for stored input.
- `vercel.json` rewrites the listed `/api/*` paths to the Express handler; everything else is handled by Next.js.

## Testing

No automated test suite — verify manually in the browser. Check card-stack interactions (hover/expand/collapse), video playback across Safari and Chrome, AI chat responses, and the design-system routes.
