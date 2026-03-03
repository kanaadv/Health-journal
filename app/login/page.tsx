"use client";

import { useState } from "react";
import { getSupabase } from "../../lib/supabase";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-100/60 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-amber-100/50 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xl shadow-stone-100 p-8 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-violet-200 mb-6">
            H
          </div>

          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Health Journal
          </h1>
          <p className="mt-2 text-sm text-stone-500 leading-relaxed">
            Your personal health companion.<br />
            Sign in to access your data.
          </p>

          <div className="w-full mt-8 space-y-3">
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
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
              )}
              {loading ? "Redirecting to Google..." : "Continue with Google"}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 w-full">
              {error}
            </p>
          )}

          <p className="mt-6 text-xs text-stone-400 leading-relaxed">
            Your data is private and only accessible to you.
          </p>
        </div>
      </div>
    </div>
  );
}
