import { useState } from "react";
import type { MatchConfig } from "@/lib/cricket";

export function MatchSetup({ onStart }: { onStart: (config: MatchConfig) => void }) {
  const [config, setConfig] = useState<MatchConfig>({
    teamA: "India",
    teamB: "Australia",
    overs: 20,
    striker: "V. Kohli",
    nonStriker: "R. Sharma",
    bowler: "M. Starc",
    venue: "Wankhede Stadium",
  });

  const set = (k: keyof MatchConfig, v: string | number) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const field =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";
  const labelCls = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
          New Match Setup
        </p>
        <h2 className="font-heading text-4xl font-bold tracking-tight">Start Scoring</h2>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Batting Team</label>
            <input className={field} value={config.teamA} onChange={(e) => set("teamA", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Bowling Team</label>
            <input className={field} value={config.teamB} onChange={(e) => set("teamB", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Overs</label>
            <input
              type="number"
              min={1}
              max={50}
              className={field}
              value={config.overs}
              onChange={(e) => set("overs", Math.max(1, Number(e.target.value)))}
            />
          </div>
          <div>
            <label className={labelCls}>Venue</label>
            <input className={field} value={config.venue} onChange={(e) => set("venue", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Striker</label>
            <input className={field} value={config.striker} onChange={(e) => set("striker", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Non-Striker</label>
            <input className={field} value={config.nonStriker} onChange={(e) => set("nonStriker", e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Opening Bowler</label>
          <input className={field} value={config.bowler} onChange={(e) => set("bowler", e.target.value)} />
        </div>

        <button
          onClick={() => onStart(config)}
          className="w-full rounded-xl bg-primary py-3.5 font-heading text-lg font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          Start Match
        </button>
      </div>
    </div>
  );
}