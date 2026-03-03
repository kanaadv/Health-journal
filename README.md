# Health Journal

Your personal all-in-one health companion. Track weight, body fat, sleep, mood, nutrition, and get AI-powered insights.

## Install Node.js first

You need Node.js to run this project. **Install it before continuing:**

### Option A: Download from nodejs.org (easiest)

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version
3. Run the installer
4. Restart your terminal (or Cursor)

### Option B: Fix Homebrew, then install

If you have Homebrew permission issues, run this in your terminal:

```bash
sudo chown -R $(whoami) /opt/homebrew /opt/homebrew/Cellar
```

Then:

```bash
brew install node
```

---

## Getting started

Once Node.js is installed:

```bash
cd health-journal
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Roadmap

### Phase 1: Core structure ✅
- [x] Project setup
- [ ] Navigation / basic layout
- [ ] Morning check-in page (weight, body fat, sleep)
- [ ] Evening check-in page (mood, calories, macros)
- [ ] Data storage (we'll start with local storage)

### Phase 2: Goals & diary
- [ ] Goals page (target weight, body fat)
- [ ] Health diary (daily entries, timeline)
- [ ] Progress charts (weight, body fat trends)

### Phase 3: AI & polish
- [ ] MyFitnessPal screenshot upload + parsing
- [ ] Daily score calculation
- [ ] AI insights and suggestions
- [ ] Deploy to Vercel

---

## Deploy to Vercel

When you're ready:

1. Push this project to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "Import Project" and connect your GitHub repo
4. Vercel will deploy it automatically

---

Built for you. On your side.
