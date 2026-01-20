-- Add new permission for content visibility management
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'can_manage_visibility';