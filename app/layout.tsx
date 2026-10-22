import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { NavRail } from "@/components/NavRail";
import { TopBar } from "@/components/TopBar";
import { OpeningSequence } from "@/components/OpeningSequence";
import { PwaRegister } from "@/components/PwaRegister";

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
  applicationName: "Pebble",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Pebble", statusBarStyle: "default" },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F1EA",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <NavRail />
        <div className="sm:pl-[54px]">
          <TopBar />
          <main className="pb-28 sm:pb-16">
            <div className="mx-auto w-full max-w-reading px-6 py-8 sm:py-10">{children}</div>
          </main>
        </div>
        <OpeningSequence />
        <PwaRegister />
      </body>
    </html>
  );
}
