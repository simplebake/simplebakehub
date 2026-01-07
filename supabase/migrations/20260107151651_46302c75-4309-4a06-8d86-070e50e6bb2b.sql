-- Drop integration health monitoring tables (no longer needed after removing shop feature)
DROP TABLE IF EXISTS public.integration_health CASCADE;
DROP TABLE IF EXISTS public.integration_alerts CASCADE;