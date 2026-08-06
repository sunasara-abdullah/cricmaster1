import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Navbar } from "@/components/cricmaster/Navbar";
import {
  type PlayerProfile,
  loadStats,
  battingAverage,
  battingSR,
  bowlingEcon,
  bestFigures,
} from "@/lib/playerStats";
import { LoadMore } from "@/components/cricmaster/LoadMore";

const PAGE = 25;

export const Route = createFileRoute("/players")({
  head: () => ({
    meta: [
      { title: "Player Stats Dashboard — CricMaster" },
      {
        name: "description",
        content:
          "Lifetime batting and bowling stats for every player — runs, averages, strike rates, wickets and economy across all your CricMaster matches.",
      },
      { property: "og:title", content: "Player Stats Dashboard — CricMaster" },
      {
        property: "og:description",
        content: "Career batting & bowling leaderboards across all your matches.",
      },
      { property: "og:image", content: "https://cricmaster1.lovable.app/og-players.jpg" },
      { name: "twitter:image", content: "https://cricmaster1.lovable.app/og-players.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayersPage,
});

function useStats() {
  const [store, setStore] = useState<Record<string, PlayerProfile>>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      setStore(loadStats());
      setReady(true);
    };
    sync();
    window.addEventListener("cricmaster:stats-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cricmaster:stats-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { store, ready };
}

function PlayersPage() {
  const { store, ready } = useStats();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | "batting" | "bowling">("all");
  const [limit, setLimit] = useState(PAGE);
  const players = useMemo(
    () => Object.values(store).sort((a, b) => b.batting.runs - a.batting.runs),
    [store],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (role === "batting" && p.batting.innings === 0) return false;
      if (role === "bowling" && p.bowling.balls === 0) return false;
      return true;
    });
  }, [players, query, role]);
  const visible = filtered.slice(0, limit);

  const topBat = useMemo(
    () => [...players].sort((a, b) => b.batting.runs - a.batting.runs).slice(0, 5),
    [players],
  );
  const topBowl = useMemo(
    () =>
      [...players]
        .filter((p) => p.bowling.wickets > 0)
        .sort((a, b) => b.bowling.wickets - a.bowling.wickets)
        .slice(0, 5),
    [players],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight">
            Player <span className="text-primary">Dashboard</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Lifetime stats across all matches you've scored.
          </p>
        </header>

        {!ready ? (
          <div className="grid gap-6 md:grid-cols-2" aria-label="Loading player stats">
            {[0, 1].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No player stats yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Score a match and hit "Save Stats" to start building profiles.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link
                to="/"
                className="rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground hover:bg-primary-hover"
              >
                Start Scoring
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-6 md:grid-cols-2">
              <Leaderboard
                title="Most Runs"
                rows={topBat.map((p) => ({
                  name: p.name,
                  value: `${p.batting.runs}`,
                  sub: `${p.batting.innings} inns`,
                }))}
              />
              <Leaderboard
                title="Most Wickets"
                rows={topBowl.map((p) => ({
                  name: p.name,
                  value: `${p.bowling.wickets}`,
                  sub: bestFigures(p.bowling),
                }))}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex flex-wrap items-center gap-3 border-b border-border bg-white/[0.02] px-4 py-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  All Players
                </h2>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setLimit(PAGE);
                      }}
                      placeholder="Search player"
                      aria-label="Search players"
                      className="w-44 rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value as "all" | "batting" | "bowling");
                      setLimit(PAGE);
                    }}
                    aria-label="Filter players by role"
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                  >
                    <option value="all">All</option>
                    <option value="batting">Batters</option>
                    <option value="bowling">Bowlers</option>
                  </select>
                  {(query || role !== "all") && (
                    <button
                      onClick={() => {
                        setQuery("");
                        setRole("all");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" /> Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Player</th>
                      <th className="px-3 py-2 text-right font-semibold">M</th>
                      <th className="px-3 py-2 text-right font-semibold">Runs</th>
                      <th className="px-3 py-2 text-right font-semibold">Avg</th>
                      <th className="px-3 py-2 text-right font-semibold">SR</th>
                      <th className="px-3 py-2 text-right font-semibold">Wkts</th>
                      <th className="px-3 py-2 text-right font-semibold">Econ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No players match your search.
                        </td>
                      </tr>
                    )}
                    {visible.map((p) => {
                      const avg = battingAverage(p.batting);
                      return (
                        <tr key={p.name} className="border-b border-border/60 hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-medium">
                            <Link
                              to="/players/$name"
                              params={{ name: p.name }}
                              className="text-primary hover:underline"
                            >
                              {p.name}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-muted-foreground">{p.matches}</td>
                          <td className="px-3 py-3 text-right font-mono">{p.batting.runs}</td>
                          <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                            {avg === null ? "—" : avg.toFixed(1)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                            {battingSR(p.batting).toFixed(1)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono">{p.bowling.wickets}</td>
                          <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                            {p.bowling.balls ? bowlingEcon(p.bowling).toFixed(1) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <LoadMore
              shown={visible.length}
              total={filtered.length}
              noun="players"
              onMore={() => setLimit((l) => l + PAGE)}
            />
          </>
        )}
      </main>
    </div>
  );
}

function Leaderboard({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; value: string; sub: string }[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border bg-white/[0.02] px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      </div>
      <div className="divide-y divide-border">
        {rows.length === 0 && <p className="px-4 py-4 text-sm text-muted-foreground">No data yet.</p>}
        {rows.map((r, i) => (
          <div key={r.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                {i + 1}
              </span>
              <Link
                to="/players/$name"
                params={{ name: r.name }}
                className="font-medium hover:text-primary"
              >
                {r.name}
              </Link>
            </div>
            <div className="text-right">
              <p className="font-heading text-lg font-bold text-primary">{r.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}