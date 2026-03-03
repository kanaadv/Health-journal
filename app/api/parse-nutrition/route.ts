import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: `This is a MyFitnessPal or nutrition tracking screenshot. Extract the total daily nutrition values.

Return ONLY a JSON object with this exact structure:
{
  "calories": total_calories_as_integer_or_null,
  "protein": protein_grams_as_integer_or_null,
  "carbs": carbs_grams_as_integer_or_null,
  "fat": fat_grams_as_integer_or_null
}

Rules:
- Use the TOTAL daily values, not individual meal values.
- Round all values to the nearest integer.
- If a value is not visible, return null for that field.
- If this is not a nutrition screenshot, return all nulls.
- Return only the JSON, no other text.`,
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 200,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
