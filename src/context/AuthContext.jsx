import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // ─── Shared user setup ──────────────────────────────────────────────────────
  const setupUser = useCallback(async (user) => {
    if (!mountedRef.current) return;

    console.log('[AuthContext] setupUser START', user?.email);
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timed out')), 5000)
      );

      const authQuery = supabase
        .from("authorized_users")
        .select("role, status")
        .eq("email", user.email)
        .maybeSingle();

      const { data: authUser, error: authError } = await Promise.race([authQuery, timeout]);

      if (!mountedRef.current) return;

      console.log('[AuthContext] authorized_users result:', { authUser, authError });

      if (authError || !authUser || authUser.status !== "active") {
        console.log('[AuthContext] Not authorized, signing out');
        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const name =
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "New User";

      const { error: upsertError } = await supabase
        .from("members")
        .upsert({ user_id: user.id, email: user.email, name, role: authUser.role }, { onConflict: "user_id" });

      console.log('[AuthContext] members upsert done', { upsertError });
      if (!mountedRef.current) return;

      setUser(user);
      setRole(authUser.role);
      setLoading(false);
      console.log('[AuthContext] setupUser DONE');
    } catch (err) {
      console.error('[AuthContext] setupUser CRASHED', err);
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          setupUser(session.user);
        } else {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      })
      .catch(() => {
        setUser(null);
        setRole(null);
        setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [setupUser]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
