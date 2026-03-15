"use client";

import { getSupabase } from "./supabase";
import type { MorningData, EveningData, DailyEntry, GoalsData, InsightResult, UserProfile } from "./types";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function getUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

export async function getEntry(date: string): Promise<DailyEntry | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    date: data.date,
    morning: (data.morning as MorningData) ?? {},
    evening: (data.evening as EveningData) ?? {},
    score: data.score,
    insights: (data.insights as InsightResult) ?? null,
  };
}

export async function getTodayEntry(): Promise<DailyEntry | null> {
  return getEntry(getToday());
}

export async function upsertMorning(
  date: string,
  data: MorningData
): Promise<{ error: Error | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: new Error("Not connected") };
  const userId = await getUserId();
  if (!userId) return { error: new Error("Not signed in yet — try again in a moment") };

  const { data: existing } = await supabase
    .from("daily_entries")
    .select("id, morning")
    .eq("date", date)
    .maybeSingle();

  const mergedMorning = {
    ...(existing?.morning ?? {}),
    ...data,
  };

  const { error } = await supabase.from("daily_entries").upsert(
    {
      user_id: userId,
      date,
      morning: mergedMorning,
    },
    { onConflict: "user_id,date" }
  );

  return { error: error ? new Error(error.message) : null };
}

export async function upsertEvening(
  date: string,
  data: EveningData
): Promise<{ error: Error | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: new Error("Not connected") };
  const userId = await getUserId();
  if (!userId) return { error: new Error("Not signed in yet — try again in a moment") };

  const { data: existing } = await supabase
    .from("daily_entries")
    .select("id, evening")
    .eq("date", date)
    .maybeSingle();

  const mergedEvening = {
    ...(existing?.evening ?? {}),
    ...data,
  };

  const { error } = await supabase.from("daily_entries").upsert(
    {
      user_id: userId,
      date,
      evening: mergedEvening,
    },
    { onConflict: "user_id,date" }
  );

  return { error: error ? new Error(error.message) : null };
}

export async function getAllEntries(): Promise<DailyEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("daily_entries")
    .select("*")
    .order("date", { ascending: false });

  if (error || !data) return [];

  return data.map((row: { id?: string; date: string; morning?: unknown; evening?: unknown; score?: number; insights?: unknown }) => ({
    id: row.id,
    date: row.date,
    morning: (row.morning as MorningData) ?? {},
    evening: (row.evening as EveningData) ?? {},
    score: row.score,
    insights: (row.insights as InsightResult) ?? null,
  }));
}

export async function getGoals(): Promise<GoalsData | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    weightGoal: data.weight_goal,
    weightUnit: (data.weight_unit as "lbs" | "kg") ?? "lbs",
    bodyFatGoal: data.body_fat_goal,
    updatedAt: data.updated_at,
  };
}

export async function setGoals(
  goals: GoalsData
): Promise<{ error: Error | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: new Error("Not connected") };
  const userId = await getUserId();
  if (!userId) return { error: new Error("Not signed in yet") };

  const { error } = await supabase
    .from("goals")
    .upsert(
      {
        user_id: userId,
        weight_goal: goals.weightGoal,
        weight_unit: goals.weightUnit ?? "lbs",
        body_fat_goal: goals.bodyFatGoal,
      },
      { onConflict: "user_id" }
    );

  return { error: error ? new Error(error.message) : null };
}

export async function saveInsight(
  date: string,
  insight: InsightResult
): Promise<{ error: Error | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: new Error("Not connected") };
  const userId = await getUserId();
  if (!userId) return { error: new Error("Not signed in") };

  const { error } = await supabase.from("daily_entries").upsert(
    {
      user_id: userId,
      date,
      insights: { ...insight, generatedAt: new Date().toISOString() },
    },
    { onConflict: "user_id,date" }
  );

  return { error: error ? new Error(error.message) : null };
}

export async function deleteEntry(date: string): Promise<{ error: Error | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: new Error("Not connected") };
  const userId = await getUserId();
  if (!userId) return { error: new Error("Not signed in") };

  const { error } = await supabase
    .from("daily_entries")
    .delete()
    .eq("user_id", userId)
    .eq("date", date);

  return { error: error ? new Error(error.message) : null };
}

export async function getProfile(): Promise<UserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    age: data.age,
    sex: data.sex,
    heightFt: data.height_ft,
    heightIn: data.height_in,
    heightCm: data.height_cm,
    heightUnit: data.height_unit ?? "imperial",
    primaryGoal: data.primary_goal,
    targetWeight: data.target_weight,
    targetBodyFat: data.target_body_fat,
    goalTimeline: data.goal_timeline,
    caloriTarget: data.calorie_target,
    proteinTarget: data.protein_target,
    carbTarget: data.carb_target,
    fatTarget: data.fat_target,
    dietaryNotes: data.dietary_notes,
    trainingDaysPerWeek: data.training_days_per_week,
    workoutTypes: data.workout_types ?? [],
    activityLevel: data.activity_level,
    experienceLevel: data.experience_level,
    sleepTarget: data.sleep_target,
    additionalContext: data.additional_context,
    updatedAt: data.updated_at,
  };
}

export async function setProfile(profile: UserProfile): Promise<{ error: Error | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: new Error("Not connected") };
  const userId = await getUserId();
  if (!userId) return { error: new Error("Not signed in") };

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      age: profile.age,
      sex: profile.sex,
      height_ft: profile.heightFt,
      height_in: profile.heightIn,
      height_cm: profile.heightCm,
      height_unit: profile.heightUnit ?? "imperial",
      primary_goal: profile.primaryGoal,
      target_weight: profile.targetWeight,
      target_body_fat: profile.targetBodyFat,
      goal_timeline: profile.goalTimeline,
      calorie_target: profile.caloriTarget,
      protein_target: profile.proteinTarget,
      carb_target: profile.carbTarget,
      fat_target: profile.fatTarget,
      dietary_notes: profile.dietaryNotes,
      training_days_per_week: profile.trainingDaysPerWeek,
      workout_types: profile.workoutTypes ?? [],
      activity_level: profile.activityLevel,
      experience_level: profile.experienceLevel,
      sleep_target: profile.sleepTarget,
      additional_context: profile.additionalContext,
    },
    { onConflict: "user_id" }
  );

  return { error: error ? new Error(error.message) : null };
}
