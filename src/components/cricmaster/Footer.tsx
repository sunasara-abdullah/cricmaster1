import { Link } from "@tanstack/react-router";
import markUrl from "@/assets/cricmaster-mark.png";

const groups = [
  {
    title: "Product",
    links: [
      { to: "/", label: "Live Scoring" },
      { to: "/matches", label: "Matches" },
      { to: "/players", label: "Players" },
      { to: "/teams", label: "Teams" },
      { to: "/leagues", label: "Leagues" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact & Support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/terms", label: "Terms of Service" },
      { to: "/privacy", label: "Privacy Policy" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <img src={markUrl} alt="CricMaster logo" className="h-8 w-auto" />
            <span className="font-heading text-xl font-bold tracking-tighter">
              <span className="text-foreground">Cric</span>
              <span className="text-primary">Master</span>
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Broadcast-grade cricket scoring — ball-by-ball live scoring, scorecards,
            player stats and league standings.
          </p>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {g.title}
            </h2>
            <ul className="space-y-2 text-sm">
              {g.links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CricMaster. All rights reserved.
      </div>
    </footer>
  );
}
