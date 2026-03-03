# How to run your app

**You need to stop any old servers first.** If you see old content or no nav, something is still running from before.

## Steps

1. **Stop everything:**
   - Close any terminals that are running `npm run dev` or `npm run start`
   - Or press **Ctrl+C** in those terminals

2. **Fresh start:**
   ```bash
   cd /Users/kanaad/health-journal
   rm -rf .next
   npm run dev
   ```

3. **Open:** [http://localhost:3000](http://localhost:3000) (or 3001 if 3000 is busy)

4. **Hard refresh:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows) to clear browser cache

---

If you get "too many open files" errors, you may need to restart your Mac to reset the file limit, then try again.

---

## Supabase setup (first-time)

1. **Enable anonymous auth:** Supabase Dashboard → Authentication → Providers → Anonymous Sign-ins → Enable

2. **Run the schema:** Dashboard → SQL Editor → New query → paste contents of `supabase/schema.sql` → Run

3. **Env vars** in `.env.local` (already set):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
