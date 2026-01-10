# Experiments - Consolidated Next.js App

This is a consolidated Next.js 15 application that brings together ALL your experiments (001-032) into a single codebase with shared dependencies.

## Quick Start

```bash
cd exp
npm run dev
```

Visit http://localhost:3000

## What's Migrated

### ✅ ALL 32 Experiments Migrated

**Next.js Experiments** (Fully migrated to Next.js App Router):
- **001** - Glass Button
- **002** - Liquid Glass
- **008** - Light Card
- **009** - Animated Text
- **012** - Chat Interface (AI SDK)
- **013** - Chat Interface variant
- **014** - Chat Interface variant
- **031** - Agent Loop (Spline 3D)

**Static HTML Experiments** (Served through Next.js):
- **003-007, 010, 011, 015-020, 022-030, 032** - All static experiments accessible via redirect pages

All Next.js experiments now share:
- React 19
- Next.js 15.5.9
- Tailwind CSS 4
- AI SDK
- OpenAI integration
- Framer Motion
- Spline React

### API Routes
- `/api/reading-list` - Full CRUD for reading list (from exp 021)
  - GET - Fetch all links
  - POST - Add new link
  - PUT `/api/reading-list/:id` - Update link
  - DELETE `/api/reading-list/:id` - Delete link

## Structure

```
exp/
├── app/
│   ├── 001-032/      # All experiments (31 total, no 025)
│   ├── api/
│   │   └── reading-list/  # Reading list API
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Index page with experiment grid
├── public/
│   └── static/       # Static HTML experiments
├── registry/         # Shared UI components (TextAnimate, etc)
├── data/            # Data files (reading-list.json)
├── .env.local       # Environment variables (OPENAI_API_KEY)
└── package.json     # Shared dependencies (single source)

## Benefits

1. **Single node_modules** - Saves ~5-8GB disk space (was 32 separate node_modules)
2. **Shared dependencies** - One source of truth for all package versions
3. **Shared .env** - All API keys in one place
4. **Consistent tooling** - Same Next.js, TypeScript, ESLint config across all experiments
5. **Easy to extend** - Add new experiments as routes
6. **Unified dev server** - All experiments accessible from one server

## Next Steps

### To Migrate More Experiments

1. Copy the source code to `app/[exp-number]/page.tsx`
2. Remove duplicate `layout.tsx` and `globals.css`
3. Update any import paths if needed
4. Restart dev server

### To Deploy

This can be deployed to Vercel alongside your main portfolio:
- Main portfolio stays at root (`/`)
- Experiments accessible at `/exp/*` (with proper routing config)

## Original Locations

Original experiments remain in `/public/exp/` for reference. You can safely delete those once you've verified the migrated versions work.
