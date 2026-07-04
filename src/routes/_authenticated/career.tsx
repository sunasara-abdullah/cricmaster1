import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/cricmaster/Navbar";
import { oversText } from "@/lib/cricket";
import {
  listCareerMatches,
  deleteCareerMatch,
  computeCareerStats,
  type CareerMatch,
} from "@/lib/career";
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

function CareerPage() {
  const { displayName } = useAuth();
  const [matches, setMatches] = useState<CareerMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listCareerMatches()
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const stats = computeCareerStats(matches);

  const remove = async (id: string) => {
    if (!confirm("Is match ko career se delete karein?")) return;
    await deleteCareerMatch(id);
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight">
            {displayName ? `${displayName}'s ` : "My "}
            <span className="text-primary">Career</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Aapke saare saved matches ek jagah — kahin se bhi dekhein.
          </p>
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
        ) : (
          <ul className="space-y-4">
            {matches.map((m) => {
              const i1 = m.data?.innings?.[0];
              const i2 = m.data?.innings?.[1];
              return (
                <li
                  key={m.id}
                  className="group relative rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-heading text-xl font-bold">
                      {m.team_a} vs {m.team_b}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.played_at).toLocaleDateString()} · {m.overs} ov
                      {m.venue ? ` · ${m.venue}` : ""}
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
                  <button
                    onClick={() => remove(m.id)}
                    className="absolute right-4 top-4 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}