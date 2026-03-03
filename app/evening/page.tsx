"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getEntry, upsertEvening } from "../../lib/storage";
import type { ExerciseEntry } from "../../lib/types";

async function compressImage(file: File, maxWidth = 1024, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas error")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function EveningForm() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const targetDate = dateParam ?? today;
  const isEditing = dateParam != null && dateParam !== today;

  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);

  // Nutrition
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [parsingNutrition, setParsingNutrition] = useState(false);
  const [nutritionParseError, setNutritionParseError] = useState<string | null>(null);

  // Exercise
  const [exercises, setExercises] = useState<ExerciseEntry[]>([{ name: "", minutes: null }]);
  const [workoutImages, setWorkoutImages] = useState<string[]>([]);
  const [addingWorkoutImage, setAddingWorkoutImage] = useState(false);

  const [socialConnectedness, setSocialConnectedness] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyLogged, setAlreadyLogged] = useState(false);

  const nutritionInputRef = useRef<HTMLInputElement>(null);
  const workoutInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadExisting() {
      try {
        const entry = await getEntry(targetDate);
        if (entry?.evening) {
          const e = entry.evening;
          if (e.mood != null) setMood(e.mood);
          if (e.stress != null) setStress(e.stress);
          if (e.calories != null) setCalories(String(e.calories));
          if (e.protein != null) setProtein(String(e.protein));
          if (e.carbs != null) setCarbs(String(e.carbs));
          if (e.fat != null) setFat(String(e.fat));
          if (e.exercises && e.exercises.length > 0) {
            setExercises(e.exercises);
          } else if (e.exercise) {
            setExercises([{ name: e.exercise, minutes: e.exerciseMinutes ?? null }]);
          }
          if (e.workoutImages && e.workoutImages.length > 0) {
            setWorkoutImages(e.workoutImages);
          }
          if (e.socialConnectedness != null) setSocialConnectedness(e.socialConnectedness);
          if (e.reflection) setReflection(e.reflection);
          const hasData = e.mood != null || e.calories != null;
          if (hasData) setAlreadyLogged(true);
        }
      } catch {
        // start with empty form
      } finally {
        setLoading(false);
      }
    }
    loadExisting();
  }, [targetDate]);

  async function handleNutritionScreenshot(file: File) {
    setParsingNutrition(true);
    setNutritionParseError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/parse-nutrition", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to parse");
      if (data.calories != null) setCalories(String(data.calories));
      if (data.protein != null) setProtein(String(data.protein));
      if (data.carbs != null) setCarbs(String(data.carbs));
      if (data.fat != null) setFat(String(data.fat));
      if (!data.calories && !data.protein && !data.carbs && !data.fat) {
        setNutritionParseError("Couldn't find nutrition data — fill in manually.");
      }
    } catch (err) {
      setNutritionParseError(err instanceof Error ? err.message : "Failed to read screenshot");
    } finally {
      setParsingNutrition(false);
    }
  }

  async function handleWorkoutScreenshot(file: File) {
    setAddingWorkoutImage(true);
    try {
      const compressed = await compressImage(file);
      setWorkoutImages((prev) => [...prev, compressed]);
    } catch {
      // if compression fails, just skip
    } finally {
      setAddingWorkoutImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { error: err } = await upsertEvening(targetDate, {
      mood: mood ?? null,
      stress: stress ?? null,
      calories: calories ? parseFloat(calories) : null,
      protein: protein ? parseFloat(protein) : null,
      carbs: carbs ? parseFloat(carbs) : null,
      fat: fat ? parseFloat(fat) : null,
      exercises: exercises.filter((ex) => ex.name.trim() !== ""),
      workoutImages: workoutImages.length > 0 ? workoutImages : undefined,
      socialConnectedness: socialConnectedness ?? null,
      reflection: reflection || null,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setAlreadyLogged(true);
  }

  const scaleLabels = ["1", "2", "3", "4", "5"];
  const formattedDate = isEditing
    ? new Date(targetDate + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
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
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Evening Check-in</h1>
          <p className="mt-1 text-sm text-stone-500">
            {isEditing
              ? `Editing ${formattedDate}`
              : alreadyLogged && !saved
              ? "Already logged this evening — update below if needed."
              : "Mood, nutrition, and how your day went."}
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

            {/* Mood */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Mood (1–5)</label>
              <div className="flex gap-2">
                {scaleLabels.map((n) => (
                  <button key={n} type="button" onClick={() => setMood(parseInt(n))}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${mood === parseInt(n) ? "bg-indigo-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-500 mt-1">1 = rough day, 5 = great day</p>
            </div>

            {/* Stress */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Stress (1–5)</label>
              <div className="flex gap-2">
                {scaleLabels.map((n) => (
                  <button key={n} type="button" onClick={() => setStress(parseInt(n))}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${stress === parseInt(n) ? "bg-indigo-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-500 mt-1">1 = chill, 5 = very stressed</p>
            </div>

            {/* Nutrition */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-stone-700">Nutrition</p>
                <button
                  type="button"
                  disabled={parsingNutrition}
                  onClick={() => nutritionInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
                >
                  <span>📸</span>
                  <span>{parsingNutrition ? "Reading..." : "Import from MyFitnessPal"}</span>
                </button>
                <input
                  ref={nutritionInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleNutritionScreenshot(file);
                    e.target.value = "";
                  }}
                />
              </div>
              {nutritionParseError && (
                <p className="text-xs text-red-500 mb-2">{nutritionParseError}</p>
              )}
              {parsingNutrition && (
                <div className="flex items-center gap-2 text-sm text-stone-500 mb-3">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-stone-300 border-t-indigo-500 rounded-full animate-spin" />
                  Reading your nutrition data...
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Calories", value: calories, set: setCalories, placeholder: "2100" },
                  { label: "Protein (g)", value: protein, set: setProtein, placeholder: "150" },
                  { label: "Carbs (g)", value: carbs, set: setCarbs, placeholder: "220" },
                  { label: "Fat (g)", value: fat, set: setFat, placeholder: "75" },
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label}>
                    <label className="block text-xs text-stone-500 mb-1">{label}</label>
                    <input
                      type="number" step="1" min="0"
                      placeholder={placeholder}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Exercise */}
            <div>
              <p className="text-sm font-medium text-stone-700 mb-3">Exercise (optional)</p>

              {/* Manual rows */}
              <div className="space-y-2 mb-2">
                {exercises.map((ex, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="e.g. Run, gym, walk"
                      value={ex.name}
                      onChange={(e) => {
                        const updated = [...exercises];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setExercises(updated);
                      }}
                      className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    />
                    <input
                      type="number" step="1" min="0"
                      placeholder="min"
                      value={ex.minutes ?? ""}
                      onChange={(e) => {
                        const updated = [...exercises];
                        updated[i] = { ...updated[i], minutes: e.target.value ? parseInt(e.target.value) : null };
                        setExercises(updated);
                      }}
                      className="w-20 rounded-lg border border-stone-300 px-3 py-2 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    />
                    {exercises.length > 1 && (
                      <button type="button"
                        onClick={() => setExercises(exercises.filter((_, idx) => idx !== i))}
                        className="text-stone-400 hover:text-red-400 transition-colors text-lg leading-none px-1"
                        aria-label="Remove">
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setExercises([...exercises, { name: "", minutes: null }])}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  + Add row
                </button>
                <button
                  type="button"
                  disabled={addingWorkoutImage}
                  onClick={() => workoutInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 transition-colors"
                >
                  <span>📸</span>
                  <span>{addingWorkoutImage ? "Adding..." : "Add Apple Activity screenshot"}</span>
                </button>
                <input
                  ref={workoutInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleWorkoutScreenshot(file);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Workout image previews */}
              {workoutImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {workoutImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img}
                        alt={`Workout ${i + 1}`}
                        className="w-16 h-20 object-cover rounded-lg border border-stone-200"
                      />
                      <button
                        type="button"
                        onClick={() => setWorkoutImages(workoutImages.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <p className="w-full text-xs text-stone-400 mt-1">
                    These screenshots are sent directly to the AI when you generate insights.
                  </p>
                </div>
              )}
            </div>

            {/* Social connectedness */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Social connectedness (1–5, optional)
              </label>
              <div className="flex gap-2">
                {scaleLabels.map((n) => (
                  <button key={n} type="button" onClick={() => setSocialConnectedness(parseInt(n))}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${socialConnectedness === parseInt(n) ? "bg-indigo-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-500 mt-1">1 = isolated, 5 = very connected</p>
            </div>

            {/* Reflection */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                How was today? (optional)
              </label>
              <textarea
                rows={4}
                placeholder="Anything on your mind..."
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-indigo-500 text-white font-semibold py-3 px-4 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : alreadyLogged || isEditing ? "Update evening check-in" : "Save evening check-in"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function EveningPage() {
  return (
    <Suspense>
      <EveningForm />
    </Suspense>
  );
}
