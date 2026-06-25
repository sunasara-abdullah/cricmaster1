export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <h1 className="font-heading text-2xl font-bold tracking-tighter text-primary">
            CRICMASTER
          </h1>
          <div className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex">
            <span className="text-primary">Live Scoring</span>
            <span className="transition-colors hover:text-foreground">Series</span>
            <span className="transition-colors hover:text-foreground">Teams</span>
            <span className="transition-colors hover:text-foreground">Rankings</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1">
            <span className="size-2 animate-pulse rounded-full bg-destructive" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">
              Live
            </span>
          </div>
          <button className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover">
            Pro Login
          </button>
        </div>
      </div>
    </nav>
  );
}