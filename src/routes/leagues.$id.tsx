import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/cricmaster/Navbar";
import {
  type League,
  type MatchStage,
  type ScheduledMatch,
  type PointsRules,
  getLeague,
  addTeam,
  removeTeam,
  addMatch,
  updateMatch,
  removeMatch,
  setMatchStage,
  computeStandings,
  getPointsRules,
  updatePointsRules,
  POINTS_PRESETS,
} from "@/lib/leagues";

const FIXTURE_KEY = "cricmaster:pendingFixture";

export const Route = createFileRoute("/leagues/$id")({
  head: () => ({ meta: [{ title: "League — CricMaster" }] }),
  component: LeagueDetailPage,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-medium">League not found</p>
        <Link to="/leagues" className="mt-4 inline-block text-primary">
          Back to leagues
        </Link>
      </main>
    </div>
  );
}

function useLeague(id: string): League | undefined {
  const [league, setLeague] = useState<League | undefined>(undefined);
  useEffect(() => {
    const sync = () => setLeague(getLeague(id));
    sync();
    window.addEventListener("cricmaster:leagues-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cricmaster:leagues-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [id]);
  return league;
}

function LeagueDetailPage() {
  const { id } = Route.useParams();
  const league = useLeague(id);

  if (!league) return <NotFound />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link
          to="/leagues"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All leagues
        </Link>
        <header className="mb-8 mt-2">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {league.season || "Season"}
          </span>
          <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight">
            {league.name}
          </h1>
        </header>

        <StandingsPanel league={league} />
        <PointsRulesPanel league={league} />
        <PlayoffsPanel league={league} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <TeamsPanel league={league} />
          <SchedulePanel league={league} />
        </div>
      </main>
    </div>
  );
}

function StandingsPanel({ league }: { league: League }) {
  const standings = useMemo(() => computeStandings(league), [league]);
  if (league.teams.length === 0) return null;
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border bg-white/[0.02] px-5 py-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Points Table
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Tiebreakers: Points → Wins → Head-to-head → Net Run Rate
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 font-bold">Team</th>
              <th className="px-2 py-2 text-right font-bold">P</th>
              <th className="px-2 py-2 text-right font-bold">W</th>
              <th className="px-2 py-2 text-right font-bold">L</th>
              <th className="px-2 py-2 text-right font-bold">T</th>
              <th className="px-2 py-2 text-right font-bold">Bonus</th>
              <th className="px-2 py-2 text-right font-bold">Pts</th>
              <th className="px-4 py-2 text-right font-bold">NRR</th>
              <th className="px-4 py-2 text-left font-bold">Ranking Reason</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.team} className="border-b border-border/50">
                <td className="px-4 py-2 font-medium">
                  <span className="mr-2 text-muted-foreground">{i + 1}</span>
                  {s.team}
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {s.played}
                </td>
                <td className="px-2 py-2 text-right text-primary">{s.won}</td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {s.lost}
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {s.tied}
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {s.bonus}
                </td>
                <td className="px-2 py-2 text-right font-bold">{s.points}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">
                  {s.nrr >= 0 ? "+" : ""}
                  {s.nrr.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-left text-xs text-muted-foreground">
                  {s.reason ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const STAGE_LABEL: Record<MatchStage, string> = {
  group: "Group",
  qualifier: "Qualifier",
  semi: "Semi-Final",
  final: "Final",
};

function PointsRulesPanel({ league }: { league: League }) {
  const current = getPointsRules(league);
  const [rules, setRules] = useState<PointsRules>(current);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setRules(getPointsRules(league));
  }, [league]);

  const set = (patch: Partial<PointsRules>) =>
    setRules((r) => ({ ...r, ...patch }));

  const save = () => {
    updatePointsRules(league.id, rules);
    setOpen(false);
  };

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between border-b border-border bg-white/[0.02] px-5 py-3 text-left"
      >
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Points Rules
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Win {current.win} · Draw {current.draw} · Loss {current.loss}
            {current.bonusEnabled
              ? ` · +1 bonus (RR ≥ ${current.bonusRunRateFactor}×)`
              : ""}
          </p>
        </div>
        <span className="text-xs font-bold text-primary">
          {open ? "Close" : "Edit"}
        </span>
      </button>
      {open && (
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Win points
            </span>
            <input
              type="number"
              value={rules.win}
              onChange={(e) => set({ win: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Draw / tie points
            </span>
            <input
              type="number"
              value={rules.draw}
              onChange={(e) => set({ draw: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Loss points
            </span>
            <input
              type="number"
              value={rules.loss}
              onChange={(e) => set({ loss: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-3">
            <input
              type="checkbox"
              checked={rules.bonusEnabled}
              onChange={(e) => set({ bonusEnabled: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            <span>Award +1 bonus point for a dominant win</span>
          </label>
          {rules.bonusEnabled && (
            <label className="text-sm sm:col-span-3">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Bonus run-rate factor (winner RR ≥ factor × loser RR)
              </span>
              <input
                type="number"
                step="0.05"
                value={rules.bonusRunRateFactor}
                onChange={(e) =>
                  set({ bonusRunRateFactor: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary sm:max-w-[200px]"
              />
            </label>
          )}
          <div className="flex gap-2 sm:col-span-3">
            <button
              onClick={save}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
            >
              Save Rules
            </button>
            <button
              onClick={() => setRules(getPointsRules(league))}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-primary"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function PlayoffsPanel({ league }: { league: League }) {
  const playoffs = league.matches.filter((m) => m.stage && m.stage !== "group");
  if (playoffs.length === 0) return null;
  const order: MatchStage[] = ["qualifier", "semi", "final"];
  const sorted = [...playoffs].sort(
    (a, b) => order.indexOf(a.stage!) - order.indexOf(b.stage!),
  );
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5">
      <div className="border-b border-primary/20 px-5 py-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary">
          Playoff Bracket
        </h2>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {sorted.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-border bg-card p-4 text-center"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {STAGE_LABEL[m.stage!]}
            </p>
            <p className="mt-2 font-heading text-lg font-bold">
              {m.homeTeam}
            </p>
            <p className="text-xs text-muted-foreground">vs</p>
            <p className="font-heading text-lg font-bold">{m.awayTeam}</p>
            {m.status === "completed" && m.result && (
              <p className="mt-2 text-xs font-medium text-primary">{m.result}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamsPanel({ league }: { league: League }) {
  const [team, setTeam] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!team.trim()) return;
    addTeam(league.id, team);
    setTeam("");
  };
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Teams ({league.teams.length})
      </h2>
      <form onSubmit={submit} className="mb-4 flex gap-2">
        <input
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          placeholder="Add team"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
        >
          Add
        </button>
      </form>
      {league.teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">No teams yet.</p>
      ) : (
        <ul className="space-y-2">
          {league.teams.map((t) => (
            <li
              key={t}
              className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <Link
                to="/teams/$name"
                params={{ name: t }}
                className="font-medium hover:text-primary"
              >
                {t}
              </Link>
              <button
                onClick={() => removeTeam(league.id, t)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SchedulePanel({ league }: { league: League }) {
  const router = useRouter();
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [stage, setStage] = useState<MatchStage>("group");

  const canAdd = league.teams.length >= 2;
  const sorted = useMemo(
    () => [...league.matches].sort((a, b) => a.date.localeCompare(b.date)),
    [league.matches],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!home || !away || home === away || !date) return;
    addMatch(league.id, { homeTeam: home, awayTeam: away, date, venue, stage });
    setHome("");
    setAway("");
    setDate("");
    setVenue("");
    setStage("group");
  };

  const scoreMatch = (m: ScheduledMatch) => {
    const fixture = {
      teamA: m.homeTeam,
      teamB: m.awayTeam,
      venue: m.venue || "",
      overs: 20,
      leagueId: league.id,
      leagueMatchId: m.id,
    };
    window.localStorage.setItem(FIXTURE_KEY, JSON.stringify(fixture));
    router.navigate({ to: "/" });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Match Schedule ({league.matches.length})
      </h2>

      {canAdd ? (
        <form
          onSubmit={submit}
          className="mb-5 grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-2"
        >
          <select
            value={home}
            onChange={(e) => setHome(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Home team</option>
            {league.teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={away}
            onChange={(e) => setAway(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Away team</option>
            {league.teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Venue (optional)"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as MatchStage)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2"
          >
            <option value="group">League / Group game</option>
            <option value="qualifier">Qualifier</option>
            <option value="semi">Semi-Final</option>
            <option value="final">Final</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover sm:col-span-2"
          >
            Schedule Match
          </button>
        </form>
      ) : (
        <p className="mb-5 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          Add at least two teams to schedule matches.
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches scheduled.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-heading text-lg font-bold">
                    {m.homeTeam} <span className="text-muted-foreground">vs</span>{" "}
                    {m.awayTeam}
                    {m.stage && m.stage !== "group" && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                        {STAGE_LABEL[m.stage]}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {m.date
                      ? new Date(m.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "TBD"}
                    {m.venue ? ` · ${m.venue}` : ""}
                  </div>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    m.status === "completed"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.status}
                </span>
              </div>

              {m.status === "completed" && m.result && (
                <p className="mt-2 text-sm font-medium text-primary">
                  {m.result}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {m.status === "scheduled" ? (
                  <>
                    <button
                      onClick={() => scoreMatch(m)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
                    >
                      Score Match
                    </button>
                    <button
                      onClick={() => {
                        const result = prompt(
                          `Enter result (e.g. ${m.homeTeam} won by 5 wickets):`,
                        );
                        if (result !== null)
                          updateMatch(league.id, m.id, {
                            status: "completed",
                            result,
                          });
                      }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-primary"
                    >
                      Mark Completed
                    </button>
                  </>
                ) : (
                  <>
                    {m.matchRecordId && (
                      <Link
                        to="/matches/$id"
                        params={{ id: m.matchRecordId }}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
                      >
                        Scorecard
                      </Link>
                    )}
                    <button
                      onClick={() =>
                        updateMatch(league.id, m.id, {
                          status: "scheduled",
                          result: "",
                        })
                      }
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-primary"
                    >
                      Reopen
                    </button>
                  </>
                )}
                {m.stage !== "group" && m.status === "scheduled" && (
                  <select
                    value={m.stage ?? "group"}
                    onChange={(e) =>
                      setMatchStage(
                        league.id,
                        m.id,
                        e.target.value as MatchStage,
                      )
                    }
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none"
                  >
                    <option value="group">Group</option>
                    <option value="qualifier">Qualifier</option>
                    <option value="semi">Semi</option>
                    <option value="final">Final</option>
                  </select>
                )}
                <button
                  onClick={() => removeMatch(league.id, m.id)}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
