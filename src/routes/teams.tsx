import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/cricmaster/Navbar";
import {
  type Team,
  listTeams,
  upsertTeam,
  deleteTeam,
  teamRecord,
} from "@/lib/teams";

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: "Teams & Squads — CricMaster" },
      {
        name: "description",
        content:
          "Create team profiles with logos and squads, and track win percentage and records across all your cricket matches.",
      },
      { property: "og:title", content: "Teams & Squads — CricMaster" },
      {
        property: "og:description",
        content: "Team profiles, squads, logos and win records.",
      },
    ],
  }),
  component: TeamsPage,
});

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  useEffect(() => {
    const sync = () => setTeams(listTeams());
    sync();
    window.addEventListener("cricmaster:teams-updated", sync);
    window.addEventListener("cricmaster:matches-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cricmaster:teams-updated", sync);
      window.removeEventListener("cricmaster:matches-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return teams;
}

function TeamsPage() {
  const teams = useTeams();
  const [name, setName] = useState("");
  const [ground, setGround] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    upsertTeam({ name, homeGround: ground });
    setName("");
    setGround("");
  };

  const sorted = useMemo(() => teams, [teams]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight">
            Teams & <span className="text-primary">Squads</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Build team profiles with logos, squads and win records.
          </p>
        </header>

        <form
          onSubmit={submit}
          className="mb-8 grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team name"
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            value={ground}
            onChange={(e) => setGround(e.target.value)}
            placeholder="Home ground (optional)"
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
          >
            Add Team
          </button>
        </form>

        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No teams yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a team above to start building squads.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((t) => {
              const rec = teamRecord(t.name);
              return (
                <div
                  key={t.name}
                  className="group relative rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
                >
                  <Link
                    to="/teams/$name"
                    params={{ name: t.name }}
                    className="block"
                  >
                    <div className="flex items-center gap-3">
                      <TeamLogo team={t} />
                      <div>
                        <h3 className="font-heading text-xl font-bold tracking-tight">
                          {t.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {t.squad.length} players
                          {t.homeGround ? ` · ${t.homeGround}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                      <span>
                        <strong className="text-foreground">{rec.played}</strong>{" "}
                        P
                      </span>
                      <span>
                        <strong className="text-primary">{rec.won}</strong> W
                      </span>
                      <span>
                        <strong className="text-foreground">{rec.lost}</strong> L
                      </span>
                      <span>
                        <strong className="text-foreground">
                          {rec.winPct.toFixed(0)}%
                        </strong>{" "}
                        win
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Delete team "${t.name}"?`)) deleteTeam(t.name);
                    }}
                    className="absolute right-4 top-4 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export function TeamLogo({ team, size = 48 }: { team: Team; size?: number }) {
  if (team.logo) {
    return (
      <img
        src={team.logo}
        alt={`${team.name} logo`}
        style={{ width: size, height: size }}
        className="rounded-xl object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground"
    >
      {team.name.charAt(0).toUpperCase()}
    </div>
  );
}
