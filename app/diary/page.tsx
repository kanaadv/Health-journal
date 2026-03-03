"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllEntries, deleteEntry, saveInsight, getGoals } from "../../lib/storage";
import type { DailyEntry, GoalsData, InsightResult } from "../../lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function entryStatus(entry: DailyEntry | undefined) {
  if (!entry) return "none";
  const hasMorning = entry.morning.weight != null || entry.morning.sleepHours != null;
  const hasEvening = entry.evening.mood != null || entry.evening.calories != null;
  if (hasMorning && hasEvening) return "both";
  if (hasMorning) return "morning";
  if (hasEvening) return "evening";
  return "none";
}

function ScaleValue({ value, max = 5 }: { value: number | null | undefined; max?: number }) {
  if (value == null) return <span className="text-stone-400">—</span>;
  return <span>{value}<span className="text-stone-400 text-xs">/{max}</span></span>;
}

function InsightPanel({ insight }: { insight: InsightResult }) {
  const scoreColor =
    insight.overallScore >= 80
      ? "text-emerald-600"
      : insight.overallScore >= 60
      ? "text-amber-500"
      : "text-red-500";
  const scoreBg =
    insight.overallScore >= 80
      ? "bg-emerald-50"
      : insight.overallScore >= 60
      ? "bg-amber-50"
      : "bg-red-50";

  const generatedAt = insight.generatedAt
    ? new Date(insight.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-4">
      <div className="border-t border-stone-100" />
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-violet-700">✨ Daily AI Insight</p>
          {generatedAt && (
            <span className="text-xs text-stone-400">Generated at {generatedAt}</span>
          )}
        </div>

        {/* Score */}
        <div className={`inline-flex items-baseline gap-1 px-3 py-1.5 rounded-lg ${scoreBg} mb-3`}>
          <span className={`text-2xl font-bold ${scoreColor}`}>{insight.overallScore}</span>
          <span className="text-stone-400 text-sm">/100</span>
        </div>

        {/* Summary */}
        <p className="text-sm text-stone-700 leading-relaxed mb-4">{insight.summary}</p>

        {/* Highlights */}
        {insight.highlights.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Highlights</p>
            <ul className="space-y-1">
              {insight.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-700">
                  <span className="text-emerald-500 flex-shrink-0">✓</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas to improve */}
        {insight.areasToImprove.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">To Work On</p>
            <ul className="space-y-1">
              {insight.areasToImprove.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-700">
                  <span className="text-amber-400 flex-shrink-0">→</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tips */}
        {insight.actionableTips.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Tips</p>
            <ul className="space-y-1">
              {insight.actionableTips.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-700">
                  <span className="text-violet-400 flex-shrink-0">•</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function DayDetail({
  entry,
  date,
  goals,
  onDelete,
  onInsightSaved,
}: {
  entry: DailyEntry | undefined;
  date: string;
  goals: GoalsData | null;
  onDelete: (date: string) => void;
  onInsightSaved: (date: string, insight: InsightResult) => void;
}) {
  const d = new Date(date + "T12:00:00");
  const label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const [showInsight, setShowInsight] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    const { error } = await deleteEntry(date);
    setDeleting(false);
    if (!error) {
      onDelete(date);
    }
  }

  async function handleGenerateInsight() {
    if (!entry) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const strippedEntry = { ...entry, evening: { ...entry.evening, workoutImages: undefined } };
      const workoutImages = entry.evening.workoutImages ?? [];
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: [strippedEntry],
          goals,
          period: "today",
          workoutImages: workoutImages.slice(0, 8),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate");
      const result = data as InsightResult;
      await saveInsight(date, result);
      onInsightSaved(date, result);
      setShowInsight(true);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-100">
        <p className="font-semibold text-stone-800">{label}</p>
        <div className="flex gap-3 mt-1 flex-wrap">
          {entry?.morning.weight != null || entry?.morning.sleepHours != null
            ? <span className="text-xs text-amber-600 font-medium">☀️ Morning logged</span>
            : <span className="text-xs text-stone-400">☀️ Morning — not logged</span>}
          {entry?.evening.mood != null || entry?.evening.calories != null
            ? <span className="text-xs text-indigo-600 font-medium">🌙 Evening logged</span>
            : <span className="text-xs text-stone-400">🌙 Evening — not logged</span>}
          {entry?.insights && (
            <span className="text-xs text-violet-600 font-medium">✨ Insight saved</span>
          )}
        </div>
      </div>

      {entry ? (
        <div className="px-6 py-5 space-y-5">
          {/* Morning */}
          <div>
            <p className="text-sm font-semibold text-amber-700 mb-3">☀️ Morning</p>
            {(entry.morning.weight != null || entry.morning.sleepHours != null) ? (
              <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
                {entry.morning.weight != null && (<><span className="text-stone-500">Weight</span><span className="text-stone-800 font-medium">{entry.morning.weight} {entry.morning.weightUnit ?? "lbs"}</span></>)}
                {entry.morning.bodyFat != null && (<><span className="text-stone-500">Body fat</span><span className="text-stone-800 font-medium">{entry.morning.bodyFat}%</span></>)}
                {entry.morning.sleepHours != null && (<><span className="text-stone-500">Sleep</span><span className="text-stone-800 font-medium">{entry.morning.sleepHours} hrs</span></>)}
                {entry.morning.wakeMood != null && (<><span className="text-stone-500">Wake mood</span><span className="text-stone-800 font-medium"><ScaleValue value={entry.morning.wakeMood} /></span></>)}
                {entry.morning.wakeEnergy != null && (<><span className="text-stone-500">Energy</span><span className="text-stone-800 font-medium"><ScaleValue value={entry.morning.wakeEnergy} /></span></>)}
                {entry.morning.notes && (<><span className="text-stone-500">Notes</span><span className="text-stone-800">{entry.morning.notes}</span></>)}
              </div>
            ) : <p className="text-stone-400 text-sm">Nothing logged</p>}
          </div>

          <div className="border-t border-stone-100" />

          {/* Evening */}
          <div>
            <p className="text-sm font-semibold text-indigo-700 mb-3">🌙 Evening</p>
            {(entry.evening.mood != null || entry.evening.calories != null) ? (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                  {entry.evening.mood != null && (<><span className="text-stone-500">Mood</span><span className="text-stone-800 font-medium"><ScaleValue value={entry.evening.mood} /></span></>)}
                  {entry.evening.stress != null && (<><span className="text-stone-500">Stress</span><span className="text-stone-800 font-medium"><ScaleValue value={entry.evening.stress} /></span></>)}
                  {entry.evening.socialConnectedness != null && (<><span className="text-stone-500">Social</span><span className="text-stone-800 font-medium"><ScaleValue value={entry.evening.socialConnectedness} /></span></>)}
                </div>

                {(entry.evening.calories != null || entry.evening.protein != null || entry.evening.carbs != null || entry.evening.fat != null) && (
                  <div>
                    <p className="text-stone-500 mb-2">Nutrition</p>
                    <div className="flex gap-3 flex-wrap">
                      {entry.evening.calories != null && <div className="bg-stone-50 rounded-lg px-3 py-2 text-center"><p className="text-stone-800 font-semibold">{entry.evening.calories}</p><p className="text-stone-400 text-xs">cal</p></div>}
                      {entry.evening.protein != null && <div className="bg-stone-50 rounded-lg px-3 py-2 text-center"><p className="text-stone-800 font-semibold">{entry.evening.protein}g</p><p className="text-stone-400 text-xs">protein</p></div>}
                      {entry.evening.carbs != null && <div className="bg-stone-50 rounded-lg px-3 py-2 text-center"><p className="text-stone-800 font-semibold">{entry.evening.carbs}g</p><p className="text-stone-400 text-xs">carbs</p></div>}
                      {entry.evening.fat != null && <div className="bg-stone-50 rounded-lg px-3 py-2 text-center"><p className="text-stone-800 font-semibold">{entry.evening.fat}g</p><p className="text-stone-400 text-xs">fat</p></div>}
                    </div>
                  </div>
                )}

                {(() => {
                  const exList = entry.evening.exercises && entry.evening.exercises.length > 0
                    ? entry.evening.exercises
                    : entry.evening.exercise
                    ? [{ name: entry.evening.exercise, minutes: entry.evening.exerciseMinutes ?? null }]
                    : [];
                  if (!exList.length) return null;
                  return (
                    <div>
                      <p className="text-stone-500 mb-2">Exercise</p>
                      <div className="space-y-1">
                        {exList.map((ex, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-stone-800 font-medium">{ex.name}</span>
                            {ex.minutes != null && <span className="text-stone-500">{ex.minutes} min</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {entry.evening.reflection && (
                  <div>
                    <p className="text-stone-500 mb-1">Reflection</p>
                    <p className="text-stone-700 leading-relaxed">{entry.evening.reflection}</p>
                  </div>
                )}
              </div>
            ) : <p className="text-stone-400 text-sm">Nothing logged</p>}
          </div>

          {/* AI Insight panel */}
          {showInsight && entry.insights && <InsightPanel insight={entry.insights} />}
        </div>
      ) : (
        <div className="px-6 py-8 text-center text-stone-400 text-sm">
          Nothing logged for this day.
        </div>
      )}

      {/* Action buttons */}
      <div className="border-t border-stone-100 px-6 py-4 space-y-3">
        {/* Edit + Delete row */}
        <div className="flex gap-3">
          <Link href={`/morning?date=${date}`} className="flex-1 text-center text-sm font-medium rounded-xl border border-amber-300 text-amber-700 py-2 hover:bg-amber-50 transition-colors">
            {entry?.morning.weight != null || entry?.morning.sleepHours != null ? "Edit Morning" : "+ Log Morning"}
          </Link>
          <Link href={`/evening?date=${date}`} className="flex-1 text-center text-sm font-medium rounded-xl border border-indigo-300 text-indigo-700 py-2 hover:bg-indigo-50 transition-colors">
            {entry?.evening.mood != null || entry?.evening.calories != null ? "Edit Evening" : "+ Log Evening"}
          </Link>
          {entry && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm font-medium rounded-xl border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 px-3 py-2 transition-colors"
            >
              Delete
            </button>
          )}
          {entry && confirmDelete && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm font-medium rounded-xl border border-red-300 text-red-600 hover:bg-red-50 px-3 py-2 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm font-medium rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 px-3 py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* AI Insight row */}
        {entry && (
          <div className="flex gap-3">
            {entry.insights && (
              <button
                onClick={() => setShowInsight((v) => !v)}
                className="flex-1 text-center text-sm font-medium rounded-xl border border-violet-300 text-violet-700 py-2 hover:bg-violet-50 transition-colors"
              >
                {showInsight ? "Hide AI Insight" : "View AI Insight"}
              </button>
            )}
            <button
              onClick={handleGenerateInsight}
              disabled={generating}
              className={`text-sm font-medium rounded-xl border py-2 px-4 transition-colors disabled:opacity-50 ${
                entry.insights
                  ? "border-stone-200 text-stone-500 hover:bg-stone-50"
                  : "flex-1 border-violet-300 text-violet-700 hover:bg-violet-50"
              }`}
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin inline-block" />
                  Generating...
                </span>
              ) : entry.insights ? "Regenerate" : "Generate AI Insight"}
            </button>
          </div>
        )}
        {generateError && (
          <p className="text-xs text-red-500">{generateError}</p>
        )}
      </div>
    </div>
  );
}

export default function DiaryPage() {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [goals, setGoals] = useState<GoalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    Promise.all([getAllEntries(), getGoals()]).then(([e, g]) => {
      setEntries(e);
      setGoals(g);
    }).finally(() => setLoading(false));
  }, []);

  function handleEntryDeleted(date: string) {
    setEntries((prev) => prev.filter((e) => e.date !== date));
    setSelectedDate(null);
  }

  function handleInsightSaved(date: string, insight: InsightResult) {
    setEntries((prev) =>
      prev.map((e) => e.date === date ? { ...e, insights: insight } : e)
    );
  }

  // Build a map for O(1) lookup
  const entryMap = new Map<string, DailyEntry>();
  for (const e of entries) entryMap.set(e.date, e);

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const statusColors: Record<string, string> = {
    both: "bg-emerald-500",
    morning: "bg-amber-400",
    evening: "bg-indigo-400",
    none: "",
  };

  const selectedEntry = selectedDate ? entryMap.get(selectedDate) : undefined;

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <section className="bg-white border-b border-stone-200 px-6 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Health Diary</h1>
          <p className="text-sm text-stone-500 mt-1">{entries.length} entries logged</p>
        </div>
      </section>

      <section className="px-6 py-6 max-w-2xl mx-auto space-y-4">
        {/* Calendar card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-600 transition-colors text-lg">‹</button>
            <p className="font-semibold text-stone-800">{MONTHS[viewMonth]} {viewYear}</p>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-600 transition-colors text-lg">›</button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-stone-100">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-stone-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="p-6 text-center text-stone-400 text-sm animate-pulse">Loading...</div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;
                const dateStr = toDateStr(viewYear, viewMonth, day);
                const entry = entryMap.get(dateStr);
                const status = entryStatus(entry);
                const hasInsight = entry?.insights != null;
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const isFuture = dateStr > today;

                return (
                  <button
                    key={dateStr}
                    onClick={() => !isFuture && setSelectedDate(isSelected ? null : dateStr)}
                    disabled={isFuture}
                    className={`relative aspect-square flex flex-col items-center justify-center gap-0.5 transition-colors rounded-lg m-0.5
                      ${isFuture ? "opacity-25 cursor-default" : "hover:bg-stone-50 cursor-pointer"}
                      ${isSelected ? "bg-violet-50 ring-2 ring-violet-400 ring-inset" : ""}
                      ${isToday && !isSelected ? "ring-2 ring-violet-300 ring-inset" : ""}
                    `}
                  >
                    <span className={`text-sm font-medium leading-none ${isToday ? "text-violet-600" : "text-stone-700"}`}>
                      {day}
                    </span>
                    {/* Dots row */}
                    {(status !== "none" || hasInsight) && (
                      <div className="flex items-center gap-0.5">
                        {status !== "none" && (
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColors[status]}`} />
                        )}
                        {hasInsight && (
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 px-6 py-3 border-t border-stone-100 flex-wrap">
            {[
              { color: "bg-emerald-500", label: "Both logged" },
              { color: "bg-amber-400", label: "Morning only" },
              { color: "bg-indigo-400", label: "Evening only" },
              { color: "bg-violet-500", label: "AI insight" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-xs text-stone-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDate && (
          <DayDetail
            entry={selectedEntry}
            date={selectedDate}
            goals={goals}
            onDelete={handleEntryDeleted}
            onInsightSaved={handleInsightSaved}
          />
        )}
      </section>
    </main>
  );
}
