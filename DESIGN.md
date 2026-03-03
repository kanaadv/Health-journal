# Health Journal — Design Spec

This document defines the data model, score logic, and key decisions *before* we build. Get this right and everything else snaps into place.

---

## 1. One Day's Data (JSON Structure)

Every day is a single object. Here's what it looks like:

```json
{
  "date": "2026-03-02",
  "morning": {
    "weight": 175,
    "weightUnit": "lbs",
    "bodyFat": 18.5,
    "sleepHours": 7,
    "sleepQuality": 4,
    "wakeMood": 3,
    "wakeEnergy": 4,
    "notes": ""
  },
  "evening": {
    "mood": 4,
    "stress": 2,
    "calories": 2100,
    "protein": 150,
    "carbs": 220,
    "fat": 75,
    "exercise": "45 min run",
    "exerciseMinutes": 45,
    "socialConnectedness": 3,
    "reflection": "Decent day. Felt better after the run.",
    "notes": ""
  }
}
```

**Notes:**
- `date` is the key — one entry per day, format `YYYY-MM-DD`
- All number fields can be `null` if not logged
- `weightUnit` stays `"lbs"` or `"kg"` for the whole app (user preference)
- This structure maps 1:1 to a Supabase row later (one table, JSON columns or flattened columns)

---

## 2. Goals Structure

```json
{
  "weightGoal": 165,
  "weightUnit": "lbs",
  "bodyFatGoal": 15,
  "updatedAt": "2026-03-02"
}
```

---

## 3. Daily Score Logic

**Total score: 0–100**, made up of 4 components. Each component is 0–25 points.

| Component | What we use | How we score |
|-----------|-------------|--------------|
| **Sleep** | `sleepHours` + `sleepQuality` | 7–8 hrs = full points, quality acts as multiplier. Too little sleep caps the score. |
| **Mood** | `wakeMood`, `evening.mood`, `evening.stress` | Average of morning + evening mood, minus stress penalty |
| **Nutrition** | `calories`, `protein` (vs goal if set) | Hit protein target? Full points. Calories in a reasonable range? Bonus. |
| **Movement** | `exerciseMinutes` | 30+ min = full, 15–30 = partial, 0 = zero |

**Initial weights:** 25% each. We can tweak later (e.g. sleep 30%, mood 30%, nutrition 20%, movement 20%).

**Missing data:** If a category has no data, we don’t count it. Total = sum of (score × 25) / (number of categories with data). So 3 categories filled = out of 75, scaled to 100.

---

## 4. Database Schema (for Later — Supabase)

Design localStorage to mirror this so migration is smooth:

```sql
-- One row per day
CREATE TABLE daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL UNIQUE,
  morning JSONB,
  evening JSONB,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Goals (one row per user, update in place)
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  weight_goal DECIMAL,
  weight_unit TEXT DEFAULT 'lbs',
  body_fat_goal DECIMAL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

localStorage structure:
- `health_journal_entries` → array of daily objects (or object keyed by date)
- `health_journal_goals` → single goals object
- Same shape as the JSON above

---

## 5. "Today Already Logged?" Check

On the home page, show at a glance:

```
Today — March 2, 2026

☐ Morning check-in (weight, body fat, sleep)
☐ Evening check-in (mood, nutrition)
```

Or with checkmarks when done:

```
✓ Morning check-in
☐ Evening check-in
```

**Logic:**
- Morning "done" if `morning.weight` OR `morning.sleepHours` is present (user might skip body fat sometimes)
- Evening "done" if `evening.mood` OR `evening.calories` is present

---

## 6. What Data We Collect (Tied to Score)

Because score affects what we collect, here’s the minimum for each category:

| Score category | Required for scoring | Optional |
|----------------|----------------------|----------|
| Sleep | `sleepHours`, `sleepQuality` | `morning.notes` |
| Mood | `evening.mood` | `wakeMood`, `evening.stress`, `socialConnectedness` |
| Nutrition | `evening.calories`, `evening.protein` | `carbs`, `fat` |
| Movement | `exerciseMinutes` | `exercise` (text description) |

Forms should at least capture the "required" fields; optional can be added later.

---

## Summary

1. **One day = one object** with `date`, `morning`, `evening`
2. **Score = 25% each** for sleep, mood, nutrition, movement (adjustable)
3. **localStorage shape = future DB shape** for easy migration
4. **Home page** shows "today logged?" for morning and evening

Ready to build when you are.
