import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/cricmaster/Navbar";
import {
  type Team,
  listTeams,
  upsertTeam,
  deleteTeam,
  teamRecord,
} from "@/lib/teams";
import { DemoDataButtons } from "@/components/cricmaster/DemoDataButtons";
import { ConfirmButton } from "@/components/cricmaster/ConfirmButton";
import { LoadMore } from "@/components/cricmaster/LoadMore";

const PAGE = 12;

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
      { property: "og:image", content: "https://cricmaster1.lovable.app/og-teams.jpg" },
      { name: "twitter:image", content: "https://cricmaster1.lovable.app/og-teams.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Team ka naam zaroori hai.");
      return;
    }
    if (trimmed.length < 2) {
      setError("Team name kam se kam 2 characters ka hona chahiye.");
      return;
    }
    if (trimmed.length > 40) {
      setError("Team name 40 characters se kam rakhein.");
      return;
    }
    if (teams.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" naam ki team already exist karti hai.`);
      return;
    }
    if (ground.trim().length > 60) {
      setError("Home ground 60 characters se kam rakhein.");
      return;
    }
    try {
      upsertTeam({ name: trimmed, homeGround: ground.trim() });
      toast.success(`Team "${trimmed}" added`);
      setName("");
      setGround("");
      setError("");
    } catch {
      toast.error("Team save nahi ho payi. Dobara try karein.");
    }
  };

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? teams.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.homeGround.toLowerCase().includes(q) ||
            t.squad.some((p) => p.toLowerCase().includes(q)),
        )
      : teams;
  }, [teams, query]);
  const visible = sorted.slice(0, limit);

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
          noValidate
          className="mb-8 grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input
            value={name}
            maxLength={40}
            aria-label="Team name"
            aria-invalid={!!error}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="Team name"
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            value={ground}
            maxLength={60}
            aria-label="Home ground"
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
          {error && (
            <p role="alert" className="text-xs font-medium text-destructive sm:col-span-3">
              {error}
            </p>
          )}
        </form>

        {teams.length > 3 && (
          <div className="relative mb-6 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="Search team, ground or player"
              aria-label="Search teams"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear team search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}

        {teams.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No teams yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a team above to start building squads.
            </p>
            <DemoDataButtons />
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No teams match "{query}"</p>
          </div>
        ) : (
          <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((t) => {
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
                  <ConfirmButton
                    title={`Delete team "${t.name}"?`}
                    description="Team profile aur squad delete ho jayegi. Saved match scorecards par asar nahi hoga."
                    onConfirm={() => {
                      try {
                        deleteTeam(t.name);
                        toast.success(`Team "${t.name}" deleted`);
                      } catch {
                        toast.error("Team delete nahi ho payi. Dobara try karein.");
                      }
                    }}
                    className="absolute right-4 top-4 text-xs text-muted-foreground transition-opacity hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                  >
                    Delete
                  </ConfirmButton>
                </div>
              );
            })}
          </div>
          <LoadMore
            shown={visible.length}
            total={sorted.length}
            noun="teams"
            onMore={() => setLimit((l) => l + PAGE)}
          />
          </>
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
