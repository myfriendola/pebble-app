"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, MessageCircle, Lightbulb, Spline, CheckSquare, type LucideIcon } from "lucide-react";

type Item = { href: string; label: string; Icon: LucideIcon };

const CONTENT: Item[] = [
  { href: "/", label: "Today", Icon: Sun },
  { href: "/thoughts", label: "Thoughts", Icon: MessageCircle },
  { href: "/ideas", label: "Ideas", Icon: Lightbulb },
  { href: "/threads", label: "Threads", Icon: Spline },
  { href: "/tasks", label: "Tasks", Icon: CheckSquare },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavRail() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: slim left icon rail (54px). */}
      <nav
        aria-label="Primary"
        className="hidden sm:flex fixed left-0 top-0 z-30 h-full w-[54px] flex-col items-center gap-1 border-r border-hairline bg-paper pt-8"
      >
        {CONTENT.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className="group grid h-11 w-11 place-items-center rounded-full transition-colors"
            >
              <span
                className={[
                  "grid h-9 w-9 place-items-center rounded-full transition-colors",
                  active ? "bg-sage-tint text-sage" : "text-ink-muted group-hover:text-ink-secondary",
                ].join(" ")}
              >
                <item.Icon size={19} strokeWidth={1.5} />
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Phone: bottom bar. Five tabs; the one you're on names itself in a
          soft sage pill that glides over when you switch, so every icon
          (Threads included) introduces itself the first time you tap it. */}
      <nav
        aria-label="Primary"
        className="sm:hidden fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-hairline bg-paper/90 px-2 backdrop-blur-md"
        style={{ height: "calc(4rem + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {CONTENT.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="flex items-center justify-center px-0.5"
            >
              <span
                className={[
                  "flex h-10 items-center rounded-full transition-all duration-300 ease-out motion-reduce:transition-none",
                  active ? "bg-sage-tint pl-[11px] pr-[15px] text-sage" : "px-[9.5px] text-ink-muted",
                ].join(" ")}
              >
                <item.Icon size={21} strokeWidth={1.5} className="shrink-0" />
                <span
                  aria-hidden
                  className={[
                    "overflow-hidden whitespace-nowrap font-sans text-[13px] font-medium tracking-[0.01em] transition-all duration-300 ease-out motion-reduce:transition-none",
                    active ? "ml-[7px] max-w-[96px] opacity-100" : "ml-0 max-w-0 opacity-0",
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
