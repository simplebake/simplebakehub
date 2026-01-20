import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export type ContentType = 'premixes' | 'tutorials' | 'community_bakes' | 'dashboard_sections';

export interface VisibilitySetting {
  id: string;
  content_type: ContentType;
  content_id: string | null;
  section_key: string | null;
  is_visible: boolean;
  visible_to_roles: string[];
  visible_to_users: string[];
  hidden_from_users: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UseContentVisibilityReturn {
  settings: VisibilitySetting[];
  loading: boolean;
  isContentVisible: (contentType: ContentType, contentId?: string, sectionKey?: string) => boolean;
  refetch: () => Promise<void>;
}

export function useContentVisibility(): UseContentVisibilityReturn {
  const [settings, setSettings] = useState<VisibilitySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { role } = useUserRole();

  const fetchSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const { data, error } = await supabase
        .from('content_visibility_settings')
        .select('*');

      if (error) throw error;
      setSettings((data || []) as VisibilitySetting[]);
    } catch (error) {
      console.error('Error fetching visibility settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const isContentVisible = useCallback((
    contentType: ContentType,
    contentId?: string,
    sectionKey?: string
  ): boolean => {
    // Find matching setting - most specific first
    const matchingSetting = settings.find(s => {
      if (s.content_type !== contentType) return false;
      
      // Exact match for content_id or section_key
      if (contentId && s.content_id === contentId) return true;
      if (sectionKey && s.section_key === sectionKey) return true;
      
      // Global setting for content type (no specific id or key)
      if (!s.content_id && !s.section_key) return true;
      
      return false;
    });

    // No setting means visible by default
    if (!matchingSetting) return true;

    // Check if explicitly hidden
    if (!matchingSetting.is_visible) return false;

    // Check if user is explicitly hidden
    if (userId && matchingSetting.hidden_from_users.includes(userId)) return false;

    // If specific roles are set, check if user's role is included
    if (matchingSetting.visible_to_roles.length > 0) {
      if (!role || !matchingSetting.visible_to_roles.includes(role)) {
        // Check if user is explicitly allowed
        if (!userId || !matchingSetting.visible_to_users.includes(userId)) {
          return false;
        }
      }
    }

    // If specific users are set (and roles empty), only those users can see
    if (matchingSetting.visible_to_roles.length === 0 && matchingSetting.visible_to_users.length > 0) {
      if (!userId || !matchingSetting.visible_to_users.includes(userId)) {
        return false;
      }
    }

    return true;
  }, [settings, userId, role]);

  return {
    settings,
    loading,
    isContentVisible,
    refetch: fetchSettings,
  };
}
