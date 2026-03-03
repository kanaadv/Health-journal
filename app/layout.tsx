import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import NavWrapper from "../components/NavWrapper";
import SupabaseProvider from "../components/SupabaseProvider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Health Journal",
  description: "Your personal all-in-one health companion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="min-h-screen antialiased font-sans">
        <SupabaseProvider>
          <NavWrapper />
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
