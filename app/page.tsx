import Link from "next/link";
import TodayStatus from "../components/TodayStatus";

const quickActions = [
  {
    href: "/morning",
    label: "Morning",
    description: "Weight · Sleep · Energy",
    icon: "☀️",
    gradient: "from-amber-400 to-orange-400",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-900",
    hover: "hover:border-amber-300 hover:shadow-amber-100",
  },
  {
    href: "/evening",
    label: "Evening",
    description: "Mood · Nutrition · Reflection",
    icon: "🌙",
    gradient: "from-indigo-400 to-violet-500",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-900",
    hover: "hover:border-indigo-300 hover:shadow-indigo-100",
  },
  {
    href: "/trends",
    label: "Trends",
    description: "Charts & progress",
    icon: "📈",
    gradient: "from-emerald-400 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    hover: "hover:border-emerald-300 hover:shadow-emerald-100",
  },
  {
    href: "/diary",
    label: "Diary",
    description: "Browse all entries",
    icon: "📔",
    gradient: "from-rose-400 to-pink-500",
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-900",
    hover: "hover:border-rose-300 hover:shadow-rose-100",
  },
  {
    href: "/insights",
    label: "AI Insights",
    description: "Analyse your data",
    icon: "✨",
    gradient: "from-violet-400 to-purple-500",
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-900",
    hover: "hover:border-violet-300 hover:shadow-violet-100",
  },
  {
    href: "/chat",
    label: "Coach",
    description: "Talk to your AI coach",
    icon: "💬",
    gradient: "from-sky-400 to-blue-500",
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-900",
    hover: "hover:border-sky-300 hover:shadow-sky-100",
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
      <section className="relative overflow-hidden px-6 pt-10 pb-8">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-violet-100/60 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-amber-100/50 blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">
            {today}
          </p>
          <h1 className="text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
            Hey. Ready to<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-500">
              track today?
            </span>
          </h1>
          <p className="mt-3 text-stone-500 text-base">
            Log your morning and evening, then let the AI do the rest.
          </p>
        </div>
      </section>

      {/* Today status */}
      <section className="px-6 pb-4 max-w-2xl mx-auto">
        <TodayStatus />
      </section>

      {/* Quick actions grid */}
      <section className="px-6 pb-10 max-w-2xl mx-auto">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
          Quick Access
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quickActions.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`group relative flex flex-col gap-3 rounded-2xl border ${s.border} ${s.bg} p-4 shadow-sm hover:shadow-md ${s.hover} transition-all duration-200`}
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-xl shadow-sm`}
              >
                {s.icon}
              </div>
              <div>
                <p className={`font-semibold text-sm ${s.text}`}>{s.label}</p>
                <p className={`text-xs mt-0.5 opacity-70 ${s.text}`}>{s.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
