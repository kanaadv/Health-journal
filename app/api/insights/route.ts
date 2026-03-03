import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { DailyEntry, GoalsData, ExerciseEntry } from "../../../lib/types";

const SYSTEM_PROMPT = `You are the user's personal health coach. You've been tracking their data every day and you know them well. Your job is to give them a real, honest read on how they're doing — like a coach who actually gives a shit, not a wellness app spitting out bullet points.

---

SCORING INSTRUCTIONS:

Calculate an overall score out of 100 based on:
- Nutrition (40 points): How close to their calorie/macro goals, and how consistent.
- Physical metrics (30 points): Movement toward their weight and body fat goals. Reward progress, not just proximity.
- Sleep (20 points): Hours vs. the 7-9h target.
- Consistency & logging (10 points): Did they actually show up and log both check-ins most days?

---

TONE — THIS IS CRITICAL:

Write like a real person talking to a friend, not a report being filed. Specifically:

- Use casual, direct language. "You've been smashing your protein" not "Protein intake has been consistent with targets."
- Say "you" a lot. Make it personal.
- Be blunt when something's off. "Sleep's been rough — you averaged 5.5h and it shows in your energy scores" not "Sleep metrics indicate sub-optimal rest duration."
- Celebrate wins like you mean it. "Down 2lbs this week — that's real progress, keep it up."
- Tips should sound like advice, not instructions. "Try eating your last meal earlier — might help with the bloating you mentioned" not "Consider adjusting meal timing to optimise digestion."
- If they wrote something in their notes or reflection, reference it naturally. They wrote it for a reason.
- Never use corporate wellness words like "metrics", "optimise", "leverage", "holistic", "wellbeing indicators". Just talk normally.
- Keep it tight. No essays. Each field should be punchy.

---

OUTPUT FORMAT:

Return ONLY a JSON object with this exact structure. No preamble, no text outside the JSON:

{
  "period": "today | week | month | threeMonths",
  "overallScore": 0-100,
  "scoreBreakdown": {
    "nutrition": 0-40,
    "physicalMetrics": 0-30,
    "sleep": 0-20,
    "consistency": 0-10
  },
  "summary": "2-3 sentences, casual and direct — how did this period actually go?",
  "highlights": ["specific win phrased like a real compliment", "another one"],
  "areasToImprove": ["specific thing that needs work, said plainly", "another one"],
  "actionableTips": ["concrete advice that sounds like a person said it", "another tip"],
  "notablePatterns": "Any real pattern you spotted — e.g. bad sleep tanking energy the next day, or skipping meals affecting mood. Null if nothing stands out."
}`;

function buildUserMessage(
  entries: DailyEntry[],
  goals: GoalsData | null,
  period: string
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
      if (m.wakeMood != null) morning.push(`wake mood: ${m.wakeMood}/5`);
      if (m.wakeEnergy != null) morning.push(`wake energy: ${m.wakeEnergy}/5`);
      if (m.notes) morning.push(`morning notes: "${m.notes}"`);
      if (morning.length) parts.push(`Morning — ${morning.join(", ")}`);

      const evening: string[] = [];
      if (ev.mood != null) evening.push(`mood: ${ev.mood}/5`);
      if (ev.stress != null) evening.push(`stress: ${ev.stress}/5`);
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
      if (ev.socialConnectedness != null)
        evening.push(`social connectedness: ${ev.socialConnectedness}/5`);
      if (ev.reflection) evening.push(`reflection: "${ev.reflection}"`);
      if (ev.notes) evening.push(`notes: "${ev.notes}"`);
      if (evening.length) parts.push(`Evening — ${evening.join(", ")}`);

      return parts.join("\n");
    })
    .join("\n\n");

  return `Analyze my health data for ${periodLabel[period] ?? period}.

USER GOALS:
${goalsText}

HEALTH ENTRIES (${entries.length} entries):
${entriesText}

Generate insights for the period "${period}".`;
}

export async function POST(req: NextRequest) {
  try {
    const { entries, goals, period, workoutImages } = (await req.json()) as {
      entries: DailyEntry[];
      goals: GoalsData | null;
      period: string;
      workoutImages?: string[];
    };

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: "No data to analyze" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI not configured" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });
    const userMessage = buildUserMessage(entries, goals, period);

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
        `\n\nI have also attached ${imageInputs.length} workout screenshot(s) from Apple Activity. Please use them for additional context (heart rate, pace, calories burned, etc.) when analyzing exercise.`;
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
