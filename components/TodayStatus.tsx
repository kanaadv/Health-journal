"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTodayEntry } from "../lib/storage";

export default function TodayStatus() {
  const [status, setStatus] = useState<{
    morningDone: boolean;
    eveningDone: boolean;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchStatus() {
      try {
        const entry = await getTodayEntry();
        if (!mounted) return;
        if (!entry) { setStatus({ morningDone: false, eveningDone: false }); return; }
        const m = entry.morning ?? {};
        const e = entry.evening ?? {};
        setStatus({
          morningDone: m.weight != null || m.sleepHours != null,
          eveningDone: e.calories != null || ((e.exercises?.length ?? 0) > 0),
        });
      } catch {
        if (mounted) setStatus({ morningDone: false, eveningDone: false });
      }
    }
    fetchStatus();
    return () => { mounted = false; };
  }, []);

  if (status === null) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">Today</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-stone-200 rounded w-3/4" />
          <div className="h-4 bg-stone-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const Check = () => <span className="text-emerald-500 font-medium">✓</span>;
  const Empty = () => <span className="text-stone-300">☐</span>;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-700 mb-3">Today</h2>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {status.morningDone ? <Check /> : <Empty />}
          <Link href="/diary" className="text-sm text-stone-700 hover:text-stone-900 hover:underline">
            Morning check-in
          </Link>
          {!status.morningDone && <span className="text-stone-400 text-xs">weight, sleep</span>}
        </div>
        <div className="flex items-center gap-3">
          {status.eveningDone ? <Check /> : <Empty />}
          <Link href="/diary" className="text-sm text-stone-700 hover:text-stone-900 hover:underline">
            Evening check-in
          </Link>
          {!status.eveningDone && <span className="text-stone-400 text-xs">nutrition, exercise</span>}
        </div>
      </div>
    </div>
  );
}
