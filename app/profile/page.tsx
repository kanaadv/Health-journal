"use client";

import { useEffect, useState } from "react";
import { getProfile, setProfile } from "../../lib/storage";
import type {
  UserProfile,
  PrimaryGoal,
  ActivityLevel,
  ExperienceLevel,
} from "../../lib/types";

const WORKOUT_TYPE_OPTIONS = [
  "Weight training",
  "Running",
  "Cycling",
  "Swimming",
  "HIIT",
  "Yoga / Pilates",
  "Sports",
  "Walking",
  "Other",
];

const PRIMARY_GOAL_LABELS: Record<PrimaryGoal, string> = {
  lose_fat: "Lose fat",
  build_muscle: "Build muscle",
  maintain: "Maintain",
  improve_fitness: "Improve fitness",
  recomp: "Body recomposition",
};

const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (desk job, minimal movement)",
  lightly_active: "Lightly active (light walking, standing)",
  moderately_active: "Moderately active (on feet most of day)",
  very_active: "Very active (physical job or high daily steps)",
};

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Beginner (< 1 year)",
  intermediate: "Intermediate (1–3 years)",
  advanced: "Advanced (3+ years)",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-5">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-stone-700">
        {label}
        {hint && <span className="ml-1.5 text-xs text-stone-400 font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition";

const selectCls = inputCls + " appearance-none";

export default function ProfilePage() {
  const [form, setForm] = useState<UserProfile>({
    heightUnit: "imperial",
    workoutTypes: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      if (p) setForm(p);
      setLoading(false);
    });
  }, []);

  function set<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function toggleWorkoutType(type: string) {
    const current = form.workoutTypes ?? [];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    set("workoutTypes", next);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await setProfile(form);
    setSaving(false);
    if (!error) setSaved(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50">
        <section className="bg-white border-b border-stone-200 px-6 pt-8 pb-6">
          <div className="max-w-2xl mx-auto">
            <div className="h-7 bg-stone-200 rounded w-32 animate-pulse" />
          </div>
        </section>
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 h-40 animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <section className="bg-white border-b border-stone-200 px-6 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Profile</h1>
          <p className="text-sm text-stone-500 mt-1">
            This context is fed to the AI so every insight and coaching response is tailored to you.
          </p>
        </div>
      </section>

      <form onSubmit={handleSave} className="max-w-2xl mx-auto px-6 py-6 space-y-5">
        {/* Physical */}
        <Section title="Physical profile">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Age">
              <input
                type="number"
                min={10}
                max={100}
                placeholder="e.g. 24"
                value={form.age ?? ""}
                onChange={(e) => set("age", e.target.value ? Number(e.target.value) : null)}
                className={inputCls}
              />
            </Field>
            <Field label="Sex">
              <select
                value={form.sex ?? ""}
                onChange={(e) => set("sex", (e.target.value as UserProfile["sex"]) || null)}
                className={selectCls}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </Field>
          </div>

          <Field label="Height">
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-stone-100 rounded-xl p-1 flex-shrink-0">
                {(["imperial", "metric"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => set("heightUnit", u)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      form.heightUnit === u
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    {u === "imperial" ? "ft / in" : "cm"}
                  </button>
                ))}
              </div>
              {form.heightUnit === "imperial" ? (
                <div className="flex gap-2 flex-1">
                  <input
                    type="number"
                    min={3}
                    max={8}
                    placeholder="ft"
                    value={form.heightFt ?? ""}
                    onChange={(e) => set("heightFt", e.target.value ? Number(e.target.value) : null)}
                    className={inputCls}
                  />
                  <input
                    type="number"
                    min={0}
                    max={11}
                    placeholder="in"
                    value={form.heightIn ?? ""}
                    onChange={(e) => set("heightIn", e.target.value ? Number(e.target.value) : null)}
                    className={inputCls}
                  />
                </div>
              ) : (
                <input
                  type="number"
                  min={100}
                  max={250}
                  placeholder="e.g. 180"
                  value={form.heightCm ?? ""}
                  onChange={(e) => set("heightCm", e.target.value ? Number(e.target.value) : null)}
                  className={inputCls + " flex-1"}
                />
              )}
            </div>
          </Field>
        </Section>

        {/* Goals */}
        <Section title="Goals">
          <Field label="Primary goal">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(PRIMARY_GOAL_LABELS) as [PrimaryGoal, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set("primaryGoal", val)}
                  className={`text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    form.primaryGoal === val
                      ? "bg-violet-50 border-violet-300 text-violet-700"
                      : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Goal timeline" hint="optional — e.g. 'by June 2025' or 'in 3 months'">
            <input
              type="text"
              placeholder="e.g. by June 2025"
              value={form.goalTimeline ?? ""}
              onChange={(e) => set("goalTimeline", e.target.value || null)}
              className={inputCls}
            />
          </Field>
        </Section>

        {/* Nutrition targets */}
        <Section title="Daily nutrition targets">
          <p className="text-xs text-stone-400 -mt-2">
            Set your daily targets. The AI will measure your actual intake against these every day.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Calorie target" hint="kcal">
              <input
                type="number"
                min={500}
                max={6000}
                placeholder="e.g. 2100"
                value={form.caloriTarget ?? ""}
                onChange={(e) => set("caloriTarget", e.target.value ? Number(e.target.value) : null)}
                className={inputCls}
              />
            </Field>
            <Field label="Protein target" hint="grams">
              <input
                type="number"
                min={0}
                max={500}
                placeholder="e.g. 180"
                value={form.proteinTarget ?? ""}
                onChange={(e) => set("proteinTarget", e.target.value ? Number(e.target.value) : null)}
                className={inputCls}
              />
            </Field>
            <Field label="Carb target" hint="grams">
              <input
                type="number"
                min={0}
                max={800}
                placeholder="e.g. 200"
                value={form.carbTarget ?? ""}
                onChange={(e) => set("carbTarget", e.target.value ? Number(e.target.value) : null)}
                className={inputCls}
              />
            </Field>
            <Field label="Fat target" hint="grams">
              <input
                type="number"
                min={0}
                max={300}
                placeholder="e.g. 65"
                value={form.fatTarget ?? ""}
                onChange={(e) => set("fatTarget", e.target.value ? Number(e.target.value) : null)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Dietary notes" hint="optional — e.g. vegetarian, no dairy, IF">
            <input
              type="text"
              placeholder="e.g. no dairy, intermittent fasting 16:8"
              value={form.dietaryNotes ?? ""}
              onChange={(e) => set("dietaryNotes", e.target.value || null)}
              className={inputCls}
            />
          </Field>
        </Section>

        {/* Training */}
        <Section title="Training & activity">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Training days / week">
              <input
                type="number"
                min={0}
                max={7}
                placeholder="e.g. 4"
                value={form.trainingDaysPerWeek ?? ""}
                onChange={(e) => set("trainingDaysPerWeek", e.target.value ? Number(e.target.value) : null)}
                className={inputCls}
              />
            </Field>
            <Field label="Experience level">
              <select
                value={form.experienceLevel ?? ""}
                onChange={(e) =>
                  set("experienceLevel", (e.target.value as ExperienceLevel) || null)
                }
                className={selectCls}
              >
                <option value="">Select</option>
                {(Object.entries(EXPERIENCE_LABELS) as [ExperienceLevel, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Workout types" hint="select all that apply">
            <div className="flex flex-wrap gap-2">
              {WORKOUT_TYPE_OPTIONS.map((t) => {
                const active = (form.workoutTypes ?? []).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleWorkoutType(t)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      active
                        ? "bg-violet-50 border-violet-300 text-violet-700"
                        : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Daily activity level" hint="outside of workouts">
            <div className="space-y-2">
              {(Object.entries(ACTIVITY_LEVEL_LABELS) as [ActivityLevel, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set("activityLevel", val)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    form.activityLevel === val
                      ? "bg-violet-50 border-violet-300 text-violet-700"
                      : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* Sleep */}
        <Section title="Sleep">
          <Field label="Sleep target" hint="hours per night">
            <input
              type="number"
              min={4}
              max={12}
              step={0.5}
              placeholder="e.g. 8"
              value={form.sleepTarget ?? ""}
              onChange={(e) => set("sleepTarget", e.target.value ? Number(e.target.value) : null)}
              className={inputCls}
            />
          </Field>
        </Section>

        {/* Extra context */}
        <Section title="Anything else the AI should know">
          <Field label="Additional context" hint="optional — injuries, schedule, lifestyle factors">
            <textarea
              rows={3}
              placeholder="e.g. recovering from a shoulder injury, travel a lot for work, trying to cut before summer"
              value={form.additionalContext ?? ""}
              onChange={(e) => set("additionalContext", e.target.value || null)}
              className={inputCls + " resize-none"}
            />
          </Field>
        </Section>

        {/* Save */}
        <div className="pb-8">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-2xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save profile"}
          </button>
        </div>
      </form>
    </main>
  );
}
