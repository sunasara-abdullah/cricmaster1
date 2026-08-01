import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/cricmaster/Navbar";
import { Breadcrumbs } from "@/components/cricmaster/Breadcrumbs";
import { type Team, getTeam, upsertTeam, teamRecord } from "@/lib/teams";
import { listMatches, type SavedMatch } from "@/lib/matchHistory";
import { TeamLogo } from "./teams";

export const Route = createFileRoute("/teams/$name")({
  head: ({ params }) => ({
    meta: [{ title: `${params.name} — Team Profile | CricMaster` }],
  }),
  component: TeamProfile,
});

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function TeamProfile() {
  const { name } = Route.useParams();
  const [team, setTeam] = useState<Team | undefined>(undefined);
  const [matches, setMatches] = useState<SavedMatch[]>([]);
  const [ready, setReady] = useState(false);
  const [player, setPlayer] = useState("");

  useEffect(() => {
    const sync = () => {
      setTeam(getTeam(name));
      setMatches(listMatches());
      setReady(true);
    };
    sync();
    window.addEventListener("cricmaster:teams-updated", sync);
    window.addEventListener("cricmaster:matches-updated", sync);
    return () => {
      window.removeEventListener("cricmaster:teams-updated", sync);
      window.removeEventListener("cricmaster:matches-updated", sync);
    };
  }, [name]);

  const teamMatches = useMemo(
    () => matches.filter((m) => m.teamA === name || m.teamB === name),
    [matches, name],
  );
  const rec = useMemo(() => teamRecord(name, matches), [name, matches]);

  if (ready && !team) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="text-lg font-medium">Team "{name}" not found</p>
          <Link to="/teams" className="mt-4 inline-block text-primary">
            Back to teams
          </Link>
        </main>
      </div>
    );
  }

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !player.trim()) return;
    if (team.squad.some((p) => p.toLowerCase() === player.trim().toLowerCase()))
      return;
    upsertTeam({ name: team.name, squad: [...team.squad, player.trim()] });
    setPlayer("");
  };

  const removePlayer = (p: string) => {
    if (!team) return;
    upsertTeam({ name: team.name, squad: team.squad.filter((x) => x !== p) });
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !team) return;
    const url = await fileToDataUrl(f);
    upsertTeam({ name: team.name, logo: url });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Breadcrumbs
          backTo="/teams"
          backLabel="All teams"
          items={[{ label: "Teams", to: "/teams" }, { label: team ? team.name : "Team" }]}
        />

        {team && (
          <>
            <header className="mb-8 mt-3 flex items-center gap-4">
              <TeamLogo team={team} size={72} />
              <div>
                <h1 className="font-heading text-3xl font-bold tracking-tight">
                  {team.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {team.homeGround || "No home ground set"}
                </p>
                <label className="mt-1 inline-block cursor-pointer text-xs text-primary hover:underline">
                  Upload logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onLogo}
                    className="hidden"
                  />
                </label>
              </div>
            </header>

            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Played" value={rec.played} />
              <Stat label="Won" value={rec.won} />
              <Stat label="Lost" value={rec.lost} />
              <Stat label="Win %" value={`${rec.winPct.toFixed(0)}%`} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Squad ({team.squad.length})
                </h2>
                <form onSubmit={addPlayer} className="mb-4 flex gap-2">
                  <input
                    value={player}
                    onChange={(e) => setPlayer(e.target.value)}
                    placeholder="Add player"
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
                  >
                    Add
                  </button>
                </form>
                {team.squad.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No players yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {team.squad.map((p) => (
                      <li
                        key={p}
                        className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      >
                        <Link
                          to="/players/$name"
                          params={{ name: p }}
                          className="font-medium hover:text-primary"
                        >
                          {p}
                        </Link>
                        <button
                          onClick={() => removePlayer(p)}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Matches ({teamMatches.length})
                </h2>
                {teamMatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No matches played yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {teamMatches.map((m) => (
                      <li key={m.id}>
                        <Link
                          to="/matches/$id"
                          params={{ id: m.id }}
                          className="block rounded-xl border border-border bg-background px-3 py-2 text-sm hover:border-primary"
                        >
                          <span className="font-medium">
                            {m.teamA} vs {m.teamB}
                          </span>
                          <span
                            className={`ml-2 text-xs ${
                              m.winner === name
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            {m.result}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-heading text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
