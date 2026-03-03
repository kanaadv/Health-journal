"use client";

import { usePathname } from "next/navigation";
import Nav from "./Nav";

const HIDE_NAV_PATHS = ["/login", "/auth"];

export default function NavWrapper() {
  const pathname = usePathname();
  const hide = HIDE_NAV_PATHS.some((p) => pathname.startsWith(p));
  if (hide) return null;
  return <Nav />;
}
