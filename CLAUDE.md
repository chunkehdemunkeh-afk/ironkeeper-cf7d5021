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
- Fonts: Barlow Condensed (display/headings) + DM Sans (body) via Google Fonts — defined in `src/index.css` and `tailwind.config.ts`. Use `font-display` Tailwind class for headings/numbers, default for body.
- Backend: Supabase (Postgres + Auth + RLS), no custom server
- State: TanStack React Query for server state; React Context for auth
- Forms: React Hook Form + Zod

**Key data flow:**
- `src/hooks/useAuth.tsx` — Supabase auth context, wraps the entire app
- `src/hooks/useUserRole.tsx` — Reads `user_roles` table; `isCoach` drives routing in `Index.tsx` (coach → CoachDashboard, member → home)
- `src/lib/cloud-data.ts` — All Supabase read/write operations (workout history, food logs, profiles, body measurements)
- `src/lib/workout-data.ts` — Static workout definitions + localStorage for in-progress sessions
- `src/lib/user-preferences.ts` — User split/schedule/onboarding stored in **localStorage** under `ik-prefs-{userId}` (not Supabase)
- `src/integrations/supabase/client.ts` — Supabase JS client singleton

**Routing** is in `src/App.tsx`. All routes are protected by auth guards. `Index.tsx` does role-based redirect.

**Pages:**
- `Sessions` — browse and start workout sessions
- `WorkoutSession` — active workout tracker (sets, reps, rest timer, exercise swap)
- `WorkoutBuilder` — create custom workouts; stored in **localStorage** under `ironkeeper_custom_workouts`
- `ExerciseLibrary` — browsable exercise index; data is static in `src/lib/exercise-library.ts`
- `FoodTracker` — nutrition logging with barcode scan, meal groups, weekly chart
- `History` — past workout log
- `Progress` — charts and streaks
- `BodyMeasurements` — weight + body fat log with trend chart
- `Profile` — settings, preferences, onboarding re-entry

**Database tables** (all with RLS, scoped per user):
- `profiles` — display name and user info
- `workout_history` — completed workout sessions
- `workout_sets` — individual sets per session
- `food_logs` — nutrition entries (includes extended nutrition: sugar, fiber, saturated fat, salt, barcode)
- `nutrition_goals` — per-user calorie, macro, and water targets
- `water_intake` — daily water entries
- `body_measurements` — weight and body fat readings
- `daily_logs` — daily completion/notes log
- `user_roles` — coach vs. member role (`role` column, checked by `useUserRole`)

Migrations live in `supabase/migrations/` and must be pushed with `npx supabase db push`.

**Static data (in-code, not DB):**
- `src/lib/exercise-library.ts` — full exercise catalogue
- `src/lib/exercise-substitutions.ts` — per-exercise swap options
- `src/lib/accessory-routines.ts` — accessory workout definitions and substitutions
- `src/lib/stretching-data.ts` — stretching/recovery routines
- `src/lib/training-splits.ts` — built-in programme splits

## UX Conventions

- **Overlays:** use shadcn `Sheet` (bottom drawer), not `Dialog`, for overlays and detail views.
- **Toasts:** use `sonner` (`import { toast } from "sonner"`) for all user feedback.
- **Haptics:** call `hapticMedium()` / `hapticSuccess()` from `src/lib/haptics.ts` on significant interactions (set completion, save, delete). Uses the Vibration API — no-ops on desktop.
- **Swipe gestures:** Framer Motion `drag="x"` with `dragConstraints` — already used in `WorkoutSession` and `FoodTracker`. Pair with `touchAction: "pan-y"` to preserve vertical scroll.
- **Animations:** Framer Motion throughout — page transitions, list reordering (`Reorder`), collapse/expand. Keep motion consistent with existing patterns.

## Git Workflow

Lovable and the auto-changelog GitHub Action push to `main` frequently. **Always pull before editing files** and before pushing:

```bash
# Before starting any edits:
git stash && git pull --rebase origin main && git stash pop

# To push changes:
git stash && git pull --rebase origin main && git stash pop && git push origin main
```

`package-lock.json` is perpetually dirty locally (no `node_modules` in the repo) — `git stash` handles it. Never commit `package-lock.json` changes.

**Never commit** `.claude/` or `.playwright-mcp/` — both are untracked local tooling directories.

**PWA updates:** `main.tsx` polls `index.html` every 60s and triggers a reload when the hash changes. The service worker at `public/sw.js` also polls for updates. The auto-changelog workflow (`.github/workflows/auto-changelog.yml`) updates `src/lib/changelog.ts` on every push to `main`.

**Food data** comes from the Open Food Facts API (`src/lib/open-food-facts.ts`) including barcode lookup. Extended nutrition fields are fetched synchronously at log time to guarantee they're saved.
