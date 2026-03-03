"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getGoals, setGoals, getAllEntries } from "../../lib/storage";

export default function GoalsPage() {
  const [weightGoal, setWeightGoal] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [bodyFatGoal, setBodyFatGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Current stats from most recent entry
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [currentBodyFat, setCurrentBodyFat] = useState<number | null>(null);
  const [currentWeightUnit, setCurrentWeightUnit] = useState<"lbs" | "kg">("lbs");

  useEffect(() => {
    async function load() {
      try {
        const [goals, entries] = await Promise.all([getGoals(), getAllEntries()]);

        if (goals) {
          if (goals.weightGoal != null) setWeightGoal(String(goals.weightGoal));
          if (goals.weightUnit) {
            setWeightUnit(goals.weightUnit);
            setCurrentWeightUnit(goals.weightUnit);
          }
          if (goals.bodyFatGoal != null) setBodyFatGoal(String(goals.bodyFatGoal));
        }

        // Pull latest weight and body fat from most recent entry with data
        for (const entry of entries) {
          const m = entry.morning;
          if (!m) continue;
          if (currentWeight == null && m.weight != null) {
            setCurrentWeight(m.weight);
            if (m.weightUnit) setCurrentWeightUnit(m.weightUnit);
          }
          if (currentBodyFat == null && m.bodyFat != null) {
            setCurrentBodyFat(m.bodyFat);
          }
          if (currentWeight != null && currentBodyFat != null) break;
        }
      } catch {
        // Silently ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { error: err } = await setGoals({
      weightGoal: weightGoal ? parseFloat(weightGoal) : null,
      weightUnit,
      bodyFatGoal: bodyFatGoal ? parseFloat(bodyFatGoal) : null,
    });

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function progressBar(current: number | null, goal: number | null, lowerIsBetter = false) {
    if (current == null || goal == null) return null;
    const diff = lowerIsBetter ? current - goal : goal - current;
    const pct = Math.max(0, Math.min(100, 100 - (Math.abs(diff) / goal) * 100));
    const onTrack = lowerIsBetter ? current <= goal : current >= goal;
    return { diff: Math.abs(diff), pct, onTrack };
  }

  const weightProgress = progressBar(currentWeight, weightGoal ? parseFloat(weightGoal) : null, true);
  const bodyFatProgress = progressBar(currentBodyFat, bodyFatGoal ? parseFloat(bodyFatGoal) : null, true);

  return (
    <main className="min-h-screen bg-stone-50">
      <section className="bg-white border-b border-stone-200 px-6 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="text-xs font-medium text-stone-400 hover:text-stone-600 mb-3 inline-flex items-center gap-1 transition-colors">
            ← Back to home
          </Link>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Goals</h1>
          <p className="mt-1 text-sm text-stone-500">Set your targets and track your progress.</p>
        </div>
      </section>

      <section className="px-6 py-6 max-w-2xl mx-auto space-y-6">
        {loading ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm animate-pulse space-y-4">
            <div className="h-5 bg-stone-200 rounded w-1/3" />
            <div className="h-10 bg-stone-100 rounded" />
            <div className="h-5 bg-stone-200 rounded w-1/3" />
            <div className="h-10 bg-stone-100 rounded" />
          </div>
        ) : (
          <>
            {/* Progress cards */}
            {(currentWeight != null || currentBodyFat != null) && (
              <div className="grid grid-cols-2 gap-3">
                {/* Weight progress */}
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium text-stone-500 mb-1">Current weight</p>
                  <p className="text-2xl font-bold text-stone-800">
                    {currentWeight ?? "—"}
                    <span className="text-sm font-normal text-stone-500 ml-1">{currentWeightUnit}</span>
                  </p>
                  {weightGoal && currentWeight != null && (
                    <>
                      <p className="text-xs text-stone-500 mt-2 mb-1">
                        Goal: {weightGoal} {weightUnit}
                        {weightProgress && (
                          <span className={weightProgress.onTrack ? " text-emerald-600" : ""}>
                            {" "}· {weightProgress.diff.toFixed(1)} {weightUnit} {weightProgress.onTrack ? "achieved" : "to go"}
                          </span>
                        )}
                      </p>
                      {weightProgress && (
                        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${weightProgress.onTrack ? "bg-emerald-500" : "bg-rose-400"}`}
                            style={{ width: `${weightProgress.pct}%` }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Body fat progress */}
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium text-stone-500 mb-1">Current body fat</p>
                  <p className="text-2xl font-bold text-stone-800">
                    {currentBodyFat ?? "—"}
                    <span className="text-sm font-normal text-stone-500 ml-1">%</span>
                  </p>
                  {bodyFatGoal && currentBodyFat != null && (
                    <>
                      <p className="text-xs text-stone-500 mt-2 mb-1">
                        Goal: {bodyFatGoal}%
                        {bodyFatProgress && (
                          <span className={bodyFatProgress.onTrack ? " text-emerald-600" : ""}>
                            {" "}· {bodyFatProgress.diff.toFixed(1)}% {bodyFatProgress.onTrack ? "achieved" : "to go"}
                          </span>
                        )}
                      </p>
                      {bodyFatProgress && (
                        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${bodyFatProgress.onTrack ? "bg-emerald-500" : "bg-rose-400"}`}
                            style={{ width: `${bodyFatProgress.pct}%` }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Goals form */}
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6"
            >
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
              )}
              {saved && (
                <div className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-lg">Goals saved!</div>
              )}

              {/* Weight goal */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Target weight
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    step="0.1"
                    min="50"
                    max="500"
                    placeholder={weightUnit === "lbs" ? "165" : "75"}
                    value={weightGoal}
                    onChange={(e) => setWeightGoal(e.target.value)}
                    className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                  />
                  <div className="flex rounded-lg border border-stone-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setWeightUnit("lbs")}
                      className={`px-4 py-2.5 text-sm font-medium ${
                        weightUnit === "lbs"
                          ? "bg-rose-100 text-rose-900 border-r border-stone-300"
                          : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      lbs
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightUnit("kg")}
                      className={`px-4 py-2.5 text-sm font-medium ${
                        weightUnit === "kg"
                          ? "bg-rose-100 text-rose-900"
                          : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      kg
                    </button>
                  </div>
                </div>
              </div>

              {/* Body fat goal */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Target body fat %
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="60"
                  placeholder="15"
                  value={bodyFatGoal}
                  onChange={(e) => setBodyFatGoal(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-rose-500 text-white font-semibold py-3 px-4 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save goals"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
