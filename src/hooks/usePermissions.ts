import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export type AppPermission = 
  | 'can_view_analytics'
  | 'can_export_data'
  | 'can_manage_users'
  | 'can_manage_content'
  | 'can_view_audit_logs'
  | 'can_manage_security'
  | 'can_respond_messages'
  | 'can_delete_messages'
  | 'can_manage_tutorials'
  | 'can_manage_premixes'
  | 'can_manage_goals'
  | 'can_manage_visibility';

export const ALL_PERMISSIONS: { value: AppPermission; label: string; description: string }[] = [
  { value: 'can_view_analytics', label: 'View Analytics', description: 'Access analytics dashboards and reports' },
  { value: 'can_export_data', label: 'Export Data', description: 'Download data exports and reports' },
  { value: 'can_manage_users', label: 'Manage Users', description: 'View and modify user accounts and roles' },
  { value: 'can_manage_content', label: 'Manage Content', description: 'Moderate community content and reports' },
  { value: 'can_view_audit_logs', label: 'View Audit Logs', description: 'Access system audit trail' },
  { value: 'can_manage_security', label: 'Manage Security', description: 'Configure security settings and blocked IPs' },
  { value: 'can_respond_messages', label: 'Respond to Messages', description: 'Reply to customer support messages' },
  { value: 'can_delete_messages', label: 'Delete Messages', description: 'Remove customer messages' },
  { value: 'can_manage_tutorials', label: 'Manage Tutorials', description: 'Create and edit tutorial content' },
  { value: 'can_manage_premixes', label: 'Manage Premixes', description: 'Add and modify premix products' },
  { value: 'can_manage_goals', label: 'Manage Goals', description: 'Set and track performance goals' },
  { value: 'can_manage_visibility', label: 'Manage Visibility', description: 'Control content visibility settings for users' },
];

interface UsePermissionsReturn {
  permissions: AppPermission[];
  hasPermission: (permission: AppPermission) => boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useUserRole();

  const fetchPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPermissions([]);
        return;
      }

      // Fetch user's role permissions via secure RPC
      const { data: rolePerms } = await supabase
        .rpc('get_my_role_permissions');

      // Fetch user-specific overrides
      const { data: userPerms } = await supabase
        .from('user_permissions')
        .select('permission, granted')
        .eq('user_id', user.id);

      // Start with role permissions
      const rolePermSet = new Set<AppPermission>(
        (rolePerms || []).map(p => p.permission as AppPermission)
      );

      // Apply user overrides
      (userPerms || []).forEach(up => {
        if (up.granted) {
          rolePermSet.add(up.permission as AppPermission);
        } else {
          rolePermSet.delete(up.permission as AppPermission);
        }
      });

      setPermissions(Array.from(rolePermSet));
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const hasPermission = (permission: AppPermission): boolean => {
    // Admins always have all permissions
    if (isAdmin) return true;
    return permissions.includes(permission);
  };

  return {
    permissions,
    hasPermission,
    loading,
    refetch: fetchPermissions,
  };
}
