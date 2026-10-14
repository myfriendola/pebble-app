"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sun,
  MessageCircle,
  Lightbulb,
  CheckSquare,
  Moon,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

type Item = { href: string; label: string; Icon: LucideIcon };

const CONTENT: Item[] = [
  { href: "/", label: "Today", Icon: Sun },
  { href: "/thoughts", label: "Thoughts", Icon: MessageCircle },
  { href: "/ideas", label: "Ideas", Icon: Lightbulb },
  { href: "/tasks", label: "Tasks", Icon: CheckSquare },
  { href: "/reflections", label: "Reflections", Icon: Moon },
  { href: "/search", label: "Search", Icon: Search },
];

const SETTINGS: Item = { href: "/settings", label: "Settings", Icon: Settings };

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavRail() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: slim left icon rail (54px). Settings sits apart at the bottom. */}
      <nav
        aria-label="Primary"
        className="hidden sm:flex fixed left-0 top-0 z-20 h-full w-[54px] flex-col items-center gap-1 border-r border-hairline bg-paper pb-6 pt-8"
      >
        {CONTENT.map((item) => (
          <RailLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <RailLink
          item={SETTINGS}
          active={isActive(pathname, SETTINGS.href)}
          className="mt-auto"
        />
      </nav>

      {/* Phone: bottom bar with every icon. */}
      <nav
        aria-label="Primary"
        className="sm:hidden fixed inset-x-0 bottom-0 z-20 flex h-16 items-stretch border-t border-hairline bg-paper/95 backdrop-blur-sm"
      >
        {[...CONTENT, SETTINGS].map((item) => {
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
                <item.Icon size={20} strokeWidth={1.5} />
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function RailLink({
  item,
  active,
  className = "",
}: {
  item: Item;
  active: boolean;
  className?: string;
}) {
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={`group grid h-11 w-11 place-items-center rounded-full transition-colors ${className}`}
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
}
