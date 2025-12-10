-- Create customer_messages table for feedback and support requests
CREATE TABLE public.customer_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('feedback', 'help', 'bug', 'suggestion')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;

-- Users can insert their own messages (even anonymous users can submit)
CREATE POLICY "Anyone can submit messages"
ON public.customer_messages
FOR INSERT
WITH CHECK (true);

-- Users can view their own messages
CREATE POLICY "Users can view their own messages"
ON public.customer_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.customer_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update message status
CREATE POLICY "Admins can update messages"
ON public.customer_messages
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete messages
CREATE POLICY "Admins can delete messages"
ON public.customer_messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_customer_messages_updated_at
BEFORE UPDATE ON public.customer_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();