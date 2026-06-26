import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/cricmaster/Navbar";
import { listMatches, deleteMatch, type SavedMatch } from "@/lib/matchHistory";
import { oversText } from "@/lib/cricket";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Match History & Scorecards — CricMaster" },
      {
        name: "description",
        content:
          "Browse completed match scorecards with full batting and bowling cards, results and Man of the Match awards on CricMaster.",
      },
      { property: "og:title", content: "Match History & Scorecards — CricMaster" },
      {
        property: "og:description",
        content: "Full scorecards, results and awards for every completed match.",
      },
    ],
  }),
  component: MatchesPage,
});

function useMatches() {
  const [m, setM] = useState<SavedMatch[]>([]);
  useEffect(() => {
    const sync = () => setM(listMatches());
    sync();
    window.addEventListener("cricmaster:matches-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cricmaster:matches-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return m;
}

function MatchesPage() {
  const matches = useMatches();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight">
            Match <span className="text-primary">History</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Every completed match with full scorecards and awards.
          </p>
        </header>

        {matches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No matches saved yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Finish a match's 2nd innings and save it to see it here.
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
              const i1 = m.innings[0];
              const i2 = m.innings[1];
              return (
                <li
                  key={m.id}
                  className="group relative rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
                >
                  <Link to="/matches/$id" params={{ id: m.id }} className="block">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-heading text-xl font-bold">
                        {m.teamA} vs {m.teamB}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(m.date).toLocaleDateString()} · {m.overs} ov ·{" "}
                        {m.venue}
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
                      {m.manOfTheMatch ? ` · MoM: ${m.manOfTheMatch}` : ""}
                    </p>
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm("Delete this match?")) deleteMatch(m.id);
                    }}
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
