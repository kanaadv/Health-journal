"use client";

import { getSupabase } from "./supabase";
import type { MorningData, EveningData, DailyEntry, GoalsData, InsightResult } from "./types";

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
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
