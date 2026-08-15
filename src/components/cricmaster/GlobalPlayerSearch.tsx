import { useEffect, useState } from "react";
import { Search, Globe, ChevronDown, LogIn } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  type GlobalPlayer,
  searchGlobalPlayers,
} from "@/lib/globalPlayers";
import {
  battingAverage,
  battingSR,
  bowlingAverage,
  bowlingEcon,
  bestFigures,
} from "@/lib/playerStats";

export function GlobalPlayerSearch() {
  const { user, loading } = useAuth();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<GlobalPlayer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRows([]);
      return;
    }
    let active = true;
    setBusy(true);
    const t = setTimeout(() => {
      searchGlobalPlayers(query)
        .then((r) => {
          if (!active) return;
          setRows(r);
          setError("");
        })
        .catch(() => active && setError("Search abhi load nahi ho payi. Dobara try karein."))
        .finally(() => active && setBusy(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, user]);

  if (loading) return null;

  if (!user) {
    return (
      <section className="mb-8 rounded-2xl border border-border bg-card p-6 text-center">
        <Globe className="mx-auto mb-2 size-6 text-primary" />
        <h2 className="font-heading text-xl font-bold">Search every player on CricMaster</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Login karein aur poore CricMaster network ke players ki lifetime batting &
          bowling history search karein.
        </p>
        <Link
          to="/auth"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <LogIn className="size-4" /> Login to search
        </Link>
      </section>
    );
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-white/[0.02] px-3 py-3 sm:px-4">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Globe className="size-3.5 text-primary" /> Global Player Search
        </h2>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any player on CricMaster"
            aria-label="Search all players on CricMaster"
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      {error && <p className="px-4 py-4 text-sm text-destructive">{error}</p>}

      {busy && rows.length === 0 ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          {query
            ? `"${query}" naam ka koi player abhi tak record nahi hua.`
            : "Abhi tak koi player record nahi hua. Match score karke stats save karein."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((p) => {
            const open = openSlug === p.slug;
            const avg = battingAverage(p.batting);
            const bAvg = bowlingAverage(p.bowling);
            return (
              <li key={p.slug}>
                <button
                  onClick={() => setOpenSlug(open ? null : p.slug)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-white/[0.02] sm:px-4"
                >
                  {p.photo ? (
                    <img
                      src={p.photo}
                      alt={`${p.name} photo`}
                      className="size-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.matches} matches · {p.batting.runs} runs · {p.bowling.wickets} wkts
                    </span>
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <div className="grid gap-4 border-t border-border bg-white/[0.02] px-3 py-4 sm:grid-cols-2 sm:px-4">
                    <StatBlock
                      title="Batting"
                      items={[
                        ["Innings", `${p.batting.innings}`],
                        ["Runs", `${p.batting.runs}`],
                        ["Highest", `${p.batting.highest}`],
                        ["Average", avg === null ? "—" : avg.toFixed(2)],
                        ["Strike rate", battingSR(p.batting).toFixed(1)],
                        ["4s / 6s", `${p.batting.fours} / ${p.batting.sixes}`],
                        ["50s / 100s", `${p.batting.fifties} / ${p.batting.hundreds}`],
                        ["Not outs", `${p.batting.notOuts}`],
                      ]}
                    />
                    <StatBlock
                      title="Bowling"
                      items={[
                        ["Innings", `${p.bowling.innings}`],
                        ["Overs", `${Math.floor(p.bowling.balls / 6)}.${p.bowling.balls % 6}`],
                        ["Runs", `${p.bowling.runs}`],
                        ["Wickets", `${p.bowling.wickets}`],
                        ["Average", bAvg === null ? "—" : bAvg.toFixed(2)],
                        ["Economy", p.bowling.balls ? bowlingEcon(p.bowling).toFixed(2) : "—"],
                        ["Best", bestFigures(p.bowling)],
                        ["Scorers", `${p.scorers}`],
                      ]}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StatBlock({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {items.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-2">
            <dt className="truncate text-xs text-muted-foreground">{k}</dt>
            <dd className="font-mono">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}