# Reach

**Find the audience that actually wants your app.**

Reach is a GTM tool for devs who built an app and now need to find and reach the *right* audience and turn it into revenue. It pairs two things:

1. **Audience discovery (research)** — given your app, find where its real users already hang out, what they complain about, what they'd pay, and how they describe the problem in their own words.
2. **Distribution** — draft platform-native posts and ship them to the top-ranked communities, then capture signals back into a per-project dashboard.

## Status

Pioneer cohort — **free while building**. Niche scope: apps with a findable niche audience (dev tools, prosumer, vertical SaaS).

## Stack

- Next.js 16 (App Router, Turbopack, Server Actions, Route Handlers)
- TypeScript end to end
- Tailwind CSS v4
- Supabase (Postgres + Auth) — wiring in next brick
- Anthropic / OpenAI for the research agent
- Stripe (wired but disabled at launch)

## Getting started

```bash
cp .env.example .env.local   # all keys optional during scaffolding
npm install
npm run dev
```

## Project layout

```
src/
  app/        routes, layouts, page UI
  lib/        cross-cutting code (env, db, agent, research)
```

## Architecture (target)

```
/app            → Next.js routes (onboarding, projects, report view, dashboard)
/lib/agent      → TS agent orchestration (tools: web search, reddit, hn)
/lib/research   → report synthesis, evidence ranking, verdict logic
/lib/db         → Postgres access (projects, runs, reports, posts, signals)
/jobs           → async research runner (queued background work)
```

## Engineering rules for this repo

- Agile bricks: small, self-contained, individually committed.
- Every brick must pass `npm run lint` and `npm run build`.
- v16 conventions: `proxy.ts` (not middleware), async `cookies()` / `headers()` / `params` / `searchParams`, `PageProps<'/path'>` helpers.