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
        if (!entry) {
          setStatus({ morningDone: false, eveningDone: false });
          return;
        }
        const m = entry.morning ?? {};
        const e = entry.evening ?? {};
        setStatus({
          morningDone: m.weight != null || m.sleepHours != null,
          eveningDone: e.mood != null || e.calories != null,
        });
      } catch {
        if (mounted) setStatus({ morningDone: false, eveningDone: false });
      }
    }

    fetchStatus();
    return () => {
      mounted = false;
    };
  }, []);

  if (status === null) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <h2 className="text-lg font-semibold text-stone-800 mb-4">Today</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-stone-200 rounded w-3/4" />
          <div className="h-5 bg-stone-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const Check = () => (
    <span className="text-emerald-600 font-medium">✓</span>
  );
  const Empty = () => <span className="text-stone-400">☐</span>;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <h2 className="text-lg font-semibold text-stone-800 mb-4">Today</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {status.morningDone ? <Check /> : <Empty />}
          <span className="text-stone-700">
            {status.morningDone ? (
              "Morning check-in"
            ) : (
              <Link href="/morning" className="hover:text-stone-900 underline">
                Morning check-in
              </Link>
            )}
          </span>
          {!status.morningDone && (
            <span className="text-stone-500 text-sm">weight, sleep</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {status.eveningDone ? <Check /> : <Empty />}
          <span className="text-stone-700">
            {status.eveningDone ? (
              "Evening check-in"
            ) : (
              <Link href="/evening" className="hover:text-stone-900 underline">
                Evening check-in
              </Link>
            )}
          </span>
          {!status.eveningDone && (
            <span className="text-stone-500 text-sm">mood, nutrition</span>
          )}
        </div>
      </div>
    </div>
  );
}
