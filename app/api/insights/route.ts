import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { DailyEntry, GoalsData, ExerciseEntry, UserProfile } from "../../../lib/types";

const SYSTEM_PROMPT = `You are the user's personal health coach with full access to their diary data. Your job is to give a deeply personal, data-driven analysis — not generic advice. Every single thing you say must reference their actual numbers.

---

CRITICAL RULES — READ THESE FIRST:

1. NEVER give generic advice. If you say "eat more protein", you must say "you averaged Xg protein this week, your target is Yg — that's a Zg gap every day."
2. COMPARE periods. If you have enough data, compare this week to last week, or this month to last month. "Your calories averaged 1,850 this week vs 2,100 last week — you're actually in a bigger deficit than you think."
3. REFERENCE SPECIFIC DAYS. "You nailed protein on Monday and Tuesday (180g, 175g) but dropped off Wednesday to Friday (90g, 85g, 70g)."
4. USE THEIR PROFILE TARGETS as the benchmark for everything. If their protein target is 180g and they hit 120g, say so explicitly.
5. BE BLUNT. If they had a bad week, say so. If they only logged 2 out of 7 days, call it out.
6. NO CORPORATE WELLNESS SPEAK. No "optimise", "holistic", "metrics", "leverage". Talk like a real person.

---

SCORING INSTRUCTIONS:

Score out of 100, using the user's profile targets (not generic benchmarks):
- Nutrition (40 pts): How close were their actual calories and macros to their stated targets, and how consistent across days. Use their profile calorie/protein/carb/fat targets if set.
- Physical metrics (30 pts): Movement toward their target weight and body fat %. Reward directional progress.
- Sleep (20 pts): vs. their personal sleep target (or 8h default if not set).
- Consistency (10 pts): Did they actually log data? Gaps hurt.

---

CHECKLIST INSTRUCTIONS:

Generate a "dailyChecklist" — a list of key targets vs. actuals for the most recent day in the data (or averaged across the period if multi-day). Include:
- Calories (target vs actual if available)
- Protein (target vs actual if available)
- Carbs (target vs actual if available)
- Fat (target vs actual if available)
- Sleep (target vs actual if available)
- Morning logged (yes/no)
- Evening logged (yes/no)
- Workout done (yes/no — based on exercises logged)

Only include items where you have either a target or actual data. Set "met" to true if actual >= target (for sleep/protein/carbs/fat/calories within 10% either side), or if the action was completed (for logging/workout). Use null for target or actual if you don't have that info.

---

OUTPUT FORMAT:

Return ONLY a JSON object. No preamble, no text outside the JSON:

{
  "period": "today | week | month | threeMonths",
  "overallScore": 0-100,
  "scoreBreakdown": {
    "nutrition": 0-40,
    "physicalMetrics": 0-30,
    "sleep": 0-20,
    "consistency": 0-10
  },
  "summary": "2-3 sentences. Be specific — actual numbers, actual days, actual comparisons. No vague statements.",
  "highlights": ["specific win with a real number in it", "another win with data"],
  "areasToImprove": ["specific gap with actual vs target numbers", "another one"],
  "actionableTips": ["concrete, specific advice tied to their actual data — not generic", "another tip"],
  "notablePatterns": "Any real correlation in the data — e.g. 'The 3 days you slept under 6h, your calories were 400+ over target'. Null if nothing real to say.",
  "dailyChecklist": [
    { "item": "Calories", "target": "2100 kcal", "actual": "1850 kcal", "met": false },
    { "item": "Protein", "target": "180g", "actual": "165g", "met": false },
    { "item": "Carbs", "target": "200g", "actual": "210g", "met": true },
    { "item": "Fat", "target": "65g", "actual": "58g", "met": true },
    { "item": "Sleep", "target": "8h", "actual": "6.5h", "met": false },
    { "item": "Morning logged", "target": null, "actual": null, "met": true },
    { "item": "Evening logged", "target": null, "actual": null, "met": true },
    { "item": "Workout", "target": null, "actual": null, "met": false }
  ]
}`;

function buildProfileBlock(profile: UserProfile | null): string {
  if (!profile) return "";

  const parts: string[] = [];

  if (profile.age) parts.push(`Age: ${profile.age}`);
  if (profile.sex && profile.sex !== "prefer_not_to_say") parts.push(`Sex: ${profile.sex}`);

  if (profile.heightUnit === "imperial" && profile.heightFt != null) {
    parts.push(`Height: ${profile.heightFt}ft ${profile.heightIn ?? 0}in`);
  } else if (profile.heightCm != null) {
    parts.push(`Height: ${profile.heightCm}cm`);
  }

  if (profile.primaryGoal) {
    const labels: Record<string, string> = {
      lose_fat: "lose fat",
      build_muscle: "build muscle",
      maintain: "maintain",
      improve_fitness: "improve fitness",
      recomp: "body recomposition",
    };
    parts.push(`Primary goal: ${labels[profile.primaryGoal] ?? profile.primaryGoal}`);
  }
  if (profile.goalTimeline) parts.push(`Timeline: ${profile.goalTimeline}`);

  if (profile.caloriTarget) parts.push(`Daily calorie target: ${profile.caloriTarget} kcal`);
  if (profile.proteinTarget) parts.push(`Daily protein target: ${profile.proteinTarget}g`);
  if (profile.carbTarget) parts.push(`Daily carb target: ${profile.carbTarget}g`);
  if (profile.fatTarget) parts.push(`Daily fat target: ${profile.fatTarget}g`);
  if (profile.dietaryNotes) parts.push(`Dietary notes: ${profile.dietaryNotes}`);

  if (profile.trainingDaysPerWeek != null) parts.push(`Trains: ${profile.trainingDaysPerWeek}x/week`);
  if (profile.workoutTypes?.length) parts.push(`Workout types: ${profile.workoutTypes.join(", ")}`);
  if (profile.activityLevel) {
    const actLabels: Record<string, string> = {
      sedentary: "sedentary",
      lightly_active: "lightly active",
      moderately_active: "moderately active",
      very_active: "very active",
    };
    parts.push(`Activity level: ${actLabels[profile.activityLevel] ?? profile.activityLevel}`);
  }
  if (profile.experienceLevel) parts.push(`Training experience: ${profile.experienceLevel}`);
  if (profile.sleepTarget) parts.push(`Sleep target: ${profile.sleepTarget}h`);
  if (profile.additionalContext) parts.push(`Additional context: ${profile.additionalContext}`);

  if (!parts.length) return "";
  return `\nUSER PROFILE:\n${parts.join("\n")}\n`;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function buildStatsBlock(entries: DailyEntry[], profile: UserProfile | null): string {
  const withCal = entries.filter((e) => e.evening.calories != null);
  const withPro = entries.filter((e) => e.evening.protein != null);
  const withCarb = entries.filter((e) => e.evening.carbs != null);
  const withFat = entries.filter((e) => e.evening.fat != null);
  const withSleep = entries.filter((e) => e.morning.sleepHours != null);
  const withWeight = entries.filter((e) => e.morning.weight != null);
  const withBf = entries.filter((e) => e.morning.bodyFat != null);
  const withExercise = entries.filter(
    (e) => (e.evening.exercises && e.evening.exercises.length > 0) || e.evening.exercise
  );

  const lines: string[] = [];

  const avgCal = avg(withCal.map((e) => e.evening.calories!));
  if (avgCal != null) {
    const calTarget = profile?.caloriTarget;
    const diff = calTarget ? Math.round(avgCal - calTarget) : null;
    lines.push(
      `Average calories: ${avgCal} kcal/day${calTarget ? ` (target: ${calTarget}, avg diff: ${diff! >= 0 ? "+" : ""}${diff})` : ""}`
    );
  }

  const avgPro = avg(withPro.map((e) => e.evening.protein!));
  if (avgPro != null) {
    const proTarget = profile?.proteinTarget;
    const diff = proTarget ? Math.round(avgPro - proTarget) : null;
    lines.push(
      `Average protein: ${avgPro}g/day${proTarget ? ` (target: ${proTarget}g, avg diff: ${diff! >= 0 ? "+" : ""}${diff}g)` : ""}`
    );
  }

  const avgCarb = avg(withCarb.map((e) => e.evening.carbs!));
  if (avgCarb != null) {
    const carbTarget = profile?.carbTarget;
    lines.push(`Average carbs: ${avgCarb}g/day${carbTarget ? ` (target: ${carbTarget}g)` : ""}`);
  }

  const avgFat = avg(withFat.map((e) => e.evening.fat!));
  if (avgFat != null) {
    const fatTarget = profile?.fatTarget;
    lines.push(`Average fat: ${avgFat}g/day${fatTarget ? ` (target: ${fatTarget}g)` : ""}`);
  }

  const avgSleep = avg(withSleep.map((e) => e.morning.sleepHours!));
  if (avgSleep != null) {
    const sleepTarget = profile?.sleepTarget ?? 8;
    lines.push(`Average sleep: ${avgSleep}h/night (target: ${sleepTarget}h)`);
  }

  if (withWeight.length >= 2) {
    const first = withWeight[0].morning.weight!;
    const last = withWeight[withWeight.length - 1].morning.weight!;
    const unit = withWeight[withWeight.length - 1].morning.weightUnit ?? "lbs";
    const change = Math.round((last - first) * 10) / 10;
    lines.push(`Weight: ${first}${unit} → ${last}${unit} (change: ${change >= 0 ? "+" : ""}${change}${unit})`);
  }

  if (withBf.length >= 2) {
    const first = withBf[0].morning.bodyFat!;
    const last = withBf[withBf.length - 1].morning.bodyFat!;
    const change = Math.round((last - first) * 10) / 10;
    lines.push(`Body fat: ${first}% → ${last}% (change: ${change >= 0 ? "+" : ""}${change}%)`);
  }

  lines.push(`Days with nutrition logged: ${withCal.length} / ${entries.length}`);
  lines.push(`Days with sleep logged: ${withSleep.length} / ${entries.length}`);
  lines.push(`Days with exercise logged: ${withExercise.length} / ${entries.length}`);

  if (!lines.length) return "No computed stats available.";
  return lines.join("\n");
}

function buildUserMessage(
  entries: DailyEntry[],
  goals: GoalsData | null,
  period: string,
  profile: UserProfile | null
): string {
  const goalsText = goals
    ? [
        goals.weightGoal != null
          ? `Target weight: ${goals.weightGoal} ${goals.weightUnit ?? "lbs"}`
          : null,
        goals.bodyFatGoal != null
          ? `Target body fat: ${goals.bodyFatGoal}%`
          : null,
      ]
        .filter(Boolean)
        .join(", ") || "No specific goals set"
    : "No goals set";

  const periodLabel: Record<string, string> = {
    today: "today",
    week: "the past 7 days",
    month: "the past 30 days",
    threeMonths: "the past 90 days",
  };

  const entriesText = entries
    .map((e) => {
      const m = e.morning;
      const ev = e.evening;
      const parts: string[] = [`Date: ${e.date}`];

      const morning: string[] = [];
      if (m.weight != null) morning.push(`weight: ${m.weight}${m.weightUnit ?? "lbs"}`);
      if (m.bodyFat != null) morning.push(`body fat: ${m.bodyFat}%`);
      if (m.sleepHours != null) morning.push(`sleep: ${m.sleepHours}h`);
      if (m.notes) morning.push(`morning notes: "${m.notes}"`);
      if (morning.length) parts.push(`Morning — ${morning.join(", ")}`);

      const evening: string[] = [];
      if (ev.calories != null) evening.push(`calories: ${ev.calories}`);
      if (ev.protein != null) evening.push(`protein: ${ev.protein}g`);
      if (ev.carbs != null) evening.push(`carbs: ${ev.carbs}g`);
      if (ev.fat != null) evening.push(`fat: ${ev.fat}g`);
      const exList: ExerciseEntry[] =
        ev.exercises && ev.exercises.length > 0
          ? ev.exercises
          : ev.exercise
          ? [{ name: ev.exercise, minutes: ev.exerciseMinutes ?? null }]
          : [];
      if (exList.length > 0) {
        const exStr = exList
          .map((ex) => `${ex.name}${ex.minutes ? ` (${ex.minutes}min)` : ""}`)
          .join(", ");
        evening.push(`exercise: ${exStr}`);
      }
      if (ev.notes) evening.push(`notes: "${ev.notes}"`);
      if (evening.length) parts.push(`Evening — ${evening.join(", ")}`);

      return parts.join("\n");
    })
    .join("\n\n");

  return `Analyze my health data for ${periodLabel[period] ?? period}.
${buildProfileBlock(profile)}
USER GOALS:
${goalsText}

HEALTH ENTRIES (${entries.length} entries, sorted oldest to newest):
${entriesText}

COMPUTED STATS FOR THIS PERIOD:
${buildStatsBlock(entries, profile)}

Generate insights for the period "${period}".`;
}

export async function POST(req: NextRequest) {
  try {
    const { entries, goals, period, workoutImages, profile } = (await req.json()) as {
      entries: DailyEntry[];
      goals: GoalsData | null;
      period: string;
      workoutImages?: string[];
      profile?: UserProfile | null;
    };

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: "No data to analyze" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI not configured" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });
    const userMessage = buildUserMessage(entries, goals, period, profile ?? null);

    // Build user content — text first, then any workout images
    const imageInputs = (workoutImages ?? []).slice(0, 8);
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      { type: "text", text: userMessage },
      ...imageInputs.map(
        (img): OpenAI.Chat.ChatCompletionContentPartImage => ({
          type: "image_url",
          image_url: { url: img, detail: "low" },
        })
      ),
    ];

    if (imageInputs.length > 0) {
      // Append a note so the AI knows what the images are
      (userContent[0] as OpenAI.Chat.ChatCompletionContentPartText).text +=
    `\n\nI have also attached ${imageInputs.length} Apple Activity workout screenshot(s). Please extract and use the objective data visible in them — specifically: active calories burned, total calories burned, average heart rate, max heart rate, workout duration, workout type, distance or pace if applicable. Do NOT rely on self-reported difficulty ratings. Base your exercise analysis entirely on the metrics shown in these screenshots.`;
    }

    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
