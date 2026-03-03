"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllEntries } from "../../lib/storage";
import type { DailyEntry } from "../../lib/types";

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

function DayDetail({ entry, date }: { entry: DailyEntry | undefined; date: string }) {
  const d = new Date(date + "T12:00:00");
  const label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
        <div>
          <p className="font-semibold text-stone-800">{label}</p>
          <div className="flex gap-3 mt-1">
            {entry?.morning.weight != null || entry?.morning.sleepHours != null
              ? <span className="text-xs text-amber-600 font-medium">☀️ Morning logged</span>
              : <span className="text-xs text-stone-400">☀️ Morning — not logged</span>}
            {entry?.evening.mood != null || entry?.evening.calories != null
              ? <span className="text-xs text-indigo-600 font-medium">🌙 Evening logged</span>
              : <span className="text-xs text-stone-400">🌙 Evening — not logged</span>}
          </div>
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
        </div>
      ) : (
        <div className="px-6 py-8 text-center text-stone-400 text-sm">
          Nothing logged for this day.
        </div>
      )}

      {/* Edit buttons */}
      <div className="border-t border-stone-100 px-6 py-4 flex gap-3">
        <Link href={`/morning?date=${date}`} className="flex-1 text-center text-sm font-medium rounded-xl border border-amber-300 text-amber-700 py-2 hover:bg-amber-50 transition-colors">
          {entry?.morning.weight != null || entry?.morning.sleepHours != null ? "Edit Morning" : "+ Log Morning"}
        </Link>
        <Link href={`/evening?date=${date}`} className="flex-1 text-center text-sm font-medium rounded-xl border border-indigo-300 text-indigo-700 py-2 hover:bg-indigo-50 transition-colors">
          {entry?.evening.mood != null || entry?.evening.calories != null ? "Edit Evening" : "+ Log Evening"}
        </Link>
      </div>
    </div>
  );
}

export default function DiaryPage() {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    getAllEntries().then(setEntries).finally(() => setLoading(false));
  }, []);

  // Build a map for O(1) lookup
  const entryMap = new Map<string, DailyEntry>();
  for (const e of entries) entryMap.set(e.date, e);

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = now.toISOString().slice(0, 10);

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

  // Cells: leading empties + day numbers
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
                const status = entryStatus(entryMap.get(dateStr));
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const isFuture = dateStr > today;

                return (
                  <button
                    key={dateStr}
                    onClick={() => !isFuture && setSelectedDate(isSelected ? null : dateStr)}
                    disabled={isFuture}
                    className={`relative aspect-square flex flex-col items-center justify-center gap-1 transition-colors rounded-lg m-0.5
                      ${isFuture ? "opacity-25 cursor-default" : "hover:bg-stone-50 cursor-pointer"}
                      ${isSelected ? "bg-violet-50 ring-2 ring-violet-400 ring-inset" : ""}
                      ${isToday && !isSelected ? "ring-2 ring-violet-300 ring-inset" : ""}
                    `}
                  >
                    <span className={`text-sm font-medium leading-none ${isToday ? "text-violet-600" : "text-stone-700"}`}>
                      {day}
                    </span>
                    {status !== "none" && (
                      <span className={`w-1.5 h-1.5 rounded-full ${statusColors[status]}`} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 px-6 py-3 border-t border-stone-100">
            {[
              { color: "bg-emerald-500", label: "Both logged" },
              { color: "bg-amber-400", label: "Morning only" },
              { color: "bg-indigo-400", label: "Evening only" },
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
          <DayDetail entry={selectedEntry} date={selectedDate} />
        )}
      </section>
    </main>
  );
}
