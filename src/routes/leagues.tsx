import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/cricmaster/Navbar";
import {
  type LeagueStore,
  loadLeagues,
  createLeague,
  deleteLeague,
} from "@/lib/leagues";

export const Route = createFileRoute("/leagues")({
  head: () => ({
    meta: [
      { title: "Leagues & Competitions — CricMaster" },
      {
        name: "description",
        content:
          "Create leagues and competitions, register teams and organise your cricket match schedules all in one place with CricMaster.",
      },
      { property: "og:title", content: "Leagues & Competitions — CricMaster" },
      {
        property: "og:description",
        content: "Organise teams and match schedules by competition.",
      },
    ],
  }),
  component: LeaguesPage,
});

export function useLeagues() {
  const [store, setStore] = useState<LeagueStore>({});
  useEffect(() => {
    const sync = () => setStore(loadLeagues());
    sync();
    window.addEventListener("cricmaster:leagues-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cricmaster:leagues-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return store;
}

function LeaguesPage() {
  const store = useLeagues();
  const leagues = useMemo(
    () =>
      Object.values(store).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [store],
  );
  const [name, setName] = useState("");
  const [season, setSeason] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createLeague(name, season || new Date().getFullYear().toString());
    setName("");
    setSeason("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight">
            Leagues & <span className="text-primary">Competitions</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Organise teams and match schedules by competition.
          </p>
        </header>

        <form
          onSubmit={submit}
          className="mb-8 grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_180px_auto]"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="League name (e.g. Premier T20 Cup)"
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="Season (e.g. 2026)"
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
          >
            Create League
          </button>
        </form>

        {leagues.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No leagues yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first competition above to start scheduling matches.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map((l) => {
              const played = l.matches.filter(
                (m) => m.status === "completed",
              ).length;
              return (
                <div
                  key={l.id}
                  className="group relative rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
                >
                  <Link
                    to="/leagues/$id"
                    params={{ id: l.id }}
                    className="block"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {l.season || "Season"}
                      </span>
                    </div>
                    <h3 className="font-heading text-xl font-bold tracking-tight">
                      {l.name}
                    </h3>
                    <div className="mt-4 flex gap-5 text-sm text-muted-foreground">
                      <span>
                        <strong className="text-foreground">
                          {l.teams.length}
                        </strong>{" "}
                        teams
                      </span>
                      <span>
                        <strong className="text-foreground">
                          {l.matches.length}
                        </strong>{" "}
                        matches
                      </span>
                      <span>
                        <strong className="text-foreground">{played}</strong>{" "}
                        played
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Delete league "${l.name}"?`))
                        deleteLeague(l.id);
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