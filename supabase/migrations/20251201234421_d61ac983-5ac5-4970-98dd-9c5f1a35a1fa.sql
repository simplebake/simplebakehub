-- Create table to store detailed baking sessions with environmental data
CREATE TABLE IF NOT EXISTS public.baking_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  premix_id UUID NOT NULL REFERENCES public.premixes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Outcome tracking
  success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 5),
  outcome_notes TEXT,
  
  -- Environmental data
  temperature_celsius DECIMAL(4,1),
  humidity_percent INTEGER CHECK (humidity_percent >= 0 AND humidity_percent <= 100),
  altitude_meters INTEGER,
  season TEXT CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
  
  -- Recipe adjustments made
  water_adjustment_ml INTEGER,
  oil_adjustment_ml INTEGER,
  proofing_time_adjustment_minutes INTEGER,
  baking_temp_adjustment_celsius INTEGER,
  
  -- Equipment used
  oven_type TEXT,
  mixing_method TEXT,
  
  -- Observed issues
  issues TEXT[],
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.baking_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own baking sessions"
  ON public.baking_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can create their own baking sessions"
  ON public.baking_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update their own baking sessions"
  ON public.baking_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all sessions (for analytics)
CREATE POLICY "Admins can view all baking sessions"
  ON public.baking_sessions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_baking_sessions_user_premix ON public.baking_sessions(user_id, premix_id);
CREATE INDEX idx_baking_sessions_created ON public.baking_sessions(created_at DESC);