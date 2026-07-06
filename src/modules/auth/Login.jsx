import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EmailIcon = () => (
  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const Login = () => {
  const [loginType, setLoginType] = useState("member");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // ─── Shared: authorize user, upsert member, redirect ───────────────────────
  const handleUserSetup = async (user) => {
    // 1. Check authorized_users table
    const { data: authUser, error: authError } = await supabase
      .from("authorized_users")
      .select("role, status")
      .eq("email", user.email)
      .maybeSingle();

    if (authError || !authUser || authUser.status !== "active") {
      await supabase.auth.signOut();
      setError("Access denied. You are not authorized to access this platform.");
      return false;
    }

    const role = authUser.role;

    // 2. Upsert into members table
    const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "New User";

    const { error: upsertError } = await supabase
      .from("members")
      .upsert(
        {
          user_id: user.id,
          email: user.email,
          name,
          role,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      await supabase.auth.signOut();
      setError("Failed to set up your account. Please contact admin.");
      return false;
    }

    if (role === "admin" || role === "moderator") {
  navigate("/admin/dashboard");
} else {
  navigate("/member/dashboard");
}

    return true;
  };

  // ─── Handle Google OAuth redirect ──────────────────────────────────────────
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      // Only run if this looks like an OAuth callback (hash or query params present)
      const hash = window.location.hash;
      const query = window.location.search;
      if (!hash && !query) return;

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data?.session) return;

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) return;

      setLoading(true);
      setError("");
      await handleUserSetup(userData.user);
      setLoading(false);
    };

    handleOAuthRedirect();
  }, []);

  // ─── Email + Password login (unchanged logic) ───────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const user = data?.user;
    if (!user) { setLoading(false); return; }

    // ─── Whitelist check ────────────────────────────────────────
    const { data: authUser, error: whitelistError } = await supabase
      .from("authorized_users")
      .select("role, status")
      .eq("email", user.email)
      .maybeSingle();

    if (whitelistError || !authUser || authUser.status !== "active") {
      await supabase.auth.signOut();
      setError("Access denied. You are not authorized to access this platform.");
      setLoading(false);
      return;
    }

    const role = authUser.role;

    // Upsert into members table
    const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "New User";
    const { error: upsertError } = await supabase
      .from("members")
      .upsert(
        { user_id: user.id, email: user.email, name, role },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      await supabase.auth.signOut();
      setError("Failed to set up your account. Please contact admin.");
      setLoading(false);
      return;
    }

    const isAdmin = role === "admin" || role === "moderator";

    if (loginType === "admin" && !isAdmin) {
      await supabase.auth.signOut();
      setError("This account is not an admin. Please use Member Login.");
      setLoading(false);
      return;
    }

    if (loginType === "member" && isAdmin) {
      await supabase.auth.signOut();
      setError("This is an admin account. Please use Admin Login.");
      setLoading(false);
      return;
    }

    if (isAdmin) {
      navigate("/admin/dashboard");
    } else {
      navigate("/member/dashboard");
    }

    setLoading(false);
  };

  // ─── Google OAuth login ─────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
    // If no error, browser will redirect to Google — loading stays true
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setError("");
      alert("Password reset email sent! Check your inbox.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">Cintel Club</h1>
            <p className="text-indigo-200 text-xs">Operations Platform</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Manage events,<br />
            <span className="text-indigo-200">empower your team.</span>
          </h2>
          <p className="text-indigo-200 text-base leading-relaxed mb-8">
            The all-in-one platform for Cintel Student Association — track events, volunteers, tasks, and budgets in one place.
          </p>

          {/* Feature highlights */}
          <div className="space-y-3">
            {[
              { icon: <CalendarIcon />, text: "Organize and manage club events" },
              { icon: <UserIcon />, text: "Coordinate volunteers & teams" },
              { icon: <ShieldIcon />, text: "Role-based access control" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="text-indigo-300">{f.icon}</div>
                <span className="text-indigo-100 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-indigo-300 text-xs relative z-10">
          © 2025 Cintel Student Association. All rights reserved.
        </p>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">Cintel Club</h1>
              <p className="text-xs text-slate-400">Operations Platform</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1">Sign in to your Cintel Club account</p>
          </div>

          {/* Role Toggle */}
          <div className="flex bg-slate-200 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setLoginType("member"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                loginType === "member"
                  ? "bg-white text-indigo-600 shadow-sm shadow-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <UserIcon />
              Member Login
            </button>
            <button
              onClick={() => { setLoginType("admin"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                loginType === "admin"
                  ? "bg-white text-indigo-600 shadow-sm shadow-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <ShieldIcon />
              Admin Login
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <EmailIcon />
                </div>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button
                  onClick={handleForgotPassword}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <LockIcon />
                </div>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-200/50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                `Sign in as ${loginType === "admin" ? "Admin" : "Member"}`
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-200 shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400 mt-8">
            Having trouble? Contact your{" "}
            <span className="text-indigo-500 font-medium">club administrator</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;