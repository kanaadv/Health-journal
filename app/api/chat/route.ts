import { NextRequest } from "next/server";
import OpenAI from "openai";
import type { DailyEntry, GoalsData, ExerciseEntry } from "../../../lib/types";

function buildSystemPrompt(entries: DailyEntry[], goals: GoalsData | null): string {
  const goalsText = goals
    ? [
        goals.weightGoal != null ? `Target weight: ${goals.weightGoal} ${goals.weightUnit ?? "lbs"}` : null,
        goals.bodyFatGoal != null ? `Target body fat: ${goals.bodyFatGoal}%` : null,
      ]
        .filter(Boolean)
        .join(", ") || "No specific goals set"
    : "No goals set";

  const entriesText = entries
    .slice(0, 14)
    .map((e) => {
      const m = e.morning;
      const ev = e.evening;
      const parts: string[] = [`[${e.date}]`];

      const morning: string[] = [];
      if (m.weight != null) morning.push(`weight: ${m.weight}${m.weightUnit ?? "lbs"}`);
      if (m.bodyFat != null) morning.push(`body fat: ${m.bodyFat}%`);
      if (m.sleepHours != null) morning.push(`sleep: ${m.sleepHours}h`);
      if (m.wakeMood != null) morning.push(`wake mood: ${m.wakeMood}/5`);
      if (m.wakeEnergy != null) morning.push(`energy: ${m.wakeEnergy}/5`);
      if (m.notes) morning.push(`note: "${m.notes}"`);
      if (morning.length) parts.push(`AM: ${morning.join(", ")}`);

      const evening: string[] = [];
      if (ev.mood != null) evening.push(`mood: ${ev.mood}/5`);
      if (ev.stress != null) evening.push(`stress: ${ev.stress}/5`);
      if (ev.calories != null) evening.push(`cal: ${ev.calories}`);
      if (ev.protein != null) evening.push(`P: ${ev.protein}g`);
      if (ev.carbs != null) evening.push(`C: ${ev.carbs}g`);
      if (ev.fat != null) evening.push(`F: ${ev.fat}g`);
      const exList: ExerciseEntry[] =
        ev.exercises && ev.exercises.length > 0
          ? ev.exercises
          : ev.exercise
          ? [{ name: ev.exercise, minutes: ev.exerciseMinutes ?? null }]
          : [];
      if (exList.length > 0) {
        evening.push(`exercise: ${exList.map((x) => `${x.name}${x.minutes ? ` ${x.minutes}min` : ""}`).join(", ")}`);
      }
      if (ev.socialConnectedness != null) evening.push(`social: ${ev.socialConnectedness}/5`);
      if (ev.reflection) evening.push(`reflection: "${ev.reflection}"`);
      if (evening.length) parts.push(`PM: ${evening.join(", ")}`);

      return parts.join(" | ");
    })
    .join("\n");

  return `You're the user's personal health coach and you know their data inside out. You've seen their logs, their notes, their good days and bad days. Talk to them like a real person — direct, warm, no bullshit.

USER GOALS:
${goalsText}

RECENT DIARY (last ${Math.min(entries.length, 14)} entries, newest first):
${entriesText || "No entries yet."}

HOW TO TALK:
- This is a conversation, not a report. Respond like a real person would in a text or voice note.
- Keep it short unless they need detail. One or two sharp sentences beats a wall of text every time.
- Use their actual data when it's relevant — "you only got 5h last Tuesday" hits different than "your sleep has been poor".
- If they mention something, engage with it. Ask a follow-up if it makes sense.
- Don't list ten things. Give them one or two things to actually focus on.
- Never repeat advice they didn't ask for twice.
- Don't use words like "optimise", "metrics", "holistic", "leverage" or anything that sounds like a corporate wellness app.
- You're not a doctor — don't diagnose or prescribe anything medical.
- Today's date is ${new Date().toISOString().slice(0, 10)}.`;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response("OpenAI not configured", { status: 500 });
    }

    const { messages, entries, goals } = (await req.json()) as {
      messages: { role: "user" | "assistant"; content: string }[];
      entries: DailyEntry[];
      goals: GoalsData | null;
    };

    const client = new OpenAI({ apiKey });
    const systemPrompt = buildSystemPrompt(entries, goals);

    const stream = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-20), // keep last 20 messages to avoid huge context
      ],
      stream: true,
      max_completion_tokens: 600,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(message, { status: 500 });
  }
}
