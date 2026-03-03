import Link from "next/link";
import TodayStatus from "../components/TodayStatus";

const quickActions = [
  {
    href: "/morning",
    label: "Morning",
    description: "Weight · Sleep · Energy",
    icon: "☀️",
    accent: "amber",
    border: "border-stone-200 hover:border-amber-300",
    iconBg: "bg-amber-50",
  },
  {
    href: "/evening",
    label: "Evening",
    description: "Mood · Nutrition · Reflection",
    icon: "🌙",
    accent: "indigo",
    border: "border-stone-200 hover:border-indigo-300",
    iconBg: "bg-indigo-50",
  },
  {
    href: "/trends",
    label: "Trends",
    description: "Charts & progress",
    icon: "📈",
    accent: "emerald",
    border: "border-stone-200 hover:border-emerald-300",
    iconBg: "bg-emerald-50",
  },
  {
    href: "/diary",
    label: "Diary",
    description: "Browse all entries",
    icon: "📔",
    accent: "rose",
    border: "border-stone-200 hover:border-rose-300",
    iconBg: "bg-rose-50",
  },
  {
    href: "/insights",
    label: "AI Insights",
    description: "Analyse your data",
    icon: "✨",
    accent: "violet",
    border: "border-stone-200 hover:border-violet-300",
    iconBg: "bg-violet-50",
  },
  {
    href: "/chat",
    label: "Coach",
    description: "Talk to your AI coach",
    icon: "💬",
    accent: "sky",
    border: "border-stone-200 hover:border-sky-300",
    iconBg: "bg-sky-50",
  },
];

export default function Home() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Hero */}
      <section className="bg-white border-b border-stone-200 px-6 pt-8 pb-7">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">
            {today}
          </p>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Health Journal
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Log your day, track your progress, get honest feedback.
          </p>
        </div>
      </section>

      {/* Today status */}
      <section className="px-6 pt-5 pb-1 max-w-2xl mx-auto">
        <TodayStatus />
      </section>

      {/* Quick actions */}
      <section className="px-6 pt-4 pb-10 max-w-2xl mx-auto">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
          Sections
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quickActions.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`group flex flex-col gap-3 rounded-xl border bg-white ${s.border} p-4 shadow-sm hover:shadow-md transition-all duration-150`}
            >
              <div className={`w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center text-lg`}>
                {s.icon}
              </div>
              <div>
                <p className="font-semibold text-sm text-stone-800">{s.label}</p>
                <p className="text-xs text-stone-500 mt-0.5">{s.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
