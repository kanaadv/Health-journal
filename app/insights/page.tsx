"use client";

import { useEffect, useState } from "react";
import { getAllEntries, getGoals, getProfile, saveInsight } from "../../lib/storage";
import type { DailyEntry, GoalsData, InsightResult, UserProfile, ChecklistItem } from "../../lib/types";

type Period = "today" | "week" | "month" | "threeMonths";

const PERIODS: { id: Period; label: string; days: number; minEntries: number }[] = [
  { id: "today", label: "Today", days: 1, minEntries: 1 },
  { id: "week", label: "This Week", days: 7, minEntries: 3 },
  { id: "month", label: "This Month", days: 30, minEntries: 7 },
  { id: "threeMonths", label: "Last 3 Months", days: 90, minEntries: 20 },
];

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return localDateStr(d);
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-500" : "text-red-500";
  const bg =
    score >= 80 ? "bg-emerald-50" : score >= 60 ? "bg-amber-50" : "bg-red-50";
  return (
    <div className={`rounded-2xl ${bg} p-6 flex flex-col items-center justify-center`}>
      <span className={`text-6xl font-bold ${color}`}>{score}</span>
      <span className="text-stone-500 text-sm mt-1">/ 100</span>
      <span className="text-stone-600 font-medium mt-2 text-sm">Overall Score</span>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-stone-600">{label}</span>
        <span className="font-semibold text-stone-800">
          {value}
          <span className="text-stone-400 font-normal">/{max}</span>
        </span>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ChecklistCard({ items }: { items: ChecklistItem[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">
        ✓ Daily Checklist
      </p>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                  item.met
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-500"
                }`}
              >
                {item.met ? "✓" : "✗"}
              </span>
              <span className="text-sm text-stone-700 font-medium truncate">{item.item}</span>
            </div>
            <div className="flex items-center gap-2 text-xs flex-shrink-0">
              {item.actual != null && (
                <span className={`font-semibold ${item.met ? "text-emerald-600" : "text-red-500"}`}>
                  {item.actual}
                </span>
              )}
              {item.target != null && (
                <span className="text-stone-400">/ {item.target}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [allEntries, setAllEntries] = useState<DailyEntry[]>([]);
  const [goals, setGoals] = useState<GoalsData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activePeriod, setActivePeriod] = useState<Period>("week");
  const [results, setResults] = useState<Partial<Record<Period, InsightResult>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllEntries(), getGoals(), getProfile()]).then(([entries, g, p]) => {
      setAllEntries(entries);
      setGoals(g);
      setProfile(p);
      setDataLoading(false);
    });
  }, []);

  function getEntriesForPeriod(period: Period): DailyEntry[] {
    const config = PERIODS.find((p) => p.id === period)!;
    const cutoff = getDateDaysAgo(config.days);
    const today = localDateStr(new Date());
    return allEntries.filter((e) => e.date >= cutoff && e.date <= today);
  }

  function hasEnoughData(period: Period): boolean {
    const config = PERIODS.find((p) => p.id === period)!;
    const entries = getEntriesForPeriod(period);
    return entries.length >= config.minEntries;
  }

  function getNotEnoughDataMessage(period: Period): string {
    const config = PERIODS.find((p) => p.id === period)!;
    const entries = getEntriesForPeriod(period);
    const needed = config.minEntries - entries.length;
    if (period === "today") return "Log your morning or evening check-in first.";
    if (period === "week") return `Need ${needed} more log${needed === 1 ? "" : "s"} over 7 days.`;
    if (period === "month") return `Need ${needed} more log${needed === 1 ? "" : "s"} over 30 days.`;
    return `Need ${needed} more log${needed === 1 ? "" : "s"} over 90 days.`;
  }

  async function generate() {
    const rawEntries = getEntriesForPeriod(activePeriod);
    setError(null);
    setLoading(true);

    // Strip workout images from entries to keep JSON body small,
    // then pass them separately (capped at 8 to control cost)
    const entries = rawEntries.map((e) => ({
      ...e,
      evening: { ...e.evening, workoutImages: undefined },
    }));
    const workoutImages = rawEntries
      .flatMap((e) => e.evening.workoutImages ?? [])
      .slice(0, 8);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, goals, period: activePeriod, workoutImages, profile }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate insights");
      const result = data as InsightResult;
      setResults((prev) => ({ ...prev, [activePeriod]: result }));

      // Auto-save daily insights to the diary entry
      if (activePeriod === "today") {
        const today = localDateStr(new Date());
        saveInsight(today, result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const currentResult = results[activePeriod];
  const enough = !dataLoading && hasEnoughData(activePeriod);

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <section className="bg-white border-b border-stone-200 px-6 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">AI Insights</h1>
          <p className="mt-1 text-sm text-stone-500">
            Analyse your health data and get personalised feedback.
          </p>
        </div>
      </section>

      <section className="px-6 py-6 max-w-2xl mx-auto space-y-6">
        {/* Period tabs */}
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActivePeriod(p.id);
                setError(null);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activePeriod === p.id
                  ? "bg-violet-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Generate button */}
        {dataLoading ? (
          <div className="h-12 bg-stone-100 rounded-xl animate-pulse" />
        ) : !enough ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-6 py-8 text-center">
            <p className="text-2xl mb-2">📊</p>
            <p className="font-semibold text-stone-700">Not enough data yet</p>
            <p className="text-sm text-stone-500 mt-1">{getNotEnoughDataMessage(activePeriod)}</p>
          </div>
        ) : (
          <button
            onClick={generate}
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 text-white font-semibold py-3.5 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Analyzing your data...
              </>
            ) : currentResult ? (
              "Regenerate Insights"
            ) : (
              "✨ Generate Insights"
            )}
          </button>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {currentResult && !loading && (
          <div className="space-y-4">
            {/* Score row */}
            <div className="grid grid-cols-2 gap-4">
              <ScoreRing score={currentResult.overallScore} />
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                  Breakdown
                </p>
                <ScoreBar
                  label="Nutrition"
                  value={currentResult.scoreBreakdown.nutrition}
                  max={40}
                  color="bg-emerald-400"
                />
                <ScoreBar
                  label="Physical"
                  value={currentResult.scoreBreakdown.physicalMetrics}
                  max={30}
                  color="bg-blue-400"
                />
                <ScoreBar
                  label="Sleep"
                  value={currentResult.scoreBreakdown.sleep}
                  max={20}
                  color="bg-indigo-400"
                />
                <ScoreBar
                  label="Consistency"
                  value={currentResult.scoreBreakdown.consistency}
                  max={10}
                  color="bg-amber-400"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                Summary
              </p>
              <p className="text-stone-700 leading-relaxed">{currentResult.summary}</p>
            </div>

            {/* Checklist */}
            {currentResult.dailyChecklist && currentResult.dailyChecklist.length > 0 && (
              <ChecklistCard items={currentResult.dailyChecklist} />
            )}

            {/* Highlights */}
            {currentResult.highlights.length > 0 && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3">
                  ✅ Wins
                </p>
                <ul className="space-y-2">
                  {currentResult.highlights.map((h, i) => (
                    <li key={i} className="text-sm text-emerald-900 flex gap-2">
                      <span className="mt-0.5 shrink-0">•</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas to improve */}
            {currentResult.areasToImprove.length > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
                  ⚠️ Areas to Improve
                </p>
                <ul className="space-y-2">
                  {currentResult.areasToImprove.map((a, i) => (
                    <li key={i} className="text-sm text-amber-900 flex gap-2">
                      <span className="mt-0.5 shrink-0">•</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actionable tips */}
            {currentResult.actionableTips.length > 0 && (
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                  💡 What to Do Next
                </p>
                <ul className="space-y-2">
                  {currentResult.actionableTips.map((t, i) => (
                    <li key={i} className="text-sm text-stone-700 flex gap-2">
                      <span className="mt-0.5 shrink-0 text-violet-500">→</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notable patterns */}
            {currentResult.notablePatterns && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
                <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2">
                  🔍 Pattern Spotted
                </p>
                <p className="text-sm text-violet-900">{currentResult.notablePatterns}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
