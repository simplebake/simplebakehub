
CREATE TABLE public.feeding_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  starter_name TEXT NOT NULL DEFAULT 'My Starter',
  flour_type TEXT NOT NULL DEFAULT 'Rice Flour',
  flour_amount_g NUMERIC NOT NULL DEFAULT 50,
  water_amount_g NUMERIC NOT NULL DEFAULT 50,
  temperature_celsius NUMERIC,
  humidity_percent INTEGER,
  rise_percentage NUMERIC,
  peak_hours NUMERIC,
  notes TEXT,
  fed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feeding_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feeding logs"
ON public.feeding_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feeding logs"
ON public.feeding_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feeding logs"
ON public.feeding_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feeding logs"
ON public.feeding_logs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feeding logs"
ON public.feeding_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
