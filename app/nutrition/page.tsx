"use client";

import { useEffect, useState } from "react";
import { getAllEntries } from "../../lib/storage";
import type { DailyEntry } from "../../lib/types";

type Frame = "7D" | "14D" | "30D" | "90D";

const FRAMES: { id: Frame; label: string; days: number }[] = [
  { id: "7D", label: "7 days", days: 7 },
  { id: "14D", label: "14 days", days: 14 },
  { id: "30D", label: "1 month", days: 30 },
  { id: "90D", label: "3 months", days: 90 },
];

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function filterEntries(entries: DailyEntry[], days: number): DailyEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffStr = localDateStr(cutoff);
  const today = localDateStr(new Date());
  return entries.filter((e) => e.date >= cutoffStr && e.date <= today);
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

interface NutritionStats {
  avgCalories: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
  daysLogged: number;
  totalDays: number;
  // best / worst days
  highestCalDay: { date: string; val: number } | null;
  lowestCalDay: { date: string; val: number } | null;
  highestProteinDay: { date: string; val: number } | null;
}

function computeStats(entries: DailyEntry[], days: number): NutritionStats {
  const filtered = filterEntries(entries, days);
  const withNutrition = filtered.filter((e) => e.evening.calories != null);

  const calories = withNutrition.map((e) => e.evening.calories!);
  const proteins = filtered.filter((e) => e.evening.protein != null).map((e) => e.evening.protein!);
  const carbs = filtered.filter((e) => e.evening.carbs != null).map((e) => e.evening.carbs!);
  const fats = filtered.filter((e) => e.evening.fat != null).map((e) => e.evening.fat!);

  const highestCal = withNutrition.reduce<{ date: string; val: number } | null>((best, e) => {
    if (!best || e.evening.calories! > best.val) return { date: e.date, val: e.evening.calories! };
    return best;
  }, null);

  const lowestCal = withNutrition.reduce<{ date: string; val: number } | null>((best, e) => {
    if (!best || e.evening.calories! < best.val) return { date: e.date, val: e.evening.calories! };
    return best;
  }, null);

  const highestProtein = filtered
    .filter((e) => e.evening.protein != null)
    .reduce<{ date: string; val: number } | null>((best, e) => {
      if (!best || e.evening.protein! > best.val) return { date: e.date, val: e.evening.protein! };
      return best;
    }, null);

  return {
    avgCalories: avg(calories),
    avgProtein: avg(proteins),
    avgCarbs: avg(carbs),
    avgFat: avg(fats),
    daysLogged: withNutrition.length,
    totalDays: days,
    highestCalDay: highestCal,
    lowestCalDay: lowestCal,
    highestProteinDay: highestProtein,
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({ label, value, unit, sub, color }: {
  label: string;
  value: number | null;
  unit: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">{label}</p>
      {value != null ? (
        <>
          <p className={`text-3xl font-bold ${color}`}>
            {value.toLocaleString()}
            <span className="text-base font-normal text-stone-400 ml-1">{unit}</span>
          </p>
          {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
        </>
      ) : (
        <p className="text-2xl font-bold text-stone-300">—</p>
      )}
    </div>
  );
}

export default function NutritionPage() {
  const [allEntries, setAllEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [frame, setFrame] = useState<Frame>("30D");

  useEffect(() => {
    getAllEntries().then(setAllEntries).finally(() => setLoading(false));
  }, []);

  const frameDays = FRAMES.find((f) => f.id === frame)!.days;
  const stats = computeStats(allEntries, frameDays);

  // Per-macro breakdown for the selected period
  const filtered = filterEntries(allEntries, frameDays).filter((e) =>
    e.evening.calories != null || e.evening.protein != null
  );

  return (
    <main className="min-h-screen bg-stone-50">
      <section className="bg-white border-b border-stone-200 px-6 pt-8 pb-6">
        <div className="max-w-2xl mx-auto flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Nutrition</h1>
            <p className="text-sm text-stone-500 mt-1">Average intake across different periods</p>
          </div>
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
            {FRAMES.map((f) => (
              <button
                key={f.id}
                onClick={() => setFrame(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  frame === f.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {f.id}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-6 max-w-2xl mx-auto space-y-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 h-32 animate-pulse" />
            ))}
          </div>
        ) : stats.daysLogged === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
            <p className="text-stone-400 text-sm">No nutrition data logged in this period.</p>
          </div>
        ) : (
          <>
            {/* Logged days banner */}
            <div className="bg-stone-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-stone-600">
                Based on <span className="font-semibold text-stone-800">{stats.daysLogged}</span> days logged
                {" "}out of {stats.totalDays}
              </p>
              <span className="text-xs text-stone-400">
                {Math.round((stats.daysLogged / stats.totalDays) * 100)}% consistency
              </span>
            </div>

            {/* Averages grid */}
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Daily Averages</p>
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Calories" value={stats.avgCalories} unit="kcal" color="text-indigo-600" />
                <StatCard label="Protein" value={stats.avgProtein} unit="g" color="text-violet-600" />
                <StatCard label="Carbs" value={stats.avgCarbs} unit="g" color="text-amber-600" />
                <StatCard label="Fat" value={stats.avgFat} unit="g" color="text-emerald-600" />
              </div>
            </div>

            {/* Notable days */}
            {(stats.highestCalDay || stats.lowestCalDay || stats.highestProteinDay) && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Notable Days</p>
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
                  {stats.highestCalDay && (
                    <div className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-stone-800">Highest calorie day</p>
                        <p className="text-xs text-stone-400">{formatDate(stats.highestCalDay.date)}</p>
                      </div>
                      <p className="text-sm font-bold text-indigo-600">{stats.highestCalDay.val.toLocaleString()} kcal</p>
                    </div>
                  )}
                  {stats.lowestCalDay && stats.lowestCalDay.date !== stats.highestCalDay?.date && (
                    <div className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-stone-800">Lowest calorie day</p>
                        <p className="text-xs text-stone-400">{formatDate(stats.lowestCalDay.date)}</p>
                      </div>
                      <p className="text-sm font-bold text-stone-500">{stats.lowestCalDay.val.toLocaleString()} kcal</p>
                    </div>
                  )}
                  {stats.highestProteinDay && (
                    <div className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-stone-800">Best protein day</p>
                        <p className="text-xs text-stone-400">{formatDate(stats.highestProteinDay.date)}</p>
                      </div>
                      <p className="text-sm font-bold text-violet-600">{stats.highestProteinDay.val}g</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Per-day breakdown */}
            {filtered.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Day by Day</p>
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-5 px-5 py-2.5 border-b border-stone-100 bg-stone-50">
                    <p className="text-xs font-semibold text-stone-400 col-span-1">Date</p>
                    <p className="text-xs font-semibold text-indigo-400 text-right">Cal</p>
                    <p className="text-xs font-semibold text-violet-400 text-right">Pro</p>
                    <p className="text-xs font-semibold text-amber-400 text-right">Carb</p>
                    <p className="text-xs font-semibold text-emerald-400 text-right">Fat</p>
                  </div>
                  <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
                    {[...filtered].reverse().map((e) => (
                      <div key={e.date} className="grid grid-cols-5 px-5 py-3">
                        <p className="text-xs text-stone-500 col-span-1">{formatDate(e.date)}</p>
                        <p className="text-xs font-medium text-stone-800 text-right">{e.evening.calories ?? "—"}</p>
                        <p className="text-xs font-medium text-stone-800 text-right">{e.evening.protein != null ? `${e.evening.protein}g` : "—"}</p>
                        <p className="text-xs font-medium text-stone-800 text-right">{e.evening.carbs != null ? `${e.evening.carbs}g` : "—"}</p>
                        <p className="text-xs font-medium text-stone-800 text-right">{e.evening.fat != null ? `${e.evening.fat}g` : "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
