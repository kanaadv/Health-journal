"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";
import { AuthContext } from "../lib/auth-context";

const PUBLIC_PATHS = ["/login", "/auth"];

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = getSupabase();

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Keep state in sync on sign-in / sign-out / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Route protection
  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (!user && !isPublic) {
      router.push("/login");
    }
    if (user && pathname === "/login") {
      router.push("/");
    }
  }, [loading, user, pathname, router]);

  // Full-screen loading spinner while session is resolved
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow">
            H
          </div>
          <div className="w-5 h-5 border-2 border-stone-300 border-t-violet-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
