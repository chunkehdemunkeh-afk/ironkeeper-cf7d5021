-- Add extended nutrition columns to food_logs and favourite_foods.
-- All nullable so existing rows are unaffected.

ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS sugar_g          NUMERIC,
  ADD COLUMN IF NOT EXISTS fibre_g          NUMERIC,
  ADD COLUMN IF NOT EXISTS saturated_fat_g  NUMERIC,
  ADD COLUMN IF NOT EXISTS salt_g           NUMERIC;

ALTER TABLE public.favourite_foods
  ADD COLUMN IF NOT EXISTS sugar_g          NUMERIC,
  ADD COLUMN IF NOT EXISTS fibre_g          NUMERIC,
  ADD COLUMN IF NOT EXISTS saturated_fat_g  NUMERIC,
  ADD COLUMN IF NOT EXISTS salt_g           NUMERIC;
