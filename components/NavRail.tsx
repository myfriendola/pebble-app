"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, MessageCircle, CheckSquare, Moon } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Today", Icon: Sun },
  { href: "/thoughts", label: "Thoughts", Icon: MessageCircle },
  { href: "/tasks", label: "Tasks", Icon: CheckSquare },
  { href: "/reflections", label: "Reflections", Icon: Moon },
] as const;

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
        className="hidden sm:flex fixed left-0 top-0 z-20 h-full w-[54px] flex-col items-center gap-1 border-r border-hairline bg-paper pt-8"
      >
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              title={label}
              className="group grid h-11 w-11 place-items-center rounded-full transition-colors"
            >
              <span
                className={[
                  "grid h-9 w-9 place-items-center rounded-full transition-colors",
                  active
                    ? "bg-sage-tint text-sage"
                    : "text-ink-muted group-hover:text-ink-secondary",
                ].join(" ")}
              >
                <Icon size={19} strokeWidth={1.5} />
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Phone: bottom bar with the same four icons. */}
      <nav
        aria-label="Primary"
        className="sm:hidden fixed inset-x-0 bottom-0 z-20 flex h-16 items-stretch border-t border-hairline bg-paper/95 backdrop-blur-sm"
      >
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 items-center justify-center"
            >
              <span
                className={[
                  "grid h-10 w-10 place-items-center rounded-full transition-colors",
                  active ? "bg-sage-tint text-sage" : "text-ink-muted",
                ].join(" ")}
              >
                <Icon size={21} strokeWidth={1.5} />
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
