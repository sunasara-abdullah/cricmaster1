import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/cricmaster/Navbar";
import { listMatches, deleteMatch, type SavedMatch } from "@/lib/matchHistory";
import { oversText } from "@/lib/cricket";
import { DemoDataButtons } from "@/components/cricmaster/DemoDataButtons";
import { ConfirmButton } from "@/components/cricmaster/ConfirmButton";
import { LoadMore } from "@/components/cricmaster/LoadMore";

const PAGE = 10;

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Match History & Scorecards — CricMaster" },
      {
        name: "description",
        content:
          "Browse completed match scorecards with full batting and bowling cards, results and Man of the Match awards on CricMaster.",
      },
      { property: "og:title", content: "Match History & Scorecards — CricMaster" },
      {
        property: "og:description",
        content: "Full scorecards, results and awards for every completed match.",
      },
      { property: "og:image", content: "https://cricmaster1.lovable.app/og-matches.jpg" },
      { name: "twitter:image", content: "https://cricmaster1.lovable.app/og-matches.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchesPage,
});

function useMatches() {
  const [m, setM] = useState<SavedMatch[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      setM(listMatches());
      setReady(true);
    };
    sync();
    window.addEventListener("cricmaster:matches-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cricmaster:matches-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { matches: m, ready };
}

function MatchesPage() {
  const { matches, ready } = useMatches();
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const teams = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      set.add(m.teamA);
      set.add(m.teamB);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [matches]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches.filter((m) => {
      if (q) {
        const hay = `${m.teamA} ${m.teamB} ${m.venue} ${m.result} ${m.manOfTheMatch ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (team && m.teamA !== team && m.teamB !== team) return false;
      if (from && new Date(m.date) < new Date(from)) return false;
      if (to && new Date(m.date) > new Date(`${to}T23:59:59`)) return false;
      return true;
    });
  }, [matches, query, team, from, to]);

  const hasFilters = !!(query || team || from || to);
  const visible = filtered.slice(0, limit);
  const field =
    "rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight">
            Match <span className="text-primary">History</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Every completed match with full scorecards and awards.
          </p>
        </header>

        {!ready ? (
          <ul className="space-y-4" aria-label="Loading matches">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </ul>
        ) : matches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No matches saved yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Finish a match's 2nd innings and save it to see it here.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link
                to="/"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
              >
                Start Scoring
              </Link>
              <DemoDataButtons compact />
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {matches.map((m) => {
              const i1 = m.innings[0];
              const i2 = m.innings[1];
              return (
                <li
                  key={m.id}
                  className="group relative rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
                >
                  <Link to="/matches/$id" params={{ id: m.id }} className="block">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-heading text-xl font-bold">
                        {m.teamA} vs {m.teamB}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(m.date).toLocaleDateString()} · {m.overs} ov ·{" "}
                        {m.venue}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {i1 && (
                        <span>
                          {i1.battingTeam} {i1.runs}/{i1.wickets} (
                          {oversText(i1.balls)})
                        </span>
                      )}
                      {i2 && (
                        <span>
                          {i2.battingTeam} {i2.runs}/{i2.wickets} (
                          {oversText(i2.balls)})
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium text-primary">
                      {m.result}
                      {m.manOfTheMatch ? ` · MoM: ${m.manOfTheMatch}` : ""}
                    </p>
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm("Delete this match?")) deleteMatch(m.id);
                    }}
                    className="absolute right-4 top-4 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
