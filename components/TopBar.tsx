"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Settings } from "lucide-react";

// A slim, sticky top bar: the wordmark, and the two utility destinations
// (Search, Settings) lifted out of the main nav so the tab bar can breathe.
//
// When a new note lands while the app is open (LiveRefresh fires
// "pebble:arrival"), the wordmark ripples once, like a pebble dropped in still
// water, and screen readers hear a quiet announcement.
export function TopBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const [ripple, setRipple] = useState(0);
  useEffect(() => {
    const onArrival = () => setRipple(Date.now());
    window.addEventListener("pebble:arrival", onArrival);
    return () => window.removeEventListener("pebble:arrival", onArrival);
  }, []);
  useEffect(() => {
    if (!ripple) return;
    const t = setTimeout(() => setRipple(0), 2400);
    return () => clearTimeout(t);
  }, [ripple]);

  return (
    <header className="sticky top-0 z-20 border-b border-hairline/60 bg-paper/80 backdrop-blur-md">
      <div
        className="mx-auto flex max-w-reading items-center justify-between px-6"
        style={{ height: "calc(3.25rem + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link
          href="/"
          className="relative font-serif text-[18px] tracking-tight text-ink transition-opacity hover:opacity-70"
        >
          {ripple ? (
            <span key={ripple} aria-hidden className="pebble-ripple">
              <i />
              <i />
            </span>
          ) : null}
          Pebble
        </Link>
        <span className="sr-only" aria-live="polite">
          {ripple ? "A new note just arrived" : ""}
        </span>
        <nav className="flex items-center gap-1" aria-label="Utilities">
          <IconLink href="/search" label="Search" active={active("/search")}>
            <Search size={18} strokeWidth={1.6} />
          </IconLink>
          <IconLink href="/settings" label="Settings" active={active("/settings")}>
            <Settings size={18} strokeWidth={1.6} />
          </IconLink>
        </nav>
      </div>
    </header>
  );
}

function IconLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
      className={[
        "grid h-9 w-9 place-items-center rounded-full transition-colors",
        active ? "bg-sage-tint text-sage" : "text-ink-muted hover:text-ink-secondary",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
