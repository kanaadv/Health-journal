# Design System — Health Journal

A reference document for the visual language, component patterns, and engineering standards used across the Health Journal platform. This document exists to ensure every new screen, feature, and contribution maintains a consistent, professional standard.

---

## 1. Design Principles

### Clarity over cleverness
Every element earns its place. If removing something doesn't break comprehension, remove it. Dense interfaces create friction; Health Journal should feel effortless to use daily.

### Data should speak for itself
The app exists to surface health data meaningfully. UI chrome should recede so that numbers, trends, and insights are the focal point — not decorative elements.

### Calm confidence
The tone is neither clinical nor casual. It is direct, warm, and honest. The visual language follows: generous whitespace, restrained colour, precise typography.

### Progressive disclosure
Show what's needed now. Expand when asked. The calendar diary, collapsible day cards, and tabbed insights pages all follow this pattern — complexity is available but never forced.

---

## 2. Colour System

All colours are drawn from the Tailwind CSS default palette. No custom hex values are used unless documented here.

### Base (structural)
| Role | Token | Hex |
|---|---|---|
| Page background | `stone-50` | `#fafaf9` |
| Surface (cards) | `white` | `#ffffff` |
| Border default | `stone-200` | `#e7e5e4` |
| Border subtle | `stone-100` | `#f5f5f4` |
| Text primary | `stone-900` | `#1c1917` |
| Text secondary | `stone-600` | `#57534e` |
| Text muted | `stone-400` | `#a8a29e` |
| Text placeholder | `stone-400` | `#a8a29e` |

### Brand (interactive)
| Role | Token | Usage |
|---|---|---|
| Primary action | `violet-600` | Buttons, active nav, highlights |
| Primary hover | `violet-700` | Button hover state |
| Primary surface | `violet-50` | Active nav background, subtle tints |
| Primary ring | `violet-400` | Focus rings, today indicator |

### Section colours
Each section of the app has a dedicated accent colour. This system is used consistently across nav icons, card borders, form focus rings, and page gradients.

| Section | Accent | Token |
|---|---|---|
| Morning | Amber | `amber-400 / amber-500` |
| Evening | Indigo | `indigo-400 / indigo-500` |
| Trends | Emerald | `emerald-400 / emerald-500` |
| Diary | Rose | `rose-400 / rose-500` |
| Insights | Violet | `violet-400 / violet-500` |
| Coach | Sky | `sky-400 / sky-500` |
| Goals | Blue | `blue-400 / blue-500` |

### Semantic colours
| Role | Token |
|---|---|
| Success / positive | `emerald-500`, `emerald-600` |
| Warning / caution | `amber-500`, `amber-600` |
| Error / destructive | `red-500`, `red-600` |
| Info | `sky-500`, `sky-600` |

### Colour usage rules
- Never use a pure accent colour as a background for large areas — use the `50` or `100` tint
- Dark text on light tinted backgrounds, never white text on light backgrounds
- Gradients are used sparingly: page hero sections only, always a `50`→`100` range, never saturated

---

## 3. Typography

### Typeface
**DM Sans** — loaded via `next/font/google`, applied globally as `var(--font-dm-sans)`.  
Fallback stack: `system-ui`, `sans-serif`.

DM Sans was chosen for its geometric clarity at small sizes and its natural feel at large display weights — appropriate for both data-dense tables and bold hero headings.

### Scale
| Role | Class | Size | Weight |
|---|---|---|---|
| Page heading | `text-2xl font-bold` | 24px | 700 |
| Section heading | `text-lg font-semibold` | 18px | 600 |
| Card title | `text-base font-semibold` | 16px | 600 |
| Body | `text-sm` | 14px | 400 |
| Label / meta | `text-xs font-medium` | 12px | 500 |
| Micro / caption | `text-xs` | 12px | 400 |

### Rules
- Headings never exceed `text-2xl` in content areas (only hero sections may use `text-3xl` or `text-4xl`)
- Line height: `leading-tight` for headings, `leading-relaxed` for body paragraphs
- Letter spacing: `tracking-tight` on bold headings; `tracking-wide` only on uppercase labels
- All-caps labels use `uppercase tracking-widest text-xs font-semibold` — used for section labels and chart axis headers

---

## 4. Spacing & Layout

### Page width
Content is constrained to `max-w-2xl` (672px) for single-column pages (forms, diary, insights).  
The Trends page uses `max-w-4xl` (896px) to accommodate the 2-column chart grid.  
Navigation uses `max-w-5xl` (1024px) to allow breathing room on wider screens.

### Page structure
Every page follows the same structure:
1. **Header section** — white background, bottom border, `px-6 pt-8 pb-6`. Contains the page title and any global controls (e.g. time frame selector).
2. **Content section** — `bg-stone-50` background, `px-6 py-6`. Contains cards and interactive elements.

### Spacing tokens in use
| Context | Token |
|---|---|
| Card internal padding | `p-5` or `p-6` |
| Card gap in a list | `gap-4` |
| Form field gap | `space-y-6` |
| Inline label → value gap | `gap-x-6 gap-y-2` |
| Button internal padding | `px-4 py-2.5` (standard), `py-3` (primary CTA) |
| Nav item padding | `px-2.5 py-1.5` |

### Grid
- **2-column card grids** use `grid-cols-2 gap-3` (homepage quick actions, form macro fields)
- **Chart grid** uses `grid-cols-1 sm:grid-cols-2 gap-4`
- **Calendar** uses `grid-cols-7` with `m-0.5` on day cells

---

## 5. Component Patterns

### Cards
All content cards share a base style:
```
bg-white rounded-2xl border border-stone-200 shadow-sm
```
Cards with interactive sections (diary entries, score breakdowns) add `overflow-hidden` to contain border-radius across child elements.

Elevated cards (login, modal-style) use:
```
shadow-xl shadow-stone-100
```

### Buttons

**Primary CTA** — used once per page for the main action:
```
rounded-xl bg-violet-600 text-white font-semibold py-3 px-4
hover:bg-violet-700 disabled:opacity-50 transition-colors
```

**Secondary / outline** — used for paired actions (Edit Morning / Edit Evening):
```
rounded-xl border border-{colour}-300 text-{colour}-700 py-2
hover:bg-{colour}-50 transition-colors
```

**Ghost / text** — used for low-priority actions (Add another exercise, Back links):
```
text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors
```

**Destructive** — sign out only:
```
text-xs text-stone-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg
```

### Form inputs

All text inputs:
```
rounded-lg border border-stone-300 px-4 py-2.5 text-stone-800
focus:outline-none focus:ring-2 focus:ring-{colour}-400 focus:border-transparent
```

Scale selectors (mood, energy, stress) use a row of square toggle buttons:
```
w-10 h-10 rounded-lg text-sm font-medium
active: bg-{colour}-500 text-white
inactive: bg-stone-100 text-stone-600 hover:bg-stone-200
```

### Navigation

The nav is sticky, full-width, with a subtle shadow:
```
sticky top-0 z-20 bg-white border-b border-stone-150
shadow-[0_1px_8px_0_rgba(0,0,0,0.06)]
```

Active state uses a violet pill:
```
bg-violet-50 text-violet-700
```

Inactive state:
```
text-stone-500 hover:text-stone-800 hover:bg-stone-100
```

Labels are hidden on screens narrower than `md` (1024px) — only icons are shown. Each item has a `title` attribute for accessibility.

### Score rings / bars
The score display uses a large number with a coloured label, colour-coded by threshold:
- ≥ 80: `text-emerald-600` on `bg-emerald-50`
- ≥ 60: `text-amber-500` on `bg-amber-50`
- < 60: `text-red-500` on `bg-red-50`

Score breakdown bars use `h-2 rounded-full` progress bars with a `transition-all duration-700` animation.

### Loading states
Skeleton loaders use `animate-pulse` with `bg-stone-200` (primary) and `bg-stone-100` (secondary) blocks.  
Spinners use `border-2 border-stone-300 border-t-violet-500 rounded-full animate-spin`.

### Empty states
Centred within their container, `text-stone-400 text-sm`, with a brief explanation below.

---

## 6. Charts (Trends Page)

Charts use **Recharts** with a consistent visual treatment:

| Property | Value |
|---|---|
| Container height | `200px` |
| Grid lines | `strokeDasharray="3 3"`, `stroke="#f5f5f4"` |
| Axis text | `fontSize: 11, fill: "#a8a29e"` |
| Bar radius | `[4, 4, 0, 0]` (top corners only) |
| Line stroke width | `2px` |
| Dot radius | `3` (default), `5` (active) |
| Reference lines | `strokeDasharray="4 4"` in amber or emerald |

Tooltips are custom components: white background, `border-stone-200`, `rounded-xl`, `shadow-lg`, `text-xs`.

---

## 7. Motion & Transitions

Interactions use short, purposeful transitions — never decorative animation.

| Context | Duration | Property |
|---|---|---|
| Button hover | `150ms` | `colors` |
| Nav active state | `150ms` | `colors` |
| Score bar fill | `700ms` | `width` |
| Card open/close | none (instant) | — |

No page transitions, no scroll animations, no entrance effects. The app should feel immediate.

---

## 8. Iconography

The app uses emoji as functional icons throughout — they are universally recognised, require no icon library dependency, and render consistently across platforms.

All emoji icons are wrapped in `aria-hidden="true"` or accompanied by a visible text label to maintain accessibility.

No third-party icon library is used.

---

## 9. Responsive Behaviour

The app is designed mobile-first but is fully functional on desktop.

| Breakpoint | Behaviour |
|---|---|
| Default (mobile) | Single column, icon-only nav, full-width cards |
| `sm` (640px+) | Chart grid becomes 2-column, homepage cards become 3-column |
| `md` (768px+) | Nav labels become visible alongside icons |

The maximum content width caps at `max-w-4xl` — the app is not designed for large widescreen displays and does not stretch to fill them.

---

## 10. Accessibility

- All interactive elements are keyboard-navigable
- Focus rings use `focus:ring-2 focus:ring-{colour}-400` — never removed with `outline-none` without a replacement
- Colour is never the sole means of conveying information (dots on the calendar are accompanied by label tooltips; score colours have numeric values)
- Form labels use `<label>` elements, not placeholder text as a substitute
- `aria-label` is used on icon-only buttons (e.g. the send button in the Coach chat, the × remove buttons)
- Nav icons include `title` attributes for screen reader compatibility

---

## 11. File & Code Conventions

| Convention | Rule |
|---|---|
| Pages | `app/{route}/page.tsx` — one page component per file |
| Shared components | `components/` — capitalised filenames |
| Utility / data layer | `lib/` — camelCase filenames |
| API routes | `app/api/{route}/route.ts` |
| Types | Centralised in `lib/types.ts` |
| Client components | Marked with `"use client"` at the top; used only where interactivity requires it |
| No inline styles | All styling via Tailwind utility classes |
| No `any` types | TypeScript strict mode; explicit interfaces for all data structures |

---

*Last updated: March 2026*
