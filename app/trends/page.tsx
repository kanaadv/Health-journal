"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { getAllEntries, getGoals } from "../../lib/storage";
import type { DailyEntry, GoalsData, ExerciseEntry } from "../../lib/types";

type Frame = "7D" | "30D" | "90D";

const FRAMES: Frame[] = ["7D", "30D", "90D"];
const FRAME_DAYS: Record<Frame, number> = { "7D": 7, "30D": 30, "90D": 90 };

function labelDate(dateStr: string, frame: Frame): string {
  const d = new Date(dateStr + "T12:00:00");
  if (frame === "7D") return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function filterEntries(entries: DailyEntry[], days: number): DailyEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffStr = localDateStr(cutoff);
  const today = localDateStr(new Date());
  return [...entries]
    .filter((e) => e.date >= cutoffStr && e.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Tooltip ──────────────────────────────────────────────────
interface TooltipPayloadItem {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}
interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  unit?: string;
}
function CustomTooltip({ active, payload, label, unit }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-stone-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}{unit ?? ""}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Chart card wrapper ───────────────────────────────────────
function ChartCard({
  title,
  subtitle,
  children,
  empty,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <div className="mb-4">
        <p className="font-semibold text-stone-800">{title}</p>
        {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
      </div>
      {empty ? (
        <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
          Not enough data yet
        </div>
      ) : (
        children
      )}
    </div>
  );
}

const axisStyle = { fontSize: 11, fill: "#a8a29e" };

export default function TrendsPage() {
  const [allEntries, setAllEntries] = useState<DailyEntry[]>([]);
  const [goals, setGoals] = useState<GoalsData | null>(null);
  const [frame, setFrame] = useState<Frame>("30D");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllEntries(), getGoals()]).then(([e, g]) => {
      setAllEntries(e);
      setGoals(g);
      setLoading(false);
    });
  }, []);

  const entries = filterEntries(allEntries, FRAME_DAYS[frame]);

  // ── Data transforms ────────────────────────────────────────

  const weightData = entries
    .filter((e) => e.morning.weight != null)
    .map((e) => ({ date: labelDate(e.date, frame), value: e.morning.weight! }));

  const bodyFatData = entries
    .filter((e) => e.morning.bodyFat != null)
    .map((e) => ({ date: labelDate(e.date, frame), value: e.morning.bodyFat! }));

  const caloriesData = entries
    .filter((e) => e.evening.calories != null)
    .map((e) => ({ date: labelDate(e.date, frame), value: e.evening.calories! }));

  const proteinData = entries
    .filter((e) => e.evening.protein != null)
    .map((e) => ({ date: labelDate(e.date, frame), value: e.evening.protein! }));

  const sleepData = entries
    .filter((e) => e.morning.sleepHours != null)
    .map((e) => ({ date: labelDate(e.date, frame), value: e.morning.sleepHours! }));

  const carbsData = entries
    .filter((e) => e.evening.carbs != null)
    .map((e) => ({ date: labelDate(e.date, frame), value: e.evening.carbs! }));

  const fatData = entries
    .filter((e) => e.evening.fat != null)
    .map((e) => ({ date: labelDate(e.date, frame), value: e.evening.fat! }));

  const exerciseData = entries.map((e) => {
    const exList: ExerciseEntry[] =
      e.evening.exercises && e.evening.exercises.length > 0
        ? e.evening.exercises
        : e.evening.exercise
        ? [{ name: e.evening.exercise, minutes: e.evening.exerciseMinutes ?? null }]
        : [];
    const total = exList.reduce((s, x) => s + (x.minutes ?? 0), 0);
    return { date: labelDate(e.date, frame), value: total };
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 bg-stone-200 rounded w-32 animate-pulse mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <section className="bg-white border-b border-stone-200 px-6 pt-8 pb-6">
        <div className="max-w-4xl mx-auto flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Trends</h1>
            <p className="text-sm text-stone-500 mt-1">
              {allEntries.length} total entries logged
            </p>
          </div>
          {/* Time frame selector */}
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
            {FRAMES.map((f) => (
              <button
                key={f}
                onClick={() => setFrame(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  frame === f
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* 1. Body Weight */}
          <ChartCard
            title="Body Weight"
            subtitle={goals?.weightGoal ? `Goal: ${goals.weightGoal} ${goals.weightUnit ?? "lbs"}` : undefined}
            empty={weightData.length < 2}
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} domain={["auto", "auto"]} />
                <Tooltip content={<CustomTooltip unit={` ${goals?.weightUnit ?? "lbs"}`} />} />
                {goals?.weightGoal && (
                  <ReferenceLine y={goals.weightGoal} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Goal", fill: "#f59e0b", fontSize: 10 }} />
                )}
                <Line type="monotone" dataKey="value" name="Weight" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Body Fat % */}
          <ChartCard
            title="Body Fat %"
            subtitle={goals?.bodyFatGoal ? `Goal: ${goals.bodyFatGoal}%` : undefined}
            empty={bodyFatData.length < 2}
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={bodyFatData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} domain={["auto", "auto"]} unit="%" />
                <Tooltip content={<CustomTooltip unit="%" />} />
                {goals?.bodyFatGoal && (
                  <ReferenceLine y={goals.bodyFatGoal} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Goal", fill: "#10b981", fontSize: 10 }} />
                )}
                <Line type="monotone" dataKey="value" name="Body Fat" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Daily Calories */}
          <ChartCard
            title="Daily Calories"
            subtitle="From evening check-in"
            empty={caloriesData.length === 0}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={caloriesData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <Tooltip content={<CustomTooltip unit=" kcal" />} />
                <Bar dataKey="value" name="Calories" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Protein */}
          <ChartCard
            title="Daily Protein"
            subtitle="Grams per day"
            empty={proteinData.length === 0}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={proteinData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} unit="g" />
                <Tooltip content={<CustomTooltip unit="g" />} />
                <Bar dataKey="value" name="Protein" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 5. Sleep Hours */}
          <ChartCard
            title="Sleep Hours"
            subtitle="8h target shown"
            empty={sleepData.length === 0}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sleepData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} domain={[0, 12]} unit="h" />
                <Tooltip content={<CustomTooltip unit="h" />} />
                <ReferenceLine y={8} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "8h", fill: "#f59e0b", fontSize: 10 }} />
                <Bar dataKey="value" name="Sleep" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 6. Daily Carbs */}
          <ChartCard
            title="Daily Carbs"
            subtitle="Grams per day"
            empty={carbsData.length === 0}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={carbsData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} unit="g" />
                <Tooltip content={<CustomTooltip unit="g" />} />
                <Bar dataKey="value" name="Carbs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 7. Daily Fat */}
          <ChartCard
            title="Daily Fat"
            subtitle="Grams per day"
            empty={fatData.length === 0}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fatData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} unit="g" />
                <Tooltip content={<CustomTooltip unit="g" />} />
                <Bar dataKey="value" name="Fat" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 8. Exercise Minutes */}
          <ChartCard
            title="Exercise Minutes"
            subtitle="Total per day"
            empty={exerciseData.filter((d) => d.value > 0).length === 0}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={exerciseData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} unit="m" />
                <Tooltip content={<CustomTooltip unit=" min" />} />
                <Bar dataKey="value" name="Minutes" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      </section>
    </main>
  );
}
