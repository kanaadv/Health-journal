"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { getSupabase } from "../lib/supabase";

const navItems = [
  { href: "/diary", label: "Diary", icon: "📔", exact: false },
  { href: "/goals", label: "Goals", icon: "🎯", exact: false },
  { href: "/nutrition", label: "Nutrition", icon: "🥗", exact: false },
  { href: "/trends", label: "Trends", icon: "📈", exact: false },
  { href: "/insights", label: "Insights", icon: "✨", exact: false },
  { href: "/chat", label: "Coach", icon: "💬", exact: false },
  { href: "/profile", label: "Profile", icon: "👤", exact: false },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  function isActive(item: { href: string; exact: boolean }) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  async function signOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName =
    ((user?.user_metadata?.full_name as string | undefined)?.split(" ")[0]) ||
    (user?.email?.split("@")[0]) ||
    "You";

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-stone-150 shadow-[0_1px_8px_0_rgba(0,0,0,0.06)]">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-3 h-14">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 flex-shrink-0 font-bold text-stone-900 text-sm tracking-tight mr-1"
          >
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              H
            </span>
            <span className="hidden sm:block">Health Journal</span>
          </Link>

          {/* Nav items — horizontally scrollable */}
          <nav className="flex-1 overflow-x-auto scrollbar-none min-w-0">
            <ul className="flex items-center gap-0.5 min-w-max">
              {navItems.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                        active
                          ? "bg-violet-50 text-violet-700"
                          : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                      }`}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      <span className="hidden md:block">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User avatar + sign out */}
          {user && (
            <div className="flex items-center gap-2 flex-shrink-0 ml-1">
              <div className="flex items-center gap-2">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-stone-200"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">
                    {displayName[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden md:block text-xs font-medium text-stone-600 max-w-[80px] truncate">
                  {displayName}
                </span>
              </div>
              <button
                onClick={signOut}
                className="text-xs text-stone-400 hover:text-red-500 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
