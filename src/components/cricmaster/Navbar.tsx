import { Link } from "@tanstack/react-router";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-heading text-2xl font-bold tracking-tighter text-primary">
            CRICMASTER
          </Link>
          <div className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link to="/" activeProps={{ className: "text-primary" }} className="transition-colors hover:text-foreground">
              Live Scoring
            </Link>
            <Link to="/players" activeProps={{ className: "text-primary" }} className="transition-colors hover:text-foreground">
              Players
            </Link>
            <Link to="/leagues" activeProps={{ className: "text-primary" }} className="transition-colors hover:text-foreground">
              Leagues
            </Link>
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
        </div>
      </div>
    </nav>
  );
}