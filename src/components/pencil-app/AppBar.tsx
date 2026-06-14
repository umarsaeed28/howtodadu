"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Heart, CalendarClock, User } from "lucide-react";
import { useAppStore } from "@/lib/store";

function Wordmark() {
  return (
    <Link
      href="/app"
      className="flex items-center gap-2 shrink-0"
      aria-label="Pencil — home"
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-[6px]"
        style={{ background: "var(--green)" }}
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 19l2-6L17 3l4 4L11 17l-6 2z"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className="pa-display text-[1.15rem]"
        style={{ color: "var(--ink)" }}
      >
        Pencil
      </span>
    </Link>
  );
}

function TopSearch() {
  const query = useAppStore((s) => s.query);
  const setQuery = useAppStore((s) => s.setQuery);
  return (
    <form
      className="relative flex-1 max-w-xl hidden md:block"
      role="search"
      onSubmit={(e) => e.preventDefault()}
    >
      <label htmlFor="pa-search" className="sr-only">
        Search address, neighborhood, or ZIP
      </label>
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: "var(--slate)" }}
        aria-hidden
      />
      <input
        id="pa-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Address, neighborhood, or ZIP — Seattle / Puget Sound"
        className="w-full rounded-[6px] border bg-[var(--card)] py-2 pl-9 pr-3 text-sm pa-mono"
        style={{ borderColor: "var(--hairline)" }}
      />
    </form>
  );
}

export default function AppBar() {
  const pathname = usePathname();
  const savedCount = useAppStore((s) => s.saved.length);

  const links = [
    { href: "/app/saved", label: "Saved", Icon: Heart, badge: savedCount },
    { href: "/app/daily-deals", label: "Daily deals", Icon: CalendarClock },
  ];

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b bg-[var(--card)]"
        style={{ borderColor: "var(--hairline)" }}
      >
        <div className="flex items-center gap-4 px-4 py-2.5">
          <Wordmark />
          <TopSearch />
          <nav className="ml-auto hidden md:flex items-center gap-1">
            {links.map(({ href, label, Icon, badge }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="pa-btn pa-btn-sm relative"
                  style={
                    active
                      ? {
                          background: "var(--green-tint)",
                          borderColor: "var(--green)",
                          color: "var(--green)",
                        }
                      : undefined
                  }
                >
                  <Icon size={15} aria-hidden />
                  {label}
                  {badge ? (
                    <span
                      className="pa-mono ml-1 rounded-full px-1.5 text-[0.65rem]"
                      style={{ background: "var(--green)", color: "#fff" }}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            <button
              type="button"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border"
              style={{ borderColor: "var(--hairline)", background: "var(--paper)" }}
              aria-label="Account"
            >
              <User size={16} aria-hidden />
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-3 border-t bg-[var(--card)] md:hidden"
        style={{ borderColor: "var(--hairline)" }}
        aria-label="Primary"
      >
        {[
          { href: "/app", label: "Search", Icon: Search },
          { href: "/app/saved", label: "Saved", Icon: Heart },
          { href: "/app/daily-deals", label: "Daily deals", Icon: CalendarClock },
        ].map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 py-2 text-[0.7rem]"
              style={{ color: active ? "var(--green)" : "var(--slate)", minHeight: 56 }}
            >
              <Icon size={20} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
