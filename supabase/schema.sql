-- Health Journal: Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Enable anonymous auth first: Authentication → Providers → Anonymous Sign-ins → Enable

-- Daily entries: one row per user per day
CREATE TABLE IF NOT EXISTS daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  morning JSONB DEFAULT '{}',
  evening JSONB DEFAULT '{}',
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Goals: one row per user
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  weight_goal DECIMAL,
  weight_unit TEXT DEFAULT 'lbs',
  body_fat_goal DECIMAL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
DROP POLICY IF EXISTS "Users own daily_entries" ON daily_entries;
CREATE POLICY "Users own daily_entries"
  ON daily_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own goals" ON goals;
CREATE POLICY "Users own goals"
  ON goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
