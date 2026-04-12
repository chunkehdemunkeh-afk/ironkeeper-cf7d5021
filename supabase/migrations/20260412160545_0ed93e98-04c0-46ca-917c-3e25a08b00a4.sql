CREATE TABLE public.water_intake (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_ml INTEGER NOT NULL DEFAULT 250,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own water intake"
ON public.water_intake FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own water intake"
ON public.water_intake FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own water intake"
ON public.water_intake FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Coach can view all water intake"
ON public.water_intake FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'coach'::app_role));