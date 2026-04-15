
CREATE TABLE public.daily_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  calories integer NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  water_ml integer NOT NULL DEFAULT 0,
  calorie_goal integer NOT NULL DEFAULT 0,
  protein_goal_g numeric NOT NULL DEFAULT 0,
  carbs_goal_g numeric NOT NULL DEFAULT 0,
  fat_goal_g numeric NOT NULL DEFAULT 0,
  water_goal_ml integer NOT NULL DEFAULT 0,
  weight_kg numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily logs"
  ON public.daily_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily logs"
  ON public.daily_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily logs"
  ON public.daily_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily logs"
  ON public.daily_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Coach can view all daily logs"
  ON public.daily_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'coach'));
