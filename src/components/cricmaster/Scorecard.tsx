import type { InningsCard, SavedMatch } from "@/lib/matchHistory";
import { oversText, strikeRate, economy } from "@/lib/cricket";

function InningsTable({ card }: { card: InningsCard }) {
  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-white/[0.02] px-4 py-2.5">
        <h3 className="font-heading text-base font-bold">{card.battingTeam}</h3>
        <span className="font-mono text-base font-bold">
          {card.runs}/{card.wickets}{" "}
          <span className="text-xs text-muted-foreground">
            ({oversText(card.balls)})
          </span>
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2 font-bold">Batter</th>
            <th className="px-2 py-2 text-right font-bold">R</th>
            <th className="px-2 py-2 text-right font-bold">B</th>
            <th className="px-2 py-2 text-right font-bold">4s</th>
            <th className="px-2 py-2 text-right font-bold">6s</th>
            <th className="px-3 py-2 text-right font-bold">SR</th>
          </tr>
        </thead>
        <tbody>
          {card.batters
            .filter((b) => b.balls > 0 || b.runs > 0 || b.out)
            .map((b, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-3 py-2 font-medium">{b.name}</td>
                <td className="px-2 py-2 text-right font-mono">{b.runs}</td>
                <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                  {b.balls}
                </td>
                <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                  {b.fours}
                </td>
                <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                  {b.sixes}
                </td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                  {strikeRate(b.runs, b.balls)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <table className="w-full border-t border-border text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2 font-bold">Bowler</th>
            <th className="px-2 py-2 text-right font-bold">O</th>
            <th className="px-2 py-2 text-right font-bold">R</th>
            <th className="px-2 py-2 text-right font-bold">W</th>
            <th className="px-3 py-2 text-right font-bold">Econ</th>
          </tr>
        </thead>
        <tbody>
          {card.bowlers
            .filter((b) => b.balls > 0)
            .map((b, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-3 py-2 font-medium">{b.name}</td>
                <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                  {oversText(b.balls)}
                </td>
                <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                  {b.runs}
                </td>
                <td className="px-2 py-2 text-right font-mono">{b.wickets}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                  {economy(b.runs, b.balls)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  );
}

export function Scorecard({ match }: { match: SavedMatch }) {
  return (
    <div>
      {match.manOfTheMatch && (
        <p className="mb-3 text-sm">
          <span className="text-muted-foreground">Man of the Match:</span>{" "}
          <span className="font-bold text-primary">{match.manOfTheMatch}</span>
        </p>
      )}
      {(match.innings ?? []).map((inn, i) => (
        <InningsTable key={i} card={inn} />
      ))}
    </div>
  );
}