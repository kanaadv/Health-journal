"use client";

import { useEffect, useRef, useState } from "react";
import { getAllEntries, deleteEntry, saveInsight, getGoals, upsertMorning, upsertEvening } from "../../lib/storage";
import type { DailyEntry, GoalsData, InsightResult, MorningData, EveningData, ExerciseEntry } from "../../lib/types";

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
  const hasEvening = entry.evening.calories != null || (entry.evening.exercises && entry.evening.exercises.length > 0);
  if (hasMorning && hasEvening) return "both";
  if (hasMorning) return "morning";
  if (hasEvening) return "evening";
  return "none";
}

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

function InsightPanel({ insight }: { insight: InsightResult }) {
  const scoreColor = insight.overallScore >= 80 ? "text-emerald-600" : insight.overallScore >= 60 ? "text-amber-500" : "text-red-500";
  const scoreBg = insight.overallScore >= 80 ? "bg-emerald-50" : insight.overallScore >= 60 ? "bg-amber-50" : "bg-red-50";
  const generatedAt = insight.generatedAt
    ? new Date(insight.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-4">
      <div className="border-t border-stone-100" />
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-violet-700">✨ Daily AI Insight</p>
          {generatedAt && <span className="text-xs text-stone-400">Generated at {generatedAt}</span>}
        </div>
        <div className={`inline-flex items-baseline gap-1 px-3 py-1.5 rounded-lg ${scoreBg} mb-3`}>
          <span className={`text-2xl font-bold ${scoreColor}`}>{insight.overallScore}</span>
          <span className="text-stone-400 text-sm">/100</span>
        </div>
        <p className="text-sm text-stone-700 leading-relaxed mb-4">{insight.summary}</p>
        {insight.highlights.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Highlights</p>
            <ul className="space-y-1">
              {insight.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-700"><span className="text-emerald-500 flex-shrink-0">✓</span>{h}</li>
              ))}
            </ul>
          </div>
        )}
        {insight.areasToImprove.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">To Work On</p>
            <ul className="space-y-1">
              {insight.areasToImprove.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-700"><span className="text-amber-400 flex-shrink-0">→</span>{a}</li>
              ))}
            </ul>
          </div>
        )}
        {insight.actionableTips.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Tips</p>
            <ul className="space-y-1">
              {insight.actionableTips.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-700"><span className="text-violet-400 flex-shrink-0">•</span>{t}</li>
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
  onMorningSaved,
  onEveningSaved,
}: {
  entry: DailyEntry | undefined;
  date: string;
  goals: GoalsData | null;
  onDelete: (date: string) => void;
  onInsightSaved: (date: string, insight: InsightResult) => void;
  onMorningSaved: (date: string, data: MorningData) => void;
  onEveningSaved: (date: string, data: EveningData) => void;
}) {
  const d = new Date(date + "T12:00:00");
  const label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const [editMode, setEditMode] = useState<"morning" | "evening" | null>(null);
  const [showInsight, setShowInsight] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Morning form
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [bodyFat, setBodyFat] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [savingMorning, setSavingMorning] = useState(false);
  const [morningError, setMorningError] = useState<string | null>(null);

  // Evening form
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [exercises, setExercises] = useState<ExerciseEntry[]>([{ name: "", minutes: null }]);
  const [workoutImages, setWorkoutImages] = useState<string[]>([]);
  const [parsingNutrition, setParsingNutrition] = useState(false);
  const [nutritionParseError, setNutritionParseError] = useState<string | null>(null);
  const [addingWorkoutImage, setAddingWorkoutImage] = useState(false);
  const [savingEvening, setSavingEvening] = useState(false);
  const [eveningError, setEveningError] = useState<string | null>(null);

  const nutritionInputRef = useRef<HTMLInputElement>(null);
  const workoutInputRef = useRef<HTMLInputElement>(null);

  function openMorning() {
    setWeight(entry?.morning.weight != null ? String(entry.morning.weight) : "");
    setWeightUnit(entry?.morning.weightUnit ?? "lbs");
    setBodyFat(entry?.morning.bodyFat != null ? String(entry.morning.bodyFat) : "");
    setSleepHours(entry?.morning.sleepHours != null ? String(entry.morning.sleepHours) : "");
    setMorningError(null);
    setEditMode("morning");
  }

  function openEvening() {
    setCalories(entry?.evening.calories != null ? String(entry.evening.calories) : "");
    setProtein(entry?.evening.protein != null ? String(entry.evening.protein) : "");
    setCarbs(entry?.evening.carbs != null ? String(entry.evening.carbs) : "");
    setFat(entry?.evening.fat != null ? String(entry.evening.fat) : "");
    const exList = entry?.evening.exercises?.length
      ? entry.evening.exercises
      : entry?.evening.exercise
      ? [{ name: entry.evening.exercise, minutes: entry.evening.exerciseMinutes ?? null }]
      : [{ name: "", minutes: null }];
    setExercises(exList);
    setWorkoutImages(entry?.evening.workoutImages ?? []);
    setNutritionParseError(null);
    setEveningError(null);
    setEditMode("evening");
  }

  async function saveMorning() {
    setSavingMorning(true);
    setMorningError(null);
    const data: MorningData = {
      weight: weight ? parseFloat(weight) : null,
      weightUnit,
      bodyFat: bodyFat ? parseFloat(bodyFat) : null,
      sleepHours: sleepHours ? parseFloat(sleepHours) : null,
    };
    const { error } = await upsertMorning(date, data);
    setSavingMorning(false);
    if (error) { setMorningError(error.message); return; }
    onMorningSaved(date, data);
    setEditMode(null);
  }

  async function saveEvening() {
    setSavingEvening(true);
    setEveningError(null);
    const data: EveningData = {
      calories: calories ? parseFloat(calories) : null,
      protein: protein ? parseFloat(protein) : null,
      carbs: carbs ? parseFloat(carbs) : null,
      fat: fat ? parseFloat(fat) : null,
      exercises: exercises.filter((ex) => ex.name.trim() !== ""),
      workoutImages: workoutImages.length > 0 ? workoutImages : undefined,
    };
    const { error } = await upsertEvening(date, data);
    setSavingEvening(false);
    if (error) { setEveningError(error.message); return; }
    onEveningSaved(date, data);
    setEditMode(null);
  }

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
    } catch { /* skip */ } finally {
      setAddingWorkoutImage(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await deleteEntry(date);
    setDeleting(false);
    if (!error) onDelete(date);
  }

  async function handleGenerateInsight() {
    if (!entry) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const strippedEntry = { ...entry, evening: { ...entry.evening, workoutImages: undefined } };
      const imgs = entry.evening.workoutImages ?? [];
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: [strippedEntry], goals, period: "today", workoutImages: imgs.slice(0, 8) }),
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

  const hasMorning = entry?.morning.weight != null || entry?.morning.sleepHours != null;
  const hasEvening = entry?.evening.calories != null || (entry?.evening.exercises && entry.evening.exercises.length > 0);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-100">
        <p className="font-semibold text-stone-800">{label}</p>
        <div className="flex gap-3 mt-1 flex-wrap">
          {hasMorning ? <span className="text-xs text-amber-600 font-medium">☀️ Morning logged</span> : <span className="text-xs text-stone-400">☀️ Morning — not logged</span>}
          {hasEvening ? <span className="text-xs text-indigo-600 font-medium">🌙 Evening logged</span> : <span className="text-xs text-stone-400">🌙 Evening — not logged</span>}
          {entry?.insights && <span className="text-xs text-violet-600 font-medium">✨ Insight saved</span>}
        </div>
      </div>

      {/* Data summary (when not editing) */}
      {editMode === null && entry && (hasMorning || hasEvening) && (
        <div className="px-6 py-5 space-y-5">
          {hasMorning && (
            <div>
              <p className="text-sm font-semibold text-amber-700 mb-3">☀️ Morning</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
                {entry.morning.weight != null && (<><span className="text-stone-500">Weight</span><span className="text-stone-800 font-medium">{entry.morning.weight} {entry.morning.weightUnit ?? "lbs"}</span></>)}
                {entry.morning.bodyFat != null && (<><span className="text-stone-500">Body fat</span><span className="text-stone-800 font-medium">{entry.morning.bodyFat}%</span></>)}
                {entry.morning.sleepHours != null && (<><span className="text-stone-500">Sleep</span><span className="text-stone-800 font-medium">{entry.morning.sleepHours} hrs</span></>)}
              </div>
            </div>
          )}

          {hasMorning && hasEvening && <div className="border-t border-stone-100" />}

          {hasEvening && (
            <div>
              <p className="text-sm font-semibold text-indigo-700 mb-3">🌙 Evening</p>
              <div className="space-y-4 text-sm">
                {(entry.evening.calories != null || entry.evening.protein != null) && (
                  <div className="flex gap-3 flex-wrap">
                    {entry.evening.calories != null && <div className="bg-stone-50 rounded-lg px-3 py-2 text-center"><p className="text-stone-800 font-semibold">{entry.evening.calories}</p><p className="text-stone-400 text-xs">cal</p></div>}
                    {entry.evening.protein != null && <div className="bg-stone-50 rounded-lg px-3 py-2 text-center"><p className="text-stone-800 font-semibold">{entry.evening.protein}g</p><p className="text-stone-400 text-xs">protein</p></div>}
                    {entry.evening.carbs != null && <div className="bg-stone-50 rounded-lg px-3 py-2 text-center"><p className="text-stone-800 font-semibold">{entry.evening.carbs}g</p><p className="text-stone-400 text-xs">carbs</p></div>}
                    {entry.evening.fat != null && <div className="bg-stone-50 rounded-lg px-3 py-2 text-center"><p className="text-stone-800 font-semibold">{entry.evening.fat}g</p><p className="text-stone-400 text-xs">fat</p></div>}
                  </div>
                )}
                {(() => {
                  const exList = entry.evening.exercises?.length ? entry.evening.exercises : entry.evening.exercise ? [{ name: entry.evening.exercise, minutes: entry.evening.exerciseMinutes ?? null }] : [];
                  if (!exList.length) return null;
                  return (
                    <div className="space-y-1">
                      {exList.map((ex, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-stone-800 font-medium">{ex.name}</span>
                          {ex.minutes != null && <span className="text-stone-500">{ex.minutes} min</span>}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {showInsight && entry.insights && <InsightPanel insight={entry.insights} />}
        </div>
      )}

      {/* Inline morning form */}
      {editMode === "morning" && (
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm font-semibold text-amber-700">☀️ Morning</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Weight</label>
              <div className="flex gap-1">
                <input
                  type="number" step="0.1" min="0" placeholder="175"
                  value={weight} onChange={(e) => setWeight(e.target.value)}
                  className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setWeightUnit(u => u === "lbs" ? "kg" : "lbs")}
                  className="px-2 py-2 rounded-lg border border-stone-300 text-xs text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  {weightUnit}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Body fat %</label>
              <input
                type="number" step="0.1" min="0" max="60" placeholder="18"
                value={bodyFat} onChange={(e) => setBodyFat(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Sleep hours</label>
              <input
                type="number" step="0.5" min="0" max="24" placeholder="7.5"
                value={sleepHours} onChange={(e) => setSleepHours(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>
          </div>

          {morningError && <p className="text-xs text-red-500">{morningError}</p>}

          <div className="flex gap-2">
            <button
              onClick={saveMorning}
              disabled={savingMorning}
              className="flex-1 rounded-xl bg-amber-500 text-white font-semibold py-2 text-sm hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {savingMorning ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditMode(null)}
              className="px-4 rounded-xl border border-stone-200 text-stone-500 text-sm hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline evening form */}
      {editMode === "evening" && (
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm font-semibold text-indigo-700">🌙 Evening</p>

          {/* Nutrition */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-stone-600">Nutrition</p>
              <button
                type="button"
                disabled={parsingNutrition}
                onClick={() => nutritionInputRef.current?.click()}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                <span>📸</span>
                <span>{parsingNutrition ? "Reading..." : "Import from MyFitnessPal"}</span>
              </button>
              <input ref={nutritionInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleNutritionScreenshot(f); e.target.value = ""; }} />
            </div>
            {nutritionParseError && <p className="text-xs text-red-500 mb-2">{nutritionParseError}</p>}
            {parsingNutrition && (
              <div className="flex items-center gap-2 text-sm text-stone-500 mb-2">
                <span className="w-3.5 h-3.5 border-2 border-stone-300 border-t-indigo-500 rounded-full animate-spin inline-block" />
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
                    type="number" step="1" min="0" placeholder={placeholder}
                    value={value} onChange={(e) => set(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Exercise */}
          <div>
            <p className="text-xs font-medium text-stone-600 mb-2">Exercise</p>
            <div className="space-y-2 mb-2">
              {exercises.map((ex, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text" placeholder="e.g. Run, gym, walk"
                    value={ex.name}
                    onChange={(e) => { const u = [...exercises]; u[i] = { ...u[i], name: e.target.value }; setExercises(u); }}
                    className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                  <input
                    type="number" step="1" min="0" placeholder="min"
                    value={ex.minutes ?? ""}
                    onChange={(e) => { const u = [...exercises]; u[i] = { ...u[i], minutes: e.target.value ? parseInt(e.target.value) : null }; setExercises(u); }}
                    className="w-20 rounded-lg border border-stone-300 px-3 py-2 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                  {exercises.length > 1 && (
                    <button type="button" onClick={() => setExercises(exercises.filter((_, idx) => idx !== i))}
                      className="text-stone-400 hover:text-red-400 transition-colors text-lg px-1">×</button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setExercises([...exercises, { name: "", minutes: null }])}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add row</button>
              <button type="button" disabled={addingWorkoutImage} onClick={() => workoutInputRef.current?.click()}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50">
                <span>📸</span>
                <span>{addingWorkoutImage ? "Adding..." : "Add Apple Activity screenshot"}</span>
              </button>
              <input ref={workoutInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleWorkoutScreenshot(f); e.target.value = ""; }} />
            </div>
            {workoutImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {workoutImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt={`Workout ${i + 1}`} className="w-16 h-20 object-cover rounded-lg border border-stone-200" />
                    <button type="button" onClick={() => setWorkoutImages(workoutImages.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {eveningError && <p className="text-xs text-red-500">{eveningError}</p>}

          <div className="flex gap-2">
            <button
              onClick={saveEvening}
              disabled={savingEvening}
              className="flex-1 rounded-xl bg-indigo-500 text-white font-semibold py-2 text-sm hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {savingEvening ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditMode(null)}
              className="px-4 rounded-xl border border-stone-200 text-stone-500 text-sm hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="border-t border-stone-100 px-6 py-4 space-y-3">
        {/* Log/Edit row */}
        {editMode === null && (
          <div className="flex gap-3">
            <button
              onClick={editMode === null ? openMorning : () => setEditMode(null)}
              className="flex-1 text-center text-sm font-medium rounded-xl border border-amber-300 text-amber-700 py-2 hover:bg-amber-50 transition-colors"
            >
              {hasMorning ? "Edit Morning" : "+ Log Morning"}
            </button>
            <button
              onClick={editMode === null ? openEvening : () => setEditMode(null)}
              className="flex-1 text-center text-sm font-medium rounded-xl border border-indigo-300 text-indigo-700 py-2 hover:bg-indigo-50 transition-colors"
            >
              {hasEvening ? "Edit Evening" : "+ Log Evening"}
            </button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="text-sm font-medium rounded-xl border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 px-3 py-2 transition-colors">
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleDelete} disabled={deleting}
                  className="text-sm font-medium rounded-xl border border-red-300 text-red-600 hover:bg-red-50 px-3 py-2 transition-colors disabled:opacity-50">
                  {deleting ? "Deleting..." : "Confirm"}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="text-sm font-medium rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 px-3 py-2 transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Insight row */}
        {editMode === null && entry && (
          <div className="flex gap-3">
            {entry.insights && (
              <button onClick={() => setShowInsight((v) => !v)}
                className="flex-1 text-center text-sm font-medium rounded-xl border border-violet-300 text-violet-700 py-2 hover:bg-violet-50 transition-colors">
                {showInsight ? "Hide AI Insight" : "View AI Insight"}
              </button>
            )}
            <button
              onClick={handleGenerateInsight}
              disabled={generating}
              className={`text-sm font-medium rounded-xl border py-2 px-4 transition-colors disabled:opacity-50 ${
                entry.insights ? "border-stone-200 text-stone-500 hover:bg-stone-50" : "flex-1 border-violet-300 text-violet-700 hover:bg-violet-50"
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
        {generateError && <p className="text-xs text-red-500">{generateError}</p>}
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
    setEntries((prev) => prev.map((e) => e.date === date ? { ...e, insights: insight } : e));
  }

  function handleMorningSaved(date: string, data: MorningData) {
    setEntries((prev) => {
      const exists = prev.find((e) => e.date === date);
      if (exists) return prev.map((e) => e.date === date ? { ...e, morning: { ...e.morning, ...data } } : e);
      return [...prev, { date, morning: data, evening: {} }];
    });
  }

  function handleEveningSaved(date: string, data: EveningData) {
    setEntries((prev) => {
      const exists = prev.find((e) => e.date === date);
      if (exists) return prev.map((e) => e.date === date ? { ...e, evening: { ...e.evening, ...data } } : e);
      return [...prev, { date, morning: {}, evening: data }];
    });
  }

  const entryMap = new Map<string, DailyEntry>();
  for (const e of entries) entryMap.set(e.date, e);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1);
    setSelectedDate(null);
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const statusColors: Record<string, string> = {
    both: "bg-emerald-500", morning: "bg-amber-400", evening: "bg-indigo-400", none: "",
  };

  const selectedEntry = selectedDate ? entryMap.get(selectedDate) : undefined;

  return (
    <main className="min-h-screen bg-stone-50">
      <section className="bg-white border-b border-stone-200 px-6 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Health Diary</h1>
          <p className="text-sm text-stone-500 mt-1">{entries.length} entries logged — click any day to log or review</p>
        </div>
      </section>

      <section className="px-6 py-6 max-w-2xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-600 transition-colors text-lg">‹</button>
            <p className="font-semibold text-stone-800">{MONTHS[viewMonth]} {viewYear}</p>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-600 transition-colors text-lg">›</button>
          </div>

          <div className="grid grid-cols-7 border-b border-stone-100">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-stone-400 uppercase tracking-wide">{d}</div>
            ))}
          </div>

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
                    <span className={`text-sm font-medium leading-none ${isToday ? "text-violet-600" : "text-stone-700"}`}>{day}</span>
                    {(status !== "none" || hasInsight) && (
                      <div className="flex items-center gap-0.5">
                        {status !== "none" && <span className={`w-1.5 h-1.5 rounded-full ${statusColors[status]}`} />}
                        {hasInsight && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

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

        {selectedDate && (
          <DayDetail
            entry={selectedEntry}
            date={selectedDate}
            goals={goals}
            onDelete={handleEntryDeleted}
            onInsightSaved={handleInsightSaved}
            onMorningSaved={handleMorningSaved}
            onEveningSaved={handleEveningSaved}
          />
        )}
      </section>
    </main>
  );
}
