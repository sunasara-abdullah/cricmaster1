import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  type Batter,
  type Bowler,
  type MatchConfig,
  economy,
  oversText,
  runRate,
  strikeRate,
} from "@/lib/cricket";
import { commitMatch } from "@/lib/playerStats";
import { saveMatch, type InningsCard } from "@/lib/matchHistory";
import { recordLeagueResult } from "@/lib/leagues";
import { publishLive } from "@/lib/liveShare";

type State = {
  runs: number;
  wickets: number;
  legalBalls: number;
  batters: [Batter, Batter];
  strikerIdx: 0 | 1;
  bowler: Bowler;
  thisOver: string[];
  log: string[];
  retired: Batter[];
  bowlerHistory: Bowler[];
};

const uid = () => Math.random().toString(36).slice(2, 9);
const mkBatter = (name: string): Batter => ({
  name,
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
  out: false,
});

const allBatters = (s: State): Batter[] => [...s.retired, ...s.batters];
const allBowlers = (s: State): Bowler[] => {
  const map = new Map<string, Bowler>();
  for (const bw of [...s.bowlerHistory, s.bowler]) {
    const ex = map.get(bw.name);
    if (ex) {
      ex.balls += bw.balls;
      ex.runs += bw.runs;
      ex.wickets += bw.wickets;
    } else map.set(bw.name, { ...bw });
  }
  return [...map.values()];
};

export function Scoreboard({
  config,
  onReset,
}: {
  config: MatchConfig;
  onReset: () => void;
}) {
  const totalBalls = config.overs * 6;
  const playersPerTeam = config.playersPerTeam ?? 11;
  const battingFirst = config.battingFirst ?? config.teamA;
  const bowlingFirst =
    battingFirst === config.teamA ? config.teamB : config.teamA;

  const makeInit = (striker: string, nonStriker: string, bowler: string): State => ({
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    batters: [mkBatter(striker), mkBatter(nonStriker)],
    strikerIdx: 0,
    bowler: { name: bowler, balls: 0, runs: 0, wickets: 0 },
    thisOver: [],
    log: [],
    retired: [],
    bowlerHistory: [],
  });

  const [shareId] = useState(uid);
  const [inningsNo, setInningsNo] = useState<1 | 2>(1);
  const [target, setTarget] = useState<number | null>(null);
  const [firstInnings, setFirstInnings] = useState<InningsCard | null>(null);
  const [history, setHistory] = useState<State[]>([
    makeInit(config.striker, config.nonStriker, config.bowler),
  ]);
  const state = history[history.length - 1];

  const [pendingBatter, setPendingBatter] = useState(false);
  const [pendingBowler, setPendingBowler] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // second innings setup modal
  const [pendingSecond, setPendingSecond] = useState(false);
  const [s2Striker, setS2Striker] = useState("Opener 1");
  const [s2NonStriker, setS2NonStriker] = useState("Opener 2");
  const [s2Bowler, setS2Bowler] = useState("Bowler 1");

  // result / save
  const [mom, setMom] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  const battingTeam = inningsNo === 1 ? battingFirst : bowlingFirst;
  const bowlingTeam = inningsNo === 1 ? bowlingFirst : battingFirst;
  const ballsLeft = totalBalls - state.legalBalls;
  const allOut = state.wickets >= playersPerTeam - 1;
  const chaseDone =
    inningsNo === 2 && target != null && state.runs >= target;
  const inningsDone = state.legalBalls >= totalBalls || allOut || chaseDone;
  const matchOver = inningsNo === 2 && inningsDone;

  const clone = (s: State): State => ({
    ...s,
    batters: [{ ...s.batters[0] }, { ...s.batters[1] }],
    bowler: { ...s.bowler },
    thisOver: [...s.thisOver],
    log: [...s.log],
    retired: [...s.retired],
    bowlerHistory: [...s.bowlerHistory],
  });

  const push = (next: State) => setHistory((h) => [...h, next]);
  const swapStrike = (s: State) => {
    s.strikerIdx = (s.strikerIdx === 0 ? 1 : 0) as 0 | 1;
  };
  const endOverCheck = (s: State) => {
    if (s.legalBalls > 0 && s.legalBalls % 6 === 0 && s.legalBalls < totalBalls) {
      swapStrike(s);
      s.thisOver = [];
      setTimeout(() => setPendingBowler(true), 0);
    }
  };

  const blocked = inningsDone || pendingBatter || pendingBowler || pendingSecond;

  const score = (runs: number) => {
    if (blocked) return;
    const s = clone(state);
    const b = s.batters[s.strikerIdx];
    b.runs += runs;
    b.balls += 1;
    if (runs === 4) b.fours += 1;
    if (runs === 6) b.sixes += 1;
    s.runs += runs;
    s.bowler.runs += runs;
    s.bowler.balls += 1;
    s.legalBalls += 1;
    s.thisOver.push(String(runs));
    s.log.unshift(`${b.name} scored ${runs}`);
    if (runs % 2 === 1) swapStrike(s);
    endOverCheck(s);
    push(s);
  };

  const extra = (kind: "wd" | "nb") => {
    if (blocked) return;
    const s = clone(state);
    s.runs += 1;
    s.bowler.runs += 1;
    s.thisOver.push(kind);
    s.log.unshift(`${kind === "wd" ? "Wide" : "No ball"} +1`);
    push(s);
  };

  const wicket = () => {
    if (blocked) return;
    const s = clone(state);
    const b = s.batters[s.strikerIdx];
    b.balls += 1;
    b.out = true;
    s.wickets += 1;
    s.bowler.balls += 1;
    s.bowler.wickets += 1;
    s.legalBalls += 1;
    s.thisOver.push("W");
    s.log.unshift(`${b.name} OUT`);
    push(s);
    if (s.wickets < playersPerTeam - 1 && s.legalBalls < totalBalls) {
      setNameInput("");
      setPendingBatter(true);
    }
  };

  const confirmBatter = () => {
    const name = nameInput.trim() || "New Batter";
    const s = clone(state);
    s.retired.push({ ...s.batters[s.strikerIdx] });
    s.batters[s.strikerIdx] = mkBatter(name);
    push(s);
    setPendingBatter(false);
    if (s.legalBalls > 0 && s.legalBalls % 6 === 0 && s.legalBalls < totalBalls) {
      const s2 = clone(s);
      swapStrike(s2);
      s2.thisOver = [];
      push(s2);
      setPendingBowler(true);
    }
  };

  const confirmBowler = () => {
    const name = nameInput.trim();
    if (name) {
      const s = clone(state);
      if (s.bowler.balls > 0) s.bowlerHistory.push({ ...s.bowler });
      s.bowler = { name, balls: 0, runs: 0, wickets: 0 };
      push(s);
    }
    setPendingBowler(false);
    setNameInput("");
  };

  const undo = () => {
    if (history.length <= 1) return;
    setHistory((h) => h.slice(0, -1));
    setPendingBatter(false);
    setPendingBowler(false);
  };

  const buildCard = (): InningsCard => ({
    battingTeam,
    bowlingTeam,
    runs: state.runs,
    wickets: state.wickets,
    balls: state.legalBalls,
    batters: allBatters(state),
    bowlers: allBowlers(state),
  });

  const startSecond = () => {
    const card = buildCard();
    setFirstInnings(card);
    setTarget(card.runs + 1);
    setInningsNo(2);
    setHistory([makeInit(s2Striker, s2NonStriker, s2Bowler)]);
    setPendingSecond(false);
  };

  // result
  const result = useMemo(() => {
    if (!matchOver || !firstInnings) return "";
    const first = firstInnings.runs;
    const second = state.runs;
    if (second > first) {
      const wktsLeft = playersPerTeam - 1 - state.wickets;
      return `${battingTeam} won by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`;
    }
    if (second === first) return "Match tied";
    const margin = first - second;
    return `${bowlingTeam} won by ${margin} run${margin === 1 ? "" : "s"}`;
  }, [matchOver, firstInnings, state.runs, state.wickets, battingTeam, bowlingTeam, playersPerTeam]);

  const winner = useMemo(() => {
    if (!matchOver || !firstInnings) return "";
    if (state.runs > firstInnings.runs) return battingTeam;
    if (state.runs === firstInnings.runs) return "tie";
    return bowlingTeam;
  }, [matchOver, firstInnings, state.runs, battingTeam, bowlingTeam]);

  // default MoM = top scorer across both innings
  const allMatchPlayers = useMemo(() => {
    const names = new Set<string>();
    if (firstInnings) firstInnings.batters.forEach((b) => names.add(b.name));
    if (firstInnings) firstInnings.bowlers.forEach((b) => names.add(b.name));
    allBatters(state).forEach((b) => names.add(b.name));
    allBowlers(state).forEach((b) => names.add(b.name));
    return [...names].filter(Boolean);
  }, [firstInnings, state]);

  useEffect(() => {
    if (matchOver && !mom && allMatchPlayers.length) {
      let best = allMatchPlayers[0];
      let bestRuns = -1;
      const cards = [
        ...(firstInnings?.batters ?? []),
        ...allBatters(state),
      ];
      for (const b of cards) {
        if (b.runs > bestRuns) {
          bestRuns = b.runs;
          best = b.name;
        }
      }
      setMom(best);
    }
  }, [matchOver, mom, allMatchPlayers, firstInnings, state]);

  const saveResult = () => {
    if (!firstInnings) return;
    const second = buildCard();
    const rec = saveMatch({
      date: new Date().toISOString(),
      venue: config.venue,
      overs: config.overs,
      teamA: battingFirst,
      teamB: bowlingFirst,
      toss: config.tossWinner
        ? `${config.tossWinner} won the toss & chose to ${config.tossDecision}`
        : "",
      innings: [firstInnings, second],
      result,
      manOfTheMatch: mom,
      winner: winner === "tie" ? "" : winner,
      leagueId: config.leagueId,
      leagueMatchId: config.leagueMatchId,
    });
    // lifetime stats from both innings
    commitMatch(firstInnings.batters, firstInnings.bowlers);
    commitMatch(second.batters, second.bowlers);
    // league result
    if (config.leagueId && config.leagueMatchId) {
      const homeIsBattingFirst = true; // we map teamA(home) = battingFirst
      void homeIsBattingFirst;
      recordLeagueResult(config.leagueId, config.leagueMatchId, {
        result,
        winner: winner === "tie" ? "tie" : winner,
        homeRuns: firstInnings.runs,
        homeWkts: firstInnings.wickets,
        homeBalls: firstInnings.balls,
        awayRuns: second.runs,
        awayWkts: second.wickets,
        awayBalls: second.balls,
        matchRecordId: rec.id,
      });
    }
    setSavedId(rec.id);
  };

  // publish live snapshot
  useEffect(() => {
    publishLive(shareId, {
      teamA: battingFirst,
      teamB: bowlingFirst,
      venue: config.venue,
      overs: config.overs,
      inningsNo,
      target,
      battingTeam,
      bowlingTeam,
      runs: state.runs,
      wickets: state.wickets,
      balls: state.legalBalls,
      striker: {
        name: state.batters[state.strikerIdx].name,
        runs: state.batters[state.strikerIdx].runs,
        balls: state.batters[state.strikerIdx].balls,
      },
      nonStriker: {
        name: state.batters[state.strikerIdx === 0 ? 1 : 0].name,
        runs: state.batters[state.strikerIdx === 0 ? 1 : 0].runs,
        balls: state.batters[state.strikerIdx === 0 ? 1 : 0].balls,
      },
      bowler: {
        name: state.bowler.name,
        runs: state.bowler.runs,
        wickets: state.bowler.wickets,
        balls: state.bowler.balls,
      },
      thisOver: state.thisOver,
      log: state.log.slice(0, 10),
      result: matchOver ? result : "",
      finished: matchOver,
      updatedAt: Date.now(),
    });
  }, [state, inningsNo, target, matchOver, result, shareId, battingFirst, bowlingFirst, battingTeam, bowlingTeam, config.venue, config.overs]);

  const shareLive = async () => {
    const url = `${window.location.origin}/live/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
    setShared(true);
    setTimeout(() => setShared(false), 2500);
  };

  const striker = state.batters[state.strikerIdx];
  const nonStriker = state.batters[state.strikerIdx === 0 ? 1 : 0];
  const crr = runRate(state.runs, state.legalBalls);
  const projected = useMemo(() => {
    if (state.legalBalls === 0) return state.runs;
    return Math.round((state.runs / state.legalBalls) * totalBalls);
  }, [state.runs, state.legalBalls, totalBalls]);

  const need = target != null ? Math.max(0, target - state.runs) : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-white/[0.02] px-6 py-4">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {battingFirst} vs {bowlingFirst} • {config.venue}
              </span>
              <span className="text-xs font-medium text-primary">
                Innings {inningsNo} • Over {oversText(state.legalBalls)} /{" "}
                {config.overs}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 p-8">
              <h2 className="font-heading text-2xl font-bold tracking-tight text-muted-foreground">
                {battingTeam.toUpperCase()} BATTING
              </h2>
              <div className="font-heading text-7xl font-bold tracking-tight">
                {state.runs}/{state.wickets}
              </div>
              <div className="font-medium text-muted-foreground">
                CRR: {crr} • Proj: {projected} • Balls left:{" "}
                {Math.max(0, ballsLeft)}
              </div>
              {need != null && !matchOver && (
                <div className="mt-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary">
                  Need {need} from {Math.max(0, ballsLeft)} balls (Target {target})
                </div>
              )}
              {inningsDone && inningsNo === 1 && (
                <div className="mt-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary">
                  1st Innings Complete — {state.runs}/{state.wickets}
                </div>
              )}
            </div>

            <div className="border-t border-border bg-background/40 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                This Over
              </p>
              <div className="flex flex-wrap gap-1.5">
                {state.thisOver.length === 0 && (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
                {state.thisOver.map((l, i) => (
                  <span
                    key={i}
                    className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                      l === "W"
                        ? "bg-destructive text-destructive-foreground"
                        : l === "4" || l === "6"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                    }`}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* End of 1st innings CTA */}
          {inningsDone && inningsNo === 1 && (
            <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
              <p className="font-heading text-xl font-bold">
                {battingTeam} scored {state.runs}/{state.wickets}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {bowlingTeam} need {state.runs + 1} to win.
              </p>
              <button
                onClick={() => setPendingSecond(true)}
                className="mt-4 rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground hover:bg-primary-hover"
              >
                Start 2nd Innings →
              </button>
            </section>
          )}

          {/* Match result + MoM */}
          {matchOver && (
            <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Result
              </p>
              <p className="mt-1 font-heading text-2xl font-bold">{result}</p>
              {savedId ? (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-primary">
                    ✓ Saved. Man of the Match: <strong>{mom}</strong>
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link
                      to="/matches/$id"
                      params={{ id: savedId }}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
                    >
                      View Full Scorecard
                    </Link>
                    <button
                      onClick={onReset}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-primary"
                    >
                      New Match
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mx-auto mt-4 max-w-sm space-y-3">
                  <label className="block text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Man of the Match
                  </label>
                  <select
                    value={mom}
                    onChange={(e) => setMom(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {allMatchPlayers.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={saveResult}
                    className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground hover:bg-primary-hover"
                  >
                    Save Match &amp; Stats
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Controls */}
          {!matchOver && !(inningsDone && inningsNo === 1) && (
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((r) => (
                  <button key={r} onClick={() => score(r)} className={btnBase}>
                    {r}
                  </button>
                ))}
                <button
                  onClick={() => score(4)}
                  className={`${btnBase} border-b-2 border-muted-foreground`}
                >
                  4
                </button>
                <button
                  onClick={() => score(6)}
                  className={`${btnBase} border-b-2 border-primary text-primary`}
                >
                  6
                </button>
                <button
                  onClick={wicket}
                  className="aspect-square rounded-lg border border-destructive/30 bg-destructive/10 text-base font-bold text-destructive transition-transform hover:bg-destructive/20 active:scale-95"
                >
                  WICKET
                </button>
                <button onClick={() => extra("wd")} className={btnAlt}>
                  WIDE
                </button>
                <button onClick={() => extra("nb")} className={btnAlt}>
                  NO BALL
                </button>
                <button
                  onClick={undo}
                  className="aspect-square rounded-lg bg-primary/10 font-bold text-primary underline underline-offset-4 transition-transform hover:bg-primary/20 active:scale-95"
                >
                  UNDO
                </button>
                <button
                  onClick={shareLive}
                  className="aspect-auto rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5"
                >
                  {shared ? "✓ Link copied" : "Share Live"}
                </button>
                <button
                  onClick={onReset}
                  className="aspect-auto rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5"
                >
                  New Match
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Match auto-saves to scorecards, player &amp; team stats when the
                2nd innings ends. "Share Live" copies a public live link.
              </p>
            </section>
          )}
        </div>

        {/* RIGHT — stats */}
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border bg-white/[0.02] px-4 py-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Batters
              </h3>
            </div>
            <div className="divide-y divide-border">
              {[striker, nonStriker].map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className={`font-medium ${i === 0 ? "text-primary" : ""}`}>
                      {b.name}
                      {i === 0 && "*"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.runs} ({b.balls}) • {b.fours}×4 {b.sixes}×6
                    </p>
                  </div>
                  <p className="font-mono text-sm text-muted-foreground">
                    SR {strikeRate(b.runs, b.balls)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border bg-white/[0.02] px-4 py-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Bowler
              </h3>
            </div>
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{state.bowler.name}</p>
                <p className="font-mono text-muted-foreground">
                  {state.bowler.wickets}/{state.bowler.runs} (
                  {oversText(state.bowler.balls)})
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Econ {economy(state.bowler.runs, state.bowler.balls)}
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border bg-white/[0.02] px-4 py-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Commentary
              </h3>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto px-4 py-3 text-sm text-muted-foreground">
              {state.log.length === 0 && <p>Match yet to begin…</p>}
              {state.log.slice(0, 12).map((l, i) => (
                <p key={i}>• {l}</p>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* New batter / bowler modal */}
      {(pendingBatter || pendingBowler) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="mb-1 font-heading text-xl font-bold">
              {pendingBatter ? "New Batter" : "New Bowler"}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {pendingBatter
                ? "Enter the incoming batter's name."
                : "Over complete — who bowls next?"}
            </p>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (pendingBatter ? confirmBatter() : confirmBowler())
              }
              placeholder="Player name"
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={pendingBatter ? confirmBatter : confirmBowler}
              className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* 2nd innings setup modal */}
      {pendingSecond && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="mb-1 font-heading text-xl font-bold">2nd Innings</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {bowlingFirst} chasing {(firstInnings?.runs ?? state.runs) + 1}.
              Enter openers &amp; bowler.
            </p>
            <div className="space-y-3">
              <input
                value={s2Striker}
                onChange={(e) => setS2Striker(e.target.value)}
                placeholder="Striker"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                value={s2NonStriker}
                onChange={(e) => setS2NonStriker(e.target.value)}
                placeholder="Non-striker"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                value={s2Bowler}
                onChange={(e) => setS2Bowler(e.target.value)}
                placeholder="Opening bowler"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={startSecond}
              className="mt-4 w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground hover:bg-primary-hover"
            >
              Start Chase
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

const btnBase =
  "aspect-square rounded-lg bg-secondary text-2xl font-heading font-bold transition-transform hover:bg-secondary/70 active:scale-95";
const btnAlt =
  "aspect-square rounded-lg bg-secondary text-base font-medium transition-transform hover:bg-secondary/70 active:scale-95";
