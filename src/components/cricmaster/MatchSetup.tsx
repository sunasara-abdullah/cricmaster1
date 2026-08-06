import { useEffect, useMemo, useState } from "react";
import type { MatchConfig } from "@/lib/cricket";
import { listTeams, type Team } from "@/lib/teams";

export function MatchSetup({
  onStart,
  initial,
}: {
  onStart: (config: MatchConfig) => void;
  initial?: Partial<MatchConfig>;
}) {
  const [config, setConfig] = useState<MatchConfig>({
    teamA: initial?.teamA ?? "",
    teamB: initial?.teamB ?? "",
    overs: initial?.overs ?? 20,
    striker: "",
    nonStriker: "",
    bowler: "",
    venue: initial?.venue ?? "",
    playersPerTeam: 11,
    tossWinner: initial?.teamA ?? "",
    tossDecision: "bat",
    leagueId: initial?.leagueId,
    leagueMatchId: initial?.leagueMatchId,
  });

  const set = (k: keyof MatchConfig, v: string | number) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const [teams, setTeams] = useState<Team[]>([]);
  useEffect(() => {
    const sync = () => setTeams(listTeams());
    sync();
    window.addEventListener("cricmaster:teams-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cricmaster:teams-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const battingFirst = useMemo(() => {
    const tw = config.tossWinner || config.teamA;
    const other = tw === config.teamA ? config.teamB : config.teamA;
    return config.tossDecision === "bat" ? tw : other;
  }, [config.tossWinner, config.tossDecision, config.teamA, config.teamB]);

  const squadOf = (teamName: string) =>
    teams.find((t) => t.name.toLowerCase() === teamName.trim().toLowerCase())
      ?.squad ?? [];
  const bowlingFirstTeam =
    battingFirst === config.teamA ? config.teamB : config.teamA;
  const battingSquad = squadOf(battingFirst);
  const bowlingSquad = squadOf(bowlingFirstTeam);

  const field =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";
  const labelCls =
    "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

  const start = () => {
    if (
      !config.teamA.trim() ||
      !config.teamB.trim() ||
      !config.striker.trim() ||
      !config.nonStriker.trim() ||
      !config.bowler.trim()
    )
      return;
    const bowlingFirst =
      battingFirst === config.teamA ? config.teamB : config.teamA;
    onStart({
      ...config,
      battingFirst,
      // openers always belong to the batting-first side
      teamA: config.teamA,
      teamB: config.teamB,
      // ensure header reflects batting team; Scoreboard uses battingFirst
      bowler: config.bowler,
      striker: config.striker,
      nonStriker: config.nonStriker,
      // keep bowling side reference
      ...(bowlingFirst ? {} : {}),
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
          New Match Setup
        </p>
        <h2 className="font-heading text-4xl font-bold tracking-tight">
          Start Scoring
        </h2>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Team A</label>
            <input
              className={field}
              list="cm-teams"
              placeholder="e.g. Mumbai XI"
              value={config.teamA}
              onChange={(e) => {
                set("teamA", e.target.value);
                if (config.tossWinner === config.teamA)
                  set("tossWinner", e.target.value);
              }}
            />
          </div>
          <div>
            <label className={labelCls}>Team B</label>
            <input
              className={field}
              list="cm-teams"
              placeholder="e.g. Delhi XI"
              value={config.teamB}
              onChange={(e) => set("teamB", e.target.value)}
            />
          </div>
          <datalist id="cm-teams">
            {teams.map((t) => (
              <option key={t.name} value={t.name} />
            ))}
          </datalist>
        </div>

        {teams.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Saved teams:
            </span>
            {teams.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() =>
                  setConfig((c) =>
                    c.teamA.trim() === "" || c.teamA === t.name
                      ? { ...c, teamA: t.name, tossWinner: c.tossWinner || t.name }
                      : { ...c, teamB: t.name },
                  )
                }
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
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
            <label className={labelCls}>Players / Team</label>
            <input
              type="number"
              min={2}
              max={15}
              className={field}
              value={config.playersPerTeam}
              onChange={(e) =>
                set("playersPerTeam", Math.max(2, Number(e.target.value)))
              }
            />
          </div>
          <div>
            <label className={labelCls}>Venue</label>
            <input
              className={field}
              placeholder="Venue"
              value={config.venue}
              onChange={(e) => set("venue", e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-primary">
            Toss
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Toss Won By</label>
              <select
                className={field}
                value={config.tossWinner}
                onChange={(e) => set("tossWinner", e.target.value)}
              >
                <option value={config.teamA}>{config.teamA}</option>
                <option value={config.teamB}>{config.teamB}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Elected To</label>
              <select
                className={field}
                value={config.tossDecision}
                onChange={(e) =>
                  set("tossDecision", e.target.value as "bat" | "bowl")
                }
              >
                <option value="bat">Bat first</option>
                <option value="bowl">Bowl first</option>
              </select>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            <strong className="text-foreground">{battingFirst}</strong> will bat
            first.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Striker ({battingFirst})</label>
            <input
              className={field}
              list="cm-batting-squad"
              placeholder="Striker name"
              value={config.striker}
              onChange={(e) => set("striker", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Non-Striker</label>
            <input
              className={field}
              list="cm-batting-squad"
              placeholder="Non-striker name"
              value={config.nonStriker}
              onChange={(e) => set("nonStriker", e.target.value)}
            />
          </div>
          <datalist id="cm-batting-squad">
            {battingSquad.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div>
          <label className={labelCls}>Opening Bowler</label>
          <input
            className={field}
            list="cm-bowling-squad"
            placeholder="Bowler name"
            value={config.bowler}
            onChange={(e) => set("bowler", e.target.value)}
          />
          <datalist id="cm-bowling-squad">
            {bowlingSquad.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <button
          onClick={start}
          disabled={
            !config.teamA.trim() ||
            !config.teamB.trim() ||
            !config.striker.trim() ||
            !config.nonStriker.trim() ||
            !config.bowler.trim()
          }
          className="w-full rounded-xl bg-primary py-3.5 font-heading text-lg font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Match
        </button>
      </div>
    </div>
  );
}
