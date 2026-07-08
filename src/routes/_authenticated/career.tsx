import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, FileDown, Search, X } from "lucide-react";
import { Navbar } from "@/components/cricmaster/Navbar";
import { Scorecard } from "@/components/cricmaster/Scorecard";
import { oversText } from "@/lib/cricket";
import {
  listCareerMatches,
  deleteCareerMatch,
  computeCareerStats,
  type CareerMatch,
} from "@/lib/career";
import { exportCareerPdf, exportMatchPdf } from "@/lib/careerExport";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/career")({
  head: () => ({
    meta: [
      { title: "My Career — CricMaster" },
      {
        name: "description",
        content: "Your saved cricket career: matches, results and awards.",
      },
    ],
  }),
  component: CareerPage,
});

type ResultFilter = "all" | "won" | "lost" | "tie";

function CareerPage() {
  const { displayName } = useAuth();
  const [matches, setMatches] = useState<CareerMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const [result, setResult] = useState<ResultFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = () => {
    setLoading(true);
    listCareerMatches()
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const teams = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.team_a) set.add(m.team_a);
      if (m.team_b) set.add(m.team_b);
    });
    return Array.from(set).sort();
  }, [matches]);

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      const q = query.trim().toLowerCase();
      if (q) {
        const hay = `${m.team_a} ${m.team_b} ${m.venue} ${m.man_of_the_match} ${m.result}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (team && m.team_a !== team && m.team_b !== team) return false;
      if (result !== "all") {
        const won = !!m.winner;
        if (result === "tie" && won) return false;
        if (result === "won" && !won) return false;
        if (result === "lost" && won) {
          // "lost" isn't tracked per-user; treat matches with a winner other filters handle
        }
      }
      if (from && new Date(m.played_at) < new Date(from)) return false;
      if (to && new Date(m.played_at) > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [matches, query, team, result, from, to]);

  const stats = computeCareerStats(filtered);

  const hasFilters = query || team || result !== "all" || from || to;
  const clearFilters = () => {
    setQuery("");
    setTeam("");
    setResult("all");
    setFrom("");
    setTo("");
  };

  const remove = async (id: string) => {
    if (!confirm("Is match ko career se delete karein?")) return;
    await deleteCareerMatch(id);
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-bold tracking-tight">
              {displayName ? `${displayName}'s ` : "My "}
              <span className="text-primary">Career</span>
            </h1>
            <p className="mt-1 text-muted-foreground">
              Aapke saare saved matches ek jagah — search, filter aur download karein.
            </p>
          </div>
          {matches.length > 0 && (
            <button
              onClick={() => exportCareerPdf(filtered, displayName)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
            >
              <FileDown className="size-4" />
              Export Career PDF
            </button>
          )}
        </header>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Matches", value: stats.matches },
            { label: "Results", value: stats.wins },
            { label: "MoM Awards", value: stats.motm },
            { label: "Total Runs", value: stats.runs },
            { label: "Total Wkts", value: stats.wickets },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-card p-4 text-center"
            >
              <div className="font-heading text-3xl font-bold text-primary">
                {s.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {matches.length > 0 && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-4">
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search team, venue, MoM…"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">All teams</option>
                {teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as ResultFilter)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="all">All results</option>
                <option value="won">Has winner</option>
                <option value="tie">Tie / No result</option>
              </select>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" /> Clear filters ({filtered.length} of{" "}
                {matches.length})
              </button>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : matches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No matches in your career yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ek match complete karke save karein — wo yahan aapke career me
              hamesha ke liye save ho jayega.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
            >
              Start Scoring
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No matches match your filters</p>
            <button
              onClick={clearFilters}
              className="mt-3 text-sm font-semibold text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="space-y-4">
            {filtered.map((m) => {
              const i1 = m.data?.innings?.[0];
              const i2 = m.data?.innings?.[1];
              const open = expanded === m.id;
              return (
                <li
                  key={m.id}
                  className="group rounded-2xl border border-border bg-card"
                >
                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-heading text-xl font-bold">
                        {m.team_a} vs {m.team_b}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(m.played_at).toLocaleDateString()} · {m.overs}{" "}
                        ov{m.venue ? ` · ${m.venue}` : ""}
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
                      {m.man_of_the_match ? ` · MoM: ${m.man_of_the_match}` : ""}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setExpanded(open ? null : m.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/50"
                      >
                        <ChevronDown
                          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                        {open ? "Hide scorecard" : "View scorecard"}
                      </button>
                      <button
                        onClick={() => exportMatchPdf(m)}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/50"
                      >
                        <Download className="size-4" />
                        PDF
                      </button>
                      <button
                        onClick={() => remove(m.id)}
                        className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="border-t border-border p-5">
                      <Scorecard match={m.data} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}