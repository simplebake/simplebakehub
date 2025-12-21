import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logAuthEvent } from './auditLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Track last logged event to prevent duplicates
const getLastLoggedKey = () => {
  try {
    return sessionStorage.getItem('lastAuthEventLogged');
  } catch {
    return null;
  }
};

const setLastLoggedKey = (key: string) => {
  try {
    sessionStorage.setItem('lastAuthEventLogged', key);
  } catch {
    // Ignore storage errors
  }
};

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoggedInitialSignIn = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Log authentication events with deduplication
        const userId = session?.user?.id;
        const eventKey = `${event}-${userId}-${Math.floor(Date.now() / 300000)}`; // 5-minute window
        const lastLogged = getLastLoggedKey();

        // Skip if we've already logged this event recently
        if (lastLogged === eventKey) {
          return;
        }

        // For SIGNED_IN, only log once per session to avoid rate limits
        if (event === 'SIGNED_IN') {
          if (hasLoggedInitialSignIn.current) {
            return; // Skip subsequent SIGNED_IN events (token refreshes)
          }
          hasLoggedInitialSignIn.current = true;
          setLastLoggedKey(eventKey);
          logAuthEvent('signin', userId, { method: 'password' });
        } else if (event === 'SIGNED_OUT') {
          hasLoggedInitialSignIn.current = false;
          setLastLoggedKey(eventKey);
          logAuthEvent('signout', userId);
        } else if (event === 'PASSWORD_RECOVERY') {
          setLastLoggedKey(eventKey);
          logAuthEvent('password_reset', userId);
        }
        // Don't log USER_UPDATED events
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
};
