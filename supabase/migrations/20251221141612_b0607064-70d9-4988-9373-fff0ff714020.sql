-- Create webhook_logs table for tracking incoming and outgoing webhook calls
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  endpoint_url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  request_headers JSONB,
  request_payload JSONB,
  response_status INTEGER,
  response_body JSONB,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_webhook_logs_integration ON public.webhook_logs(integration_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_success ON public.webhook_logs(success);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhook_logs
CREATE POLICY "Admins can view webhook logs"
ON public.webhook_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert webhook logs"
ON public.webhook_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "No one can update webhook logs"
ON public.webhook_logs
FOR UPDATE
USING (false);

CREATE POLICY "Admins can delete old webhook logs"
ON public.webhook_logs
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create integration_health table for monitoring
CREATE TABLE public.integration_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id TEXT NOT NULL UNIQUE,
  integration_name TEXT NOT NULL,
  is_healthy BOOLEAN NOT NULL DEFAULT true,
  last_check_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integration_health ENABLE ROW LEVEL SECURITY;

-- RLS policies for integration_health
CREATE POLICY "Admins can view integration health"
ON public.integration_health
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage integration health"
ON public.integration_health
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger to update updated_at
CREATE TRIGGER update_integration_health_updated_at
BEFORE UPDATE ON public.integration_health
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create integration_alerts table for tracking alerts sent
CREATE TABLE public.integration_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('connection_failed', 'high_latency', 'recovered', 'degraded')),
  message TEXT NOT NULL,
  notified_users UUID[] DEFAULT '{}',
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integration_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for integration_alerts
CREATE POLICY "Admins can view alerts"
ON public.integration_alerts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update alerts"
ON public.integration_alerts
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert alerts"
ON public.integration_alerts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can delete alerts"
ON public.integration_alerts
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));