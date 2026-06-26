import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/cricmaster/Navbar";
import { getMatch, type InningsCard, type SavedMatch } from "@/lib/matchHistory";
import { oversText, strikeRate, economy } from "@/lib/cricket";

export const Route = createFileRoute("/matches/$id")({
  head: () => ({ meta: [{ title: "Scorecard — CricMaster" }] }),
  component: ScorecardPage,
});

function ScorecardPage() {
  const { id } = Route.useParams();
  const [match, setMatch] = useState<SavedMatch | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMatch(getMatch(id));
    setReady(true);
  }, [id]);

  if (ready && !match) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="text-lg font-medium">Scorecard not found</p>
          <Link to="/matches" className="mt-4 inline-block text-primary">
            Back to matches
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/matches"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All matches
        </Link>
        {match && (
          <>
            <header className="mb-6 mt-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight">
                {match.teamA} vs {match.teamB}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(match.date).toLocaleString()} · {match.overs} overs ·{" "}
                {match.venue}
              </p>
              {match.toss && (
                <p className="text-xs text-muted-foreground">{match.toss}</p>
              )}
              <p className="mt-3 inline-block rounded-lg bg-primary/10 px-4 py-1.5 font-bold text-primary">
                {match.result}
              </p>
              {match.manOfTheMatch && (
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Man of the Match:</span>{" "}
                  <Link
                    to="/players/$name"
                    params={{ name: match.manOfTheMatch }}
                    className="font-bold text-primary hover:underline"
                  >
                    {match.manOfTheMatch}
                  </Link>
                </p>
              )}
            </header>

            {match.innings.map((inn, i) => (
              <InningsTable key={i} card={inn} />
            ))}
          </>
        )}
      </main>
    </div>
  );
}

function InningsTable({ card }: { card: InningsCard }) {
  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-white/[0.02] px-5 py-3">
        <h2 className="font-heading text-lg font-bold">{card.battingTeam}</h2>
        <span className="font-mono text-lg font-bold">
          {card.runs}/{card.wickets}{" "}
          <span className="text-sm text-muted-foreground">
            ({oversText(card.balls)})
          </span>
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 font-bold">Batter</th>
            <th className="px-2 py-2 text-right font-bold">R</th>
            <th className="px-2 py-2 text-right font-bold">B</th>
            <th className="px-2 py-2 text-right font-bold">4s</th>
            <th className="px-2 py-2 text-right font-bold">6s</th>
            <th className="px-4 py-2 text-right font-bold">SR</th>
          </tr>
        </thead>
        <tbody>
          {card.batters
            .filter((b) => b.balls > 0 || b.runs > 0 || b.out)
            .map((b, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-4 py-2">
                  <Link
                    to="/players/$name"
                    params={{ name: b.name }}
                    className="hover:text-primary"
                  >
                    {b.name}
                  </Link>{" "}
                  <span className="text-xs text-muted-foreground">
                    {b.out ? "out" : "not out"}
                  </span>
                </td>
                <td className="px-2 py-2 text-right font-bold">{b.runs}</td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {b.balls}
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {b.fours}
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {b.sixes}
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground">
                  {strikeRate(b.runs, b.balls)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <table className="w-full border-t border-border text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 font-bold">Bowler</th>
            <th className="px-2 py-2 text-right font-bold">O</th>
            <th className="px-2 py-2 text-right font-bold">R</th>
            <th className="px-2 py-2 text-right font-bold">W</th>
            <th className="px-4 py-2 text-right font-bold">Econ</th>
          </tr>
        </thead>
        <tbody>
          {card.bowlers
            .filter((b) => b.balls > 0)
            .map((b, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-4 py-2">
                  <Link
                    to="/players/$name"
                    params={{ name: b.name }}
                    className="hover:text-primary"
                  >
                    {b.name}
                  </Link>
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {oversText(b.balls)}
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {b.runs}
                </td>
                <td className="px-2 py-2 text-right font-bold">{b.wickets}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">
                  {economy(b.runs, b.balls)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  );
}
