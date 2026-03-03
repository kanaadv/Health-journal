"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Supabase JS picks up the session tokens from the URL hash automatically.
    // We just need to wait for getSession() to confirm and then redirect.
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/");
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow">
          H
        </div>
        <div className="w-5 h-5 border-2 border-stone-300 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-sm text-stone-500">Signing you in...</p>
      </div>
    </div>
  );
}
