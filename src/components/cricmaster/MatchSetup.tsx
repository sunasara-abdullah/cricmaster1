import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Shuffle, ArrowLeftRight, RotateCcw, Plus, Check } from "lucide-react";
import type { MatchConfig } from "@/lib/cricket";
import { listTeams, upsertTeam, getTeam, type Team } from "@/lib/teams";

const LAST_KEY = "cricmaster:last-setup:v1";
const OVERS_PRESETS = [5, 10, 20, 50];

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
    ballType: "leather",
    leagueId: initial?.leagueId,
    leagueMatchId: initial?.leagueMatchId,
  });
  const [lineupA, setLineupA] = useState<string[]>([]);
  const [lineupB, setLineupB] = useState<string[]>([]);
  const [newPlayer, setNewPlayer] = useState({ team: "", name: "" });
  const [error, setError] = useState("");

  const set = (k: keyof MatchConfig, v: string | number) => {
    setError("");
    setConfig((c) => ({ ...c, [k]: v }));
  };

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

  const squadOf = (teamName: string) =>
    teams.find((t) => t.name.toLowerCase() === teamName.trim().toLowerCase())
      ?.squad ?? [];

  const squadA = squadOf(config.teamA);
  const squadB = squadOf(config.teamB);

  // Default the playing XI to the full saved squad whenever a team changes.
  useEffect(() => {
    setLineupA(squadOf(config.teamA));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.teamA, teams]);
  useEffect(() => {
    setLineupB(squadOf(config.teamB));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.teamB, teams]);

  // Auto-fill venue from the home ground of team A.
  useEffect(() => {
    const t = getTeam(config.teamA);
    if (t?.homeGround && !config.venue) set("venue", t.homeGround);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.teamA]);

  const battingFirst = useMemo(() => {
    const tw = config.tossWinner || config.teamA;
    const other = tw === config.teamA ? config.teamB : config.teamA;
    return config.tossDecision === "bat" ? tw : other;
  }, [config.tossWinner, config.tossDecision, config.teamA, config.teamB]);

  const bowlingFirst =
    battingFirst === config.teamA ? config.teamB : config.teamA;
  const battingLineup = battingFirst === config.teamA ? lineupA : lineupB;
  const bowlingLineup = battingFirst === config.teamA ? lineupB : lineupA;

  const format =
    config.overs <= 5
      ? "T5"
      : config.overs <= 10
        ? "T10"
        : config.overs <= 20
          ? "T20"
          : config.overs <= 50
            ? "ODI"
            : `${config.overs} overs`;

  const field =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";
  const labelCls =
    "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground";
  const chip =
    "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary";

  const validate = () => {
    if (!config.teamA.trim() || !config.teamB.trim())
      return "Dono teams ka naam zaroori hai.";
    if (config.teamA.trim().toLowerCase() === config.teamB.trim().toLowerCase())
      return "Team A aur Team B alag honi chahiye.";
    if (config.overs < 1 || config.overs > 100)
      return "Overs 1 se 100 ke beech rakhein.";
    if (!config.striker.trim() || !config.nonStriker.trim())
      return "Dono openers select karein.";
    if (
      config.striker.trim().toLowerCase() ===
      config.nonStriker.trim().toLowerCase()
    )
      return "Striker aur non-striker same nahi ho sakte.";
    if (!config.bowler.trim()) return "Opening bowler select karein.";
    return "";
  };

  const start = () => {
    const err = validate();
    if (err) {
      setError(err);
      toast.error(err);
      return;
    }
    const final: MatchConfig = {
      ...config,
      battingFirst,
      matchType: format,
      lineupA,
      lineupB,
    };
    try {
      window.localStorage.setItem(
        LAST_KEY,
        JSON.stringify({
          teamA: config.teamA,
          teamB: config.teamB,
          overs: config.overs,
          venue: config.venue,
          playersPerTeam: config.playersPerTeam,
          ballType: config.ballType,
        }),
      );
    } catch {
      /* ignore */
    }
    onStart(final);
  };

  const restoreLast = () => {
    try {
      const raw = window.localStorage.getItem(LAST_KEY);
      if (!raw) return toast.error("Koi pichhla setup save nahi hai.");
      const last = JSON.parse(raw) as Partial<MatchConfig>;
      setConfig((c) => ({ ...c, ...last, tossWinner: last.teamA ?? c.tossWinner }));
      toast.success("Pichhla match setup restore ho gaya");
    } catch {
      toast.error("Setup restore nahi ho paya.");
    }
  };

  const swapTeams = () =>
    setConfig((c) => ({
      ...c,
      teamA: c.teamB,
      teamB: c.teamA,
      tossWinner: c.tossWinner === c.teamA ? c.teamB : c.teamA,
    }));

  const randomToss = () => {
    if (!config.teamA || !config.teamB)
      return toast.error("Pehle dono teams choose karein.");
    const winner = Math.random() < 0.5 ? config.teamA : config.teamB;
    const decision = Math.random() < 0.5 ? "bat" : "bowl";
    setConfig((c) => ({ ...c, tossWinner: winner, tossDecision: decision }));
    toast.success(`${winner} won the toss & chose to ${decision}`);
  };

  const pickTeam = (name: string) =>
    setConfig((c) =>
      !c.teamA.trim() || c.teamA === name
        ? { ...c, teamA: name, tossWinner: c.tossWinner || name }
        : { ...c, teamB: name },
    );

  const toggleLineup = (side: "A" | "B", player: string) => {
    const [list, setList] = side === "A" ? [lineupA, setLineupA] : [lineupB, setLineupB];
    (setList as (v: string[]) => void)(
      list.includes(player)
        ? list.filter((p) => p !== player)
        : [...list, player],
    );
  };

  const addSquadPlayer = (teamName: string) => {
    const n = newPlayer.name.trim();
    if (!n) return;
    if (squadOf(teamName).some((p) => p.toLowerCase() === n.toLowerCase()))
      return toast.error(`${n} already squad me hai.`);
    const t = getTeam(teamName);
    upsertTeam({ name: teamName, squad: [...(t?.squad ?? []), n] });
    setNewPlayer({ team: teamName, name: "" });
    toast.success(`${n} ${teamName} squad me add ho gaya`);
  };

  const teamSelect = (side: "A" | "B") => {
    const key = side === "A" ? "teamA" : "teamB";
    const value = side === "A" ? config.teamA : config.teamB;
    const otherValue = side === "A" ? config.teamB : config.teamA;
    return (
      <div>
        <label className={labelCls} htmlFor={`team-${side}`}>
          Team {side}
        </label>
        {teams.length > 0 && (
          <select
            id={`team-${side}-select`}
            aria-label={`Select saved team ${side}`}
            className={`${field} mb-2`}
            value={teams.some((t) => t.name === value) ? value : ""}
            onChange={(e) => {
              const v = e.target.value;
              setConfig((c) => ({
                ...c,
                [key]: v,
                tossWinner:
                  side === "A" && (!c.tossWinner || c.tossWinner === c.teamA)
                    ? v
                    : c.tossWinner,
              }));
              setError("");
            }}
          >
            <option value="">— Saved team choose karein —</option>
            {teams
              .filter((t) => t.name !== otherValue)
              .map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.squad.length})
                </option>
              ))}
          </select>
        )}
        <input
          id={`team-${side}`}
          className={field}
          list="cm-teams"
          aria-label={`Team ${side} name`}
          placeholder={side === "A" ? "e.g. Mumbai XI" : "e.g. Delhi XI"}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            setConfig((c) => ({
              ...c,
              [key]: v,
              tossWinner:
                side === "A" && c.tossWinner === c.teamA ? v : c.tossWinner,
            }));
            setError("");
          }}
        />
      </div>
    );
  };

  const lineupPanel = (side: "A" | "B") => {
    const name = side === "A" ? config.teamA : config.teamB;
    const squad = side === "A" ? squadA : squadB;
    const lineup = side === "A" ? lineupA : lineupB;
    if (!name.trim()) return null;
    return (
      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">
            {name} lineup
          </p>
          <span className="text-[10px] font-medium text-muted-foreground">
            {lineup.length}/{config.playersPerTeam ?? 11}
          </span>
        </div>
        {squad.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Is team ka squad khali hai — niche player add karein.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {squad.map((p) => {
              const on = lineup.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleLineup(side, p)}
                  aria-pressed={on}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    on
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {on && <Check className="size-3" />}
                  {p}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <input
            className={`${field} py-1.5 text-xs`}
            placeholder="Add player to squad"
            aria-label={`Add player to ${name}`}
            value={newPlayer.team === name ? newPlayer.name : ""}
            onChange={(e) => setNewPlayer({ team: name, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSquadPlayer(name);
              }
            }}
          />
          <button
            type="button"
            onClick={() => addSquadPlayer(name)}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/40 px-3 text-xs font-bold text-primary hover:bg-primary/10"
          >
            <Plus className="size-3" /> Add
          </button>
        </div>
      </div>
    );
  };

  const playerField = (
    id: string,
    label: string,
    key: "striker" | "nonStriker" | "bowler",
    options: string[],
  ) => (
    <div>
      <label className={labelCls} htmlFor={id}>
        {label}
      </label>
      {options.length > 0 ? (
        <select
          id={id}
          aria-label={label}
          className={field}
          value={options.includes(config[key]) ? config[key] : ""}
          onChange={(e) => set(key, e.target.value)}
        >
          <option value="">— Choose player —</option>
          {options.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          aria-label={label}
          className={field}
          placeholder={`${label} name`}
          value={config[key]}
          onChange={(e) => set(key, e.target.value)}
        />
      )}
    </div>
  );

  const ready = !validate();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
          New Match Setup
        </p>
        <h2 className="font-heading text-4xl font-bold tracking-tight">
          Start Scoring
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {format} · {config.playersPerTeam ?? 11}-a-side
          {config.venue ? ` · ${config.venue}` : ""}
        </p>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={restoreLast} className={chip}>
            <RotateCcw className="mr-1 inline size-3" /> Last setup
          </button>
          <button type="button" onClick={swapTeams} className={chip}>
            <ArrowLeftRight className="mr-1 inline size-3" /> Swap teams
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {teamSelect("A")}
          {teamSelect("B")}
          <datalist id="cm-teams">
            {teams.map((t) => (
              <option key={t.name} value={t.name} />
            ))}
          </datalist>
        </div>

        {teams.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Saved teams:
            </span>
            {teams.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => pickTeam(t.name)}
                className={chip}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {lineupPanel("A")}
          {lineupPanel("B")}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className={labelCls} htmlFor="overs">
              Overs
            </label>
            <input
              id="overs"
              type="number"
              min={1}
              max={100}
              className={field}
              value={config.overs}
              onChange={(e) => set("overs", Math.max(1, Number(e.target.value)))}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="ppt">
              Players / Team
            </label>
            <input
              id="ppt"
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
            <label className={labelCls} htmlFor="ball">
              Ball Type
            </label>
            <select
              id="ball"
              className={field}
              value={config.ballType}
              onChange={(e) => set("ballType", e.target.value)}
            >
              <option value="leather">Leather</option>
              <option value="tennis">Tennis</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="venue">
              Venue
            </label>
            <input
              id="venue"
              className={field}
              placeholder="Venue"
              value={config.venue}
              onChange={(e) => set("venue", e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Quick overs:
          </span>
          {OVERS_PRESETS.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => set("overs", o)}
              className={`${chip} ${config.overs === o ? "border-primary text-primary" : ""}`}
            >
              {o} ov
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Toss
            </p>
            <button type="button" onClick={randomToss} className={chip}>
              <Shuffle className="mr-1 inline size-3" /> Flip coin
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="toss-winner">
                Toss Won By
              </label>
              <select
                id="toss-winner"
                className={field}
                value={config.tossWinner}
                onChange={(e) => set("tossWinner", e.target.value)}
              >
                <option value={config.teamA}>{config.teamA || "Team A"}</option>
                <option value={config.teamB}>{config.teamB || "Team B"}</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="toss-decision">
                Elected To
              </label>
              <select
                id="toss-decision"
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
            <strong className="text-foreground">
              {battingFirst || "—"}
            </strong>{" "}
            will bat first
            {bowlingFirst ? `, ${bowlingFirst} will bowl.` : "."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {playerField(
            "striker",
            `Striker (${battingFirst || "batting side"})`,
            "striker",
            battingLineup,
          )}
          {playerField(
            "non-striker",
            "Non-Striker",
            "nonStriker",
            battingLineup.filter((p) => p !== config.striker),
          )}
        </div>

        {playerField(
          "bowler",
          `Opening Bowler (${bowlingFirst || "bowling side"})`,
          "bowler",
          bowlingLineup,
        )}

        {error && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        )}

        <button
          onClick={start}
          disabled={!ready}
          className="w-full rounded-xl bg-primary py-3.5 font-heading text-lg font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Match
        </button>
      </div>
    </div>
  );
}
