import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

const links = [
  { to: "/", label: "Live Scoring" },
  { to: "/matches", label: "Matches" },
  { to: "/players", label: "Players" },
  { to: "/teams", label: "Teams" },
  { to: "/leagues", label: "Leagues" },
] as const;

export function Navbar() {
  const handleLogout = () => {
    if (typeof window === "undefined") return;
    if (
      !window.confirm(
        "Sign out & reset? This clears all matches, players, teams, leagues and setup data on this device.",
      )
    )
      return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("cricmaster:")) keys.push(k);
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tighter text-primary"
          >
            <img
              src="/favicon.png"
              alt="CricMaster logo"
              width={32}
              height={32}
              className="size-8"
            />
            CRICMASTER
          </Link>
          <div className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeProps={{ className: "text-primary" }}
                activeOptions={{ exact: l.to === "/" }}
                className="transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1">
            <span className="size-2 animate-pulse rounded-full bg-destructive" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">
              Live
            </span>
          </div>
          <Link
            to="/players"
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Dashboard
          </Link>
          <button
            onClick={handleLogout}
            title="Sign out & reset all data"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
