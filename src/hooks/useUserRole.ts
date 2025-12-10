import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/supabase';

export type UserRole = 'admin' | 'moderator' | 'support' | 'user' | null;

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch user role from user_roles table
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error checking role:', error);
          setRole('user');
        } else {
          setRole(data?.role as UserRole || 'user');
        }
      } catch (error) {
        console.error('Error in role check:', error);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user]);

  return { 
    role, 
    loading, 
    isAdmin: role === 'admin',
    isModerator: role === 'moderator',
    isSupport: role === 'support',
    isStaff: role === 'admin' || role === 'moderator' || role === 'support'
  };
};
