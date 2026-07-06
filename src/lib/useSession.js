import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

/**
 * useSession — lightweight session + role hook.
 * Does NOT depend on AuthContext.
 * Fetches role from the members table by user_id.
 */
export function useSession() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!session?.user) {
          if (!cancelled) { setUser(null); setRole(null); setLoading(false); }
          return;
        }

        if (!cancelled) setUser(session.user);

        // Race DB query against 3s timeout so RLS errors don't hang the app
        const timeout = new Promise((resolve) =>
          setTimeout(() => resolve({ timedOut: true }), 3000)
        );
        const query = supabase
          .from('members')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data: d }) => d)
          .catch(() => null);

        const result = await Promise.race([query, timeout]);
        const fetchedRole = result?.timedOut ? 'member' : (result?.role || 'member');

        if (!cancelled) setRole(fetchedRole);
      } catch {
        if (!cancelled) { setUser(null); setRole(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    try {
      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
      });
      return () => {
        cancelled = true;
        sub?.subscription?.unsubscribe();
      };
    } catch {
      return () => { cancelled = true; };
    }
  }, []);

  return { user, role, loading };
}