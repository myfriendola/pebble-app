import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { NavRail } from "@/components/NavRail";

// Clean sans for UI; serif (with italic) for the user's words and the app's
// gentle questions.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Pebble",
  description: "A calm place for the things you say to yourself.",
};

export const viewport: Viewport = {
  themeColor: "#F5F1EA",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <NavRail />
        <main className="sm:pl-[54px] pb-24 sm:pb-0">
          <div className="mx-auto w-full max-w-reading px-6 py-10 sm:py-14">{children}</div>
        </main>
      </body>
    </html>
  );
}
