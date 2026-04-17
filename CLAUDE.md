# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run Vitest (single run)
npm run test:watch   # Vitest in watch mode
npx supabase db push # Apply DB migrations to Supabase
```

## Architecture

**Iron Keeper** is a React + TypeScript PWA for fitness and nutrition tracking, deployed via the Lovable platform (auto-deploys on git push to `main`).

**Stack:**
- Frontend: React 18, Vite/SWC, TailwindCSS, shadcn/ui (Radix UI), Framer Motion, Recharts
- Fonts: Barlow Condensed (display/headings) + DM Sans (body) via Google Fonts — defined in `src/index.css` and `tailwind.config.ts`
- Backend: Supabase (Postgres + Auth + RLS), no custom server
- State: TanStack React Query for server state; React Context for auth
- Forms: React Hook Form + Zod

**Key data flow:**
- `src/hooks/useAuth.tsx` — Supabase auth context, wraps the entire app
- `src/hooks/useUserRole.tsx` — Detects coach vs. member role, drives routing in `Index.tsx`
- `src/lib/cloud-data.ts` — All Supabase read/write operations (workout history, food logs, profiles)
- `src/lib/workout-data.ts` — Static workout definitions + localStorage for in-progress sessions
- `src/integrations/supabase/client.ts` — Supabase JS client singleton

**Routing** is in `src/App.tsx`. All routes are protected by auth guards. `Index.tsx` does role-based redirect (coach → CoachDashboard, member → home).

**Database tables** (all with RLS, scoped per user):
- `profiles` — user display info
- `workout_history` — completed workout sessions
- `workout_sets` — individual sets per session
- `food_logs` — nutrition entries (includes extended nutrition: sugar, fiber, barcode)

Migrations live in `supabase/migrations/` and must be pushed with `npx supabase db push`.

## Git Workflow

Lovable and the auto-changelog GitHub Action push to `main` frequently, so a plain `git push` will almost always be rejected. Always use:

```bash
git stash && git pull --rebase origin main && git stash pop && git push origin main
```

`package-lock.json` is perpetually dirty locally (no `node_modules` in the repo) — `git stash` handles it. Never commit `package-lock.json` changes.

**PWA updates:** `main.tsx` polls `index.html` every 60s and triggers a reload when the hash changes. The service worker at `public/sw.js` also polls for updates. The auto-changelog workflow (`.github/workflows/auto-changelog.yml`) updates `src/lib/changelog.ts` on every push to `main`.

**Food data** comes from the Open Food Facts API (`src/lib/open-food-facts.ts`) including barcode lookup. Extended nutrition fields are fetched synchronously at log time to guarantee they're saved.
