"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/overview", label: "Overview" },
  { href: "/projects", label: "Projects" },
  { href: "/miners", label: "Miners" },
  { href: "/validators", label: "Validators" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/runs", label: "Runs" },
];

export function FloatingNav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
      <nav className="flex items-center gap-1 rounded-full border border-border/60 bg-card/80 px-2 py-1.5 shadow-lg shadow-black/20 backdrop-blur-xl">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors",
            pathname === "/"
              ? "bg-primary text-primary-foreground"
              : "text-primary hover:bg-primary/10"
          )}
        >
          hone
        </Link>

        <div className="mx-1 h-4 w-px bg-border/60" />

        {links.map((link) => {
          const active =
            link.href === "/overview"
              ? pathname === "/overview"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {link.label}
            </Link>
          );
        })}

        <div className="mx-1 h-4 w-px bg-border/60" />

        <a
          href="https://github.com/manifold-inc/hone"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: "rgba(171, 102, 255, 0.15)", color: "#AB66FF" }}
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}
