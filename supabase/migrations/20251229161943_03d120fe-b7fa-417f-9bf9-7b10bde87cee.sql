-- Create performance goal history table for tracking trends
CREATE TABLE public.performance_goal_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.performance_goals(id) ON DELETE CASCADE,
  recorded_value NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_goal_history_goal_id ON public.performance_goal_history(goal_id);
CREATE INDEX idx_goal_history_recorded_at ON public.performance_goal_history(recorded_at);

-- Enable RLS
ALTER TABLE public.performance_goal_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view history
CREATE POLICY "Admins can view goal history"
ON public.performance_goal_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert history (for edge function)
CREATE POLICY "Service role can insert goal history"
ON public.performance_goal_history
FOR INSERT
WITH CHECK (true);

-- Admins can delete old history
CREATE POLICY "Admins can delete goal history"
ON public.performance_goal_history
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));