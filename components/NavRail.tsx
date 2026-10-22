"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, MessageCircle, Lightbulb, CheckSquare, Moon, type LucideIcon } from "lucide-react";

type Item = { href: string; label: string; Icon: LucideIcon };

const CONTENT: Item[] = [
  { href: "/", label: "Today", Icon: Sun },
  { href: "/thoughts", label: "Thoughts", Icon: MessageCircle },
  { href: "/ideas", label: "Ideas", Icon: Lightbulb },
  { href: "/tasks", label: "Tasks", Icon: CheckSquare },
  { href: "/reflections", label: "Reflections", Icon: Moon },
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

      {/* Phone: bottom bar — five content tabs, roomy. */}
      <nav
        aria-label="Primary"
        className="sm:hidden fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-hairline bg-paper/90 backdrop-blur-md"
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
              className="flex flex-1 items-center justify-center"
            >
              <span
                className={[
                  "grid h-10 w-10 place-items-center rounded-full transition-colors",
                  active ? "bg-sage-tint text-sage" : "text-ink-muted",
                ].join(" ")}
              >
                <item.Icon size={21} strokeWidth={1.5} />
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
