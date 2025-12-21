-- Create content reports table for community reporting
CREATE TABLE public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('bake_share', 'comment')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'harassment', 'misinformation', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reporter_id, content_type, content_id)
);

-- Enable RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.content_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.content_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins and moderators can view all reports
CREATE POLICY "Staff can view all reports"
ON public.content_reports
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role]));

-- Admins and moderators can update reports
CREATE POLICY "Staff can update reports"
ON public.content_reports
FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role]));

-- Only admins can delete reports
CREATE POLICY "Admins can delete reports"
ON public.content_reports
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_content_reports_updated_at
BEFORE UPDATE ON public.content_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();