import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/cricmaster/Navbar";
import {
  type League,
  getLeague,
  addTeam,
  removeTeam,
  addMatch,
  updateMatch,
  removeMatch,
} from "@/lib/leagues";

export const Route = createFileRoute("/leagues/$id")({
  head: () => ({
    meta: [{ title: "League — CricMaster" }],
  }),
  component: LeagueDetailPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-medium">League not found</p>
        <Link to="/leagues" className="mt-4 inline-block text-primary">
          Back to leagues
        </Link>
      </main>
    </div>
  ),
});

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

  if (!league) {
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
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

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <TeamsPanel league={league} />
          <SchedulePanel league={league} />
        </div>
      </main>
    </div>
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
              <span className="font-medium">{t}</span>
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

  const canAdd = league.teams.length >= 2;
  const sorted = useMemo(
    () => [...league.matches].sort((a, b) => a.date.localeCompare(b.date)),
    [league.matches],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!home || !away || home === away || !date) return;
    addMatch(league.id, { homeTeam: home, awayTeam: away, date, venue });
    setHome("");
    setAway("");
    setDate("");
    setVenue("");
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
                    {m.homeTeam}{" "}
                    <span className="text-muted-foreground">vs</span>{" "}
                    {m.awayTeam}
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
                      onClick={() => router.navigate({ to: "/" })}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
                    >
                      Score Match
                    </button>
                    <button
                      onClick={() => {
                        const result = prompt(
                          "Enter result (e.g. " +
                            m.homeTeam +
                            " won by 5 wickets):",
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