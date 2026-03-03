"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getEntry, upsertMorning } from "../../lib/storage";

function MorningForm() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const targetDate = dateParam ?? today;
  const isEditing = dateParam != null && dateParam !== today;

  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [bodyFat, setBodyFat] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [wakeMood, setWakeMood] = useState<number | null>(null);
  const [wakeEnergy, setWakeEnergy] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyLogged, setAlreadyLogged] = useState(false);

  useEffect(() => {
    async function loadExisting() {
      try {
        const entry = await getEntry(targetDate);
        if (entry?.morning) {
          const m = entry.morning;
          if (m.weight != null) setWeight(String(m.weight));
          if (m.weightUnit) setWeightUnit(m.weightUnit);
          if (m.bodyFat != null) setBodyFat(String(m.bodyFat));
          if (m.sleepHours != null) setSleepHours(String(m.sleepHours));
          if (m.wakeMood != null) setWakeMood(m.wakeMood);
          if (m.wakeEnergy != null) setWakeEnergy(m.wakeEnergy);
          if (m.notes) setNotes(m.notes);
          const hasData = m.weight != null || m.sleepHours != null;
          if (hasData) setAlreadyLogged(true);
        }
      } catch {
        // If loading fails, start with empty form
      } finally {
        setLoading(false);
      }
    }
    loadExisting();
  }, [targetDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { error: err } = await upsertMorning(targetDate, {
      weight: weight ? parseFloat(weight) : null,
      weightUnit,
      bodyFat: bodyFat ? parseFloat(bodyFat) : null,
      sleepHours: sleepHours ? parseFloat(sleepHours) : null,
      wakeMood: wakeMood ?? null,
      wakeEnergy: wakeEnergy ?? null,
      notes: notes || undefined,
    });

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
    setAlreadyLogged(true);
  }

  const scaleLabels = ["1", "2", "3", "4", "5"];

  const formattedDate = isEditing
    ? new Date(targetDate + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <main className="min-h-screen bg-stone-50">
      <section className="bg-white border-b border-stone-200 px-6 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <Link
            href={isEditing ? "/diary" : "/"}
            className="text-xs font-medium text-stone-400 hover:text-stone-600 mb-3 inline-flex items-center gap-1 transition-colors"
          >
            ← {isEditing ? "Back to diary" : "Back to home"}
          </Link>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Morning Check-in
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {isEditing
              ? `Editing ${formattedDate}`
              : alreadyLogged && !saved
              ? "Already logged today — update below if needed."
              : "Weight, sleep, and how you feel."}
          </p>
        </div>
      </section>

      <section className="px-6 py-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="animate-pulse space-y-4">
              <div className="h-5 bg-stone-200 rounded w-1/3" />
              <div className="h-10 bg-stone-100 rounded" />
              <div className="h-5 bg-stone-200 rounded w-1/3" />
              <div className="h-10 bg-stone-100 rounded" />
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6"
          >
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
            )}
            {saved && (
              <div className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-lg">
                Saved!{" "}
                <Link href={isEditing ? "/diary" : "/"} className="underline font-medium">
                  {isEditing ? "Back to diary" : "Back to home"}
                </Link>
              </div>
            )}

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Weight</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  step="0.1"
                  min="50"
                  max="500"
                  placeholder={weightUnit === "lbs" ? "175" : "80"}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
                <div className="flex rounded-lg border border-stone-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setWeightUnit("lbs")}
                    className={`px-4 py-2.5 text-sm font-medium ${
                      weightUnit === "lbs"
                        ? "bg-amber-100 text-amber-900 border-r border-stone-300"
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
                        ? "bg-amber-100 text-amber-900"
                        : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    kg
                  </button>
                </div>
              </div>
            </div>

            {/* Body fat */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Body fat % (optional)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="60"
                placeholder="18.5"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>

            {/* Sleep hours */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Sleep hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                placeholder="7"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>

            {/* Wake mood */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Wake mood (1–5)</label>
              <div className="flex gap-2">
                {scaleLabels.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setWakeMood(parseInt(n))}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      wakeMood === parseInt(n)
                        ? "bg-amber-500 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-500 mt-1">1 = rough, 5 = great</p>
            </div>

            {/* Wake energy */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Wake energy (1–5)</label>
              <div className="flex gap-2">
                {scaleLabels.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setWakeEnergy(parseInt(n))}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      wakeEnergy === parseInt(n)
                        ? "bg-amber-500 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-500 mt-1">1 = drained, 5 = energized</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Notes (optional)</label>
              <textarea
                rows={3}
                placeholder="Anything else?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-amber-500 text-white font-semibold py-3 px-4 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : alreadyLogged || isEditing ? "Update morning check-in" : "Save morning check-in"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function MorningPage() {
  return (
    <Suspense>
      <MorningForm />
    </Suspense>
  );
}
