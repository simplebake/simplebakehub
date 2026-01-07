-- Create content_ideas table
CREATE TABLE public.content_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  channel TEXT NOT NULL,
  next_action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  kpi TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_ideas
CREATE POLICY "Users can view their own content ideas"
ON public.content_ideas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content ideas"
ON public.content_ideas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content ideas"
ON public.content_ideas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content ideas"
ON public.content_ideas FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns"
ON public.campaigns FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns"
ON public.campaigns FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
ON public.campaigns FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
ON public.campaigns FOR DELETE
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_content_ideas_updated_at
BEFORE UPDATE ON public.content_ideas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();