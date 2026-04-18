# Iron Keeper — Active Plan

> **Read this file at the start of every session** before making changes. It records ongoing work, decisions, and constraints that are not derivable from the code alone.

## Current Status

PR feature is **complete** as of this session:
- `PRCelebration.tsx` — particle burst overlay rendered after any new-PR set tick
- `WorkoutSession.tsx` — PR detection via `historicalPRsRef` + `sessionBestRef`, renders `<PRCelebration>`
- `Progress.tsx` — swipe-to-delete on PR rows via `PRSwipeRow` component; uses `deletePersonalRecord(setId)`
- `cloud-data.ts` — `fetchPersonalRecords` returns `setId` per entry; `deletePersonalRecord(setId)` added

## Core Architecture Constraints

- **No custom server.** Everything is Supabase (Postgres + RLS + Auth). No edge functions needed — Lovable deploys on push.
- **localStorage for in-progress data:** Active workout session, custom workouts, and user preferences all live in localStorage. Supabase is write-on-complete only for workouts.
- **Static exercise data:** `exercise-library.ts`, `exercise-substitutions.ts`, `accessory-routines.ts`, `stretching-data.ts`, `training-splits.ts` are all in-code. Changes require a deploy, not a DB migration.
- **LucideIcon serialization bug:** Icons stored in localStorage become `{}`. `getAllCustomWorkouts()` patches `icon: Dumbbell` on every load. Any new icon-storing feature must do the same.
- **Swipe-to-delete pattern:** Use `useTransform(x, [-100, -30], [1, 0])` for bg opacity. Never use a fully-opaque absolute bg div behind a transparent sliding div — it bleeds through.
- **Exercise ID stability:** IDs like `lib-db-Dumbbell_Flyes` are permanent even if the display name changed (`Flyes`→`Flies`). Never rename IDs.
- **Substitution key sync:** `exercise-substitutions.ts` keys must match `workout-data.ts` exercise IDs exactly.

## Key Files to Check When Starting Work

| What | Where |
|------|-------|
| Workout definitions (static) | `src/lib/workout-data.ts` |
| Exercise catalogue | `src/lib/exercise-library.ts` |
| Swap options | `src/lib/exercise-substitutions.ts` |
| All Supabase ops | `src/lib/cloud-data.ts` |
| Active session page | `src/pages/WorkoutSession.tsx` |
| History cards | `src/components/history/WorkoutCard.tsx` |
| Home week strip | `src/components/WeekStrip.tsx` |
| Progress & PRs | `src/pages/Progress.tsx` |
| Food tracker | `src/pages/FoodTracker.tsx` |
| Auth context | `src/hooks/useAuth.tsx` |
| Role routing | `src/hooks/useUserRole.tsx` |

## Established Patterns

- **Swipe-to-delete:** Used in WorkoutSession (exercise cards), WorkoutCard (history), WeekStrip, WorkoutBuilder, Progress (PR rows). Always: `useMotionValue(0)` + `useTransform(x, [-100,-30],[1,0])` for bg opacity.
- **Search pools:** `ALL_SWAP_EXERCISES` in WorkoutSession and `ALL_EXERCISES` in WorkoutBuilder are built at module load from WORKOUTS + ACCESSORY_ROUTINES + EXERCISE_LIBRARY (deduplicated by lowercase name).
- **Toasts:** `sonner` only — `import { toast } from "sonner"`.
- **Overlays/drawers:** `Sheet` (shadcn bottom drawer), not `Dialog`.
- **Haptics:** `hapticMedium()` on set complete, `hapticSuccess()` on PR / save.

## Backlog / Ideas (not committed)

- Coach dashboard features (bulk session assignment, athlete progress view)
- Nutrition: weekly macro trend charts
- Workout templates / programme scheduling UI
- Push notifications for rest timer
- Barbell plate calculator overlay

## Git Reminder

```bash
git stash && git pull --rebase origin main && git stash pop  # before editing
git stash && git pull --rebase origin main && git stash pop && git push origin main  # to push
```
