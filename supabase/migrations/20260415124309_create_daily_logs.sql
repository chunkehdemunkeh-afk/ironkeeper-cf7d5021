-- Create daily_logs table to persist "Complete Day" snapshots
-- One row per user per date (upsert-safe via unique constraint)

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  calories integer not null default 0,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  water_ml integer not null default 0,
  calorie_goal integer not null default 0,
  protein_goal_g numeric(6,1) not null default 0,
  carbs_goal_g numeric(6,1) not null default 0,
  fat_goal_g numeric(6,1) not null default 0,
  water_goal_ml integer not null default 0,
  weight_kg numeric(5,2),
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

-- Enable RLS
alter table public.daily_logs enable row level security;

-- Users can only read/write their own rows
create policy "Users manage own daily logs"
  on public.daily_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
