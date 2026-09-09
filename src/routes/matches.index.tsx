import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/cricmaster/Navbar";
import { listMatches, deleteMatch, type SavedMatch } from "@/lib/matchHistory";
import { oversText } from "@/lib/cricket";
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

        {matches.length > 0 && (
          <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(PAGE);
                }}
                placeholder="Search team, venue, result or MoM"
                aria-label="Search matches"
                className={`${field} w-full pl-9`}
              />
            </div>
            <select
              value={team}
              onChange={(e) => {
                setTeam(e.target.value);
                setLimit(PAGE);
              }}
              aria-label="Filter by team"
              className={field}
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
              className={field}
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
              className={field}
            />
            {hasFilters && (
              <button
                onClick={() => {
                  setQuery("");
                  setTeam("");
                  setFrom("");
                  setTo("");
                }}
                className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground sm:col-span-2 lg:col-span-5"
              >
                <X className="size-3.5" /> Clear filters
              </button>
            )}
          </div>
        )}

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
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No matches match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search term or clear the filters.
            </p>
          </div>
        ) : (
          <>
          <ul className="space-y-4">
            {visible.map((m) => {
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
                  <ConfirmButton
                    title="Delete this match?"
                    description={`"${m.teamA} vs ${m.teamB}" ka scorecard permanently delete ho jayega.`}
                    onConfirm={() => {
                      try {
                        deleteMatch(m.id);
                        toast.success("Match deleted");
                      } catch {
                        toast.error("Match delete nahi ho paya. Dobara try karein.");
                      }
                    }}
                    className="absolute right-4 top-4 text-xs text-muted-foreground transition-opacity hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                  >
                    Delete
                  </ConfirmButton>
                </li>
              );
            })}
          </ul>
          <LoadMore
            shown={visible.length}
            total={filtered.length}
            noun="matches"
            onMore={() => setLimit((l) => l + PAGE)}
          />
          </>
        )}
      </main>
    </div>
  );
}
