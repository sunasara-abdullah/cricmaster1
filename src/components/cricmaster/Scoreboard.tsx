import { useCallback, useEffect, useMemo, useState } from "react";
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
import { saveCareerMatch } from "@/lib/career";
import { recordLeagueResult } from "@/lib/leagues";
import { publishLive } from "@/lib/liveShare";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Extras = { wd: number; nb: number; b: number; lb: number };
type OverSummary = { n: number; runs: number; wickets: number; balls: string[] };

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
  extras: Extras;
  freeHit: boolean;
  partRuns: number;
  partBalls: number;
  overs: OverSummary[];
  overStartRuns: number;
  overStartWkts: number;
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

const WICKET_TYPES = [
  "Bowled",
  "Caught",
  "LBW",
  "Stumped",
  "Hit wicket",
  "Run out",
  "Retired",
] as const;
type WicketType = (typeof WICKET_TYPES)[number];
const BOWLER_CREDITED: WicketType[] = [
  "Bowled",
  "Caught",
  "LBW",
  "Stumped",
  "Hit wicket",
];

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
  const lineupOf = (team: string) =>
    (team === config.teamA ? config.lineupA : config.lineupB) ?? [];

  const makeInit = (
    striker: string,
    nonStriker: string,
    bowler: string,
  ): State => ({
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
    extras: { wd: 0, nb: 0, b: 0, lb: 0 },
    freeHit: false,
    partRuns: 0,
    partBalls: 0,
    overs: [],
    overStartRuns: 0,
    overStartWkts: 0,
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

  // extras + wicket dialogs
  const [extraKind, setExtraKind] = useState<"wd" | "nb" | "b" | "lb" | null>(
    null,
  );
  const [wicketOpen, setWicketOpen] = useState(false);
  const [wType, setWType] = useState<WicketType>("Bowled");
  const [fielder, setFielder] = useState("");
  const [runOutEnd, setRunOutEnd] = useState<"striker" | "nonStriker">("striker");

  // second innings setup modal
  const [pendingSecond, setPendingSecond] = useState(false);
  const [s2Striker, setS2Striker] = useState("");
  const [s2NonStriker, setS2NonStriker] = useState("");
  const [s2Bowler, setS2Bowler] = useState("");

  // result / save
  const [mom, setMom] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  const battingTeam = inningsNo === 1 ? battingFirst : bowlingFirst;
  const bowlingTeam = inningsNo === 1 ? bowlingFirst : battingFirst;
  const ballsLeft = totalBalls - state.legalBalls;
  const allOut = state.wickets >= playersPerTeam - 1;
  const chaseDone = inningsNo === 2 && target != null && state.runs >= target;
  const inningsDone = state.legalBalls >= totalBalls || allOut || chaseDone;
  const matchOver = inningsNo === 2 && inningsDone;

  const battingLineup = lineupOf(battingTeam);
  const bowlingLineup = lineupOf(bowlingTeam);
  const usedBatters = new Set(allBatters(state).map((b) => b.name));
  const availableBatters = battingLineup.filter((n) => !usedBatters.has(n));

  const clone = (s: State): State => ({
    ...s,
    batters: [{ ...s.batters[0] }, { ...s.batters[1] }],
    bowler: { ...s.bowler },
    thisOver: [...s.thisOver],
    log: [...s.log],
    retired: [...s.retired],
    bowlerHistory: [...s.bowlerHistory],
    extras: { ...s.extras },
    overs: s.overs.map((o) => ({ ...o, balls: [...o.balls] })),
  });

  const push = (next: State) => setHistory((h) => [...h, next]);
  const swapStrike = (s: State) => {
    s.strikerIdx = (s.strikerIdx === 0 ? 1 : 0) as 0 | 1;
  };
  const endOverCheck = (s: State) => {
    if (s.legalBalls > 0 && s.legalBalls % 6 === 0) {
      s.overs = [
        ...s.overs,
        {
          n: s.legalBalls / 6,
          runs: s.runs - s.overStartRuns,
          wickets: s.wickets - s.overStartWkts,
          balls: [...s.thisOver],
        },
      ];
      s.overStartRuns = s.runs;
      s.overStartWkts = s.wickets;
      if (s.legalBalls < totalBalls) {
        swapStrike(s);
        s.thisOver = [];
        setTimeout(() => setPendingBowler(true), 0);
      }
    }
  };

  const blocked =
    inningsDone ||
    pendingBatter ||
    pendingBowler ||
    pendingSecond ||
    wicketOpen ||
    extraKind !== null;

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
    s.partRuns += runs;
    s.partBalls += 1;
    s.freeHit = false;
    s.thisOver.push(String(runs));
    s.log.unshift(`${oversText(s.legalBalls)} ${b.name} — ${runs} run${runs === 1 ? "" : "s"}`);
    if (runs % 2 === 1) swapStrike(s);
    endOverCheck(s);
    push(s);
  };

  const applyExtra = (kind: "wd" | "nb" | "b" | "lb", n: number) => {
    const s = clone(state);
    const b = s.batters[s.strikerIdx];
    if (kind === "wd") {
      const total = 1 + n;
      s.runs += total;
      s.bowler.runs += total;
      s.extras.wd += total;
      s.partRuns += total;
      s.thisOver.push(n ? `wd+${n}` : "wd");
      s.log.unshift(`Wide${n ? ` + ${n}` : ""} — ${total} run${total === 1 ? "" : "s"}`);
      if (n % 2 === 1) swapStrike(s);
    } else if (kind === "nb") {
      s.runs += 1 + n;
      s.bowler.runs += 1 + n;
      s.extras.nb += 1;
      b.runs += n;
      if (n === 4) b.fours += 1;
      if (n === 6) b.sixes += 1;
      s.partRuns += 1 + n;
      s.freeHit = true;
      s.thisOver.push(n ? `nb+${n}` : "nb");
      s.log.unshift(`No ball${n ? ` + ${n}` : ""} — free hit next`);
      if (n % 2 === 1) swapStrike(s);
    } else {
      // byes / leg byes — legal delivery, bowler not charged
      s.runs += n;
      s.bowler.balls += 1;
      b.balls += 1;
      s.legalBalls += 1;
      s.partRuns += n;
      s.partBalls += 1;
      s.freeHit = false;
      if (kind === "b") s.extras.b += n;
      else s.extras.lb += n;
      s.thisOver.push(`${kind}${n}`);
      s.log.unshift(`${kind === "b" ? "Bye" : "Leg bye"} — ${n}`);
      if (n % 2 === 1) swapStrike(s);
      endOverCheck(s);
    }
    setExtraKind(null);
    push(s);
  };

  const confirmWicket = () => {
    const s = clone(state);
    const outIdx =
      wType === "Run out" && runOutEnd === "nonStriker"
        ? ((s.strikerIdx === 0 ? 1 : 0) as 0 | 1)
        : s.strikerIdx;
    const b = s.batters[outIdx];
    const isRunOut = wType === "Run out";
    const retired = wType === "Retired";

    if (!retired) {
      b.out = true;
      b.how = isRunOut
        ? `run out${fielder.trim() ? ` (${fielder.trim()})` : ""}`
        : wType === "Caught"
          ? `c ${fielder.trim() || "fielder"} b ${s.bowler.name}`
          : wType === "Stumped"
            ? `st ${fielder.trim() || "wk"} b ${s.bowler.name}`
            : `${wType.toLowerCase()} b ${s.bowler.name}`;
      s.wickets += 1;
    } else {
      b.how = "retired";
    }

    if (!retired) {
      // every dismissal except retired is off a delivery
      s.batters[s.strikerIdx].balls += 1;
      s.bowler.balls += 1;
      s.legalBalls += 1;
      s.partBalls += 1;
      if (BOWLER_CREDITED.includes(wType)) s.bowler.wickets += 1;
      s.thisOver.push("W");
    }
    s.freeHit = false;
    s.partRuns = 0;
    s.partBalls = 0;
    s.log.unshift(
      retired ? `${b.name} retired` : `${b.name} OUT — ${b.how ?? wType}`,
    );

    // the dismissed batter must be replaced at their slot
    s.retired.push({ ...b });
    s.batters[outIdx] = mkBatter("");
    if (!retired) endOverCheck(s);
    push(s);

    setWicketOpen(false);
    setFielder("");
    if (s.wickets < playersPerTeam - 1 && s.legalBalls < totalBalls) {
      setNameInput(availableBatters[0] ?? "");
      setPendingBatter(true);
    }
  };

  const confirmBatter = () => {
    const name = nameInput.trim() || "New Batter";
    const s = clone(state);
    const slot = s.batters[0].name === "" ? 0 : s.batters[1].name === "" ? 1 : s.strikerIdx;
    s.batters[slot] = mkBatter(name);
    push(s);
    setPendingBatter(false);
    setNameInput("");
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

  const undo = useCallback(() => {
    setHistory((h) => (h.length <= 1 ? h : h.slice(0, -1)));
    setPendingBatter(false);
    setPendingBowler(false);
    setWicketOpen(false);
    setExtraKind(null);
  }, []);

  const buildCard = (): InningsCard => ({
    battingTeam,
    bowlingTeam,
    runs: state.runs,
    wickets: state.wickets,
    balls: state.legalBalls,
    batters: allBatters(state).filter((b) => b.name),
    bowlers: allBowlers(state),
    extras: { ...state.extras },
  });

  const startSecond = () => {
    const card = buildCard();
    setFirstInnings(card);
    setTarget(card.runs + 1);
    setInningsNo(2);
    setHistory([
      makeInit(
        s2Striker.trim() || "Opener 1",
        s2NonStriker.trim() || "Opener 2",
        s2Bowler.trim() || "Bowler 1",
      ),
    ]);
    setPendingSecond(false);
  };

  // keyboard shortcuts for fast scoring
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return;
      if (blocked && e.key !== "u") return;
      if (/^[0-7]$/.test(e.key)) score(Number(e.key));
      else if (e.key === "w" || e.key === "W") setWicketOpen(true);
      else if (e.key === "u" || e.key === "U") undo();
      else if (e.key === "d" || e.key === "D") setExtraKind("wd");
      else if (e.key === "n" || e.key === "N") setExtraKind("nb");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
      const cards = [...(firstInnings?.batters ?? []), ...allBatters(state)];
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
    let rec;
    try {
      rec = saveMatch({
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
    } catch (err) {
      toast.error("Match save nahi hua. Dobara try karein.");
      console.error(err);
      return;
    }
    commitMatch(firstInnings.batters, firstInnings.bowlers);
    commitMatch(second.batters, second.bowlers);
    if (config.leagueId && config.leagueMatchId) {
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
    void saveCareerMatch(rec);
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        toast.success("Match saved & synced to your cloud career.");
      } else {
        toast.success("Match saved locally.", {
          description: "Sign in to sync your career across devices.",
        });
      }
    });
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
  const rrr =
    need != null && ballsLeft > 0 ? ((need / ballsLeft) * 6).toFixed(2) : null;
  const extrasTotal =
    state.extras.wd + state.extras.nb + state.extras.b + state.extras.lb;

  return (
    <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-white/[0.02] px-4 py-3 sm:px-6 sm:py-4">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:text-xs">
                {battingFirst} vs {bowlingFirst} • {config.venue}
              </span>
              <span className="text-[10px] font-medium text-primary sm:text-xs">
                Innings {inningsNo} • Over {oversText(state.legalBalls)} /{" "}
                {config.overs}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 p-6 sm:p-8">
              <h2 className="font-heading text-xl font-bold tracking-tight text-muted-foreground sm:text-2xl">
                {battingTeam.toUpperCase()} BATTING
              </h2>
              <div className="font-heading text-5xl font-bold tracking-tight sm:text-7xl">
                {state.runs}/{state.wickets}
              </div>
              <div className="text-center text-sm font-medium text-muted-foreground sm:text-base">
                CRR: {crr} • Proj: {projected} • Balls left:{" "}
                {Math.max(0, ballsLeft)}
              </div>
              <div className="text-center text-xs text-muted-foreground">
                Extras {extrasTotal} • Partnership {state.partRuns} (
                {state.partBalls})
              </div>
              {state.freeHit && (
                <div className="mt-1 rounded-full bg-destructive/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-destructive">
                  Free hit
                </div>
              )}
              {need != null && !matchOver && (
                <div className="mt-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary">
                  Need {need} from {Math.max(0, ballsLeft)} balls
                  {rrr ? ` • RRR ${rrr}` : ""}
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
                    className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold ${
                      l === "W"
                        ? "bg-destructive text-destructive-foreground"
                        : l === "4" || l === "6" || l === "7"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                    }`}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {state.overs.length > 0 && (
              <div className="border-t border-border p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Over by over
                </p>
                <div className="flex flex-wrap gap-2">
                  {state.overs.map((o) => (
                    <span
                      key={o.n}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] font-mono text-muted-foreground"
                    >
                      Ov {o.n}: <span className="text-foreground">{o.runs}</span>
                      {o.wickets > 0 && (
                        <span className="text-destructive">/{o.wickets}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
            <section className="rounded-2xl border border-border bg-card p-3 sm:p-6">
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
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
                  onClick={() => score(5)}
                  className={`${btnBase} border-b-2 border-muted-foreground/60`}
                >
                  5
                </button>
                <button
                  onClick={() => score(6)}
                  className={`${btnBase} border-b-2 border-primary text-primary`}
                >
                  6
                </button>
                <button
                  onClick={() => score(7)}
                  className={`${btnBase} border-b-2 border-primary/60`}
                >
                  7
                </button>
                <button
                  onClick={() => setWicketOpen(true)}
                  className="aspect-square rounded-lg border border-destructive/30 bg-destructive/10 text-xs font-bold text-destructive transition-transform hover:bg-destructive/20 active:scale-95 sm:text-base"
                >
                  WICKET
                </button>
                <button onClick={() => setExtraKind("wd")} className={btnAlt}>
                  WIDE
                </button>
                <button onClick={() => setExtraKind("nb")} className={btnAlt}>
                  NO BALL
                </button>
                <button
                  onClick={undo}
                  className="aspect-square rounded-lg bg-primary/10 font-bold text-primary underline underline-offset-4 transition-transform hover:bg-primary/20 active:scale-95"
                >
                  UNDO
                </button>
                <button onClick={() => setExtraKind("b")} className={btnAlt}>
                  BYE
                </button>
                <button onClick={() => setExtraKind("lb")} className={btnAlt}>
                  LEG BYE
                </button>
                <button
                  onClick={() => {
                    setNameInput(state.bowler.name);
                    setPendingBowler(true);
                  }}
                  className={btnAlt}
                >
                  CHANGE BOWLER
                </button>
                <button
                  onClick={() => {
                    const s = clone(state);
                    swapStrike(s);
                    push(s);
                  }}
                  className={btnAlt}
                >
                  SWAP STRIKE
                </button>
                <button
                  onClick={shareLive}
                  className="col-span-2 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 sm:col-span-1 sm:text-sm"
                >
                  {shared ? "✓ Link copied" : "Share Live"}
                </button>
                <button
                  onClick={onReset}
                  className="col-span-2 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 sm:col-span-1 sm:text-sm"
                >
                  New Match
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Shortcuts: 0–7 runs • W wicket • D wide • N no-ball • U undo.
                Match auto-saves to scorecards, player &amp; team stats when the
                2nd innings ends.
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
                      {b.name || "—"}
                      {i === 0 && b.name && "*"}
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
                Extras
              </h3>
            </div>
            <div className="grid grid-cols-4 divide-x divide-border text-center">
              {(
                [
                  ["WD", state.extras.wd],
                  ["NB", state.extras.nb],
                  ["B", state.extras.b],
                  ["LB", state.extras.lb],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="px-2 py-3">
                  <p className="font-mono text-lg font-bold">{v}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">
                    {k}
                  </p>
                </div>
              ))}
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

      {/* Extras dialog */}
      {extraKind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="mb-1 font-heading text-xl font-bold">
              {extraKind === "wd"
                ? "Wide"
                : extraKind === "nb"
                  ? "No Ball"
                  : extraKind === "b"
                    ? "Byes"
                    : "Leg Byes"}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {extraKind === "wd" || extraKind === "nb"
                ? "Extra runs taken off this delivery?"
                : "How many runs were run?"}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(extraKind === "b" || extraKind === "lb"
                ? [1, 2, 3, 4]
                : [0, 1, 2, 3, 4, 6]
              ).map((n) => (
                <button
                  key={n}
                  onClick={() => applyExtra(extraKind, n)}
                  className="rounded-lg bg-secondary py-3 font-heading text-lg font-bold hover:bg-secondary/70"
                >
                  {extraKind === "b" || extraKind === "lb" ? n : `+${n}`}
                </button>
              ))}
            </div>
            <button
              onClick={() => setExtraKind(null)}
              className="mt-4 w-full rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Wicket dialog */}
      {wicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="mb-1 font-heading text-xl font-bold">Wicket</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {state.freeHit
                ? "Free hit — only a run out is allowed."
                : "How was the batter dismissed?"}
            </p>
            <div className="space-y-3">
              <select
                value={wType}
                onChange={(e) => setWType(e.target.value as WicketType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {WICKET_TYPES.filter(
                  (t) => !state.freeHit || t === "Run out" || t === "Retired",
                ).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {(wType === "Caught" ||
                wType === "Stumped" ||
                wType === "Run out") && (
                <input
                  value={fielder}
                  onChange={(e) => setFielder(e.target.value)}
                  placeholder="Fielder / keeper name (optional)"
                  list="cm-fielders"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              )}
              <datalist id="cm-fielders">
                {bowlingLineup.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {wType === "Run out" && (
                <select
                  value={runOutEnd}
                  onChange={(e) =>
                    setRunOutEnd(e.target.value as "striker" | "nonStriker")
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="striker">{striker.name} (striker)</option>
                  <option value="nonStriker">
                    {nonStriker.name} (non-striker)
                  </option>
                </select>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setWicketOpen(false)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm text-muted-foreground hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={confirmWicket}
                className="flex-1 rounded-lg bg-destructive py-2.5 text-sm font-bold text-destructive-foreground hover:opacity-90"
              >
                Confirm Wicket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New batter / bowler modal */}
      {(pendingBatter || pendingBowler) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="mb-1 font-heading text-xl font-bold">
              {pendingBatter ? "New Batter" : "New Bowler"}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {pendingBatter
                ? "Pick the incoming batter from the squad or type a name."
                : "Who bowls next?"}
            </p>
            {(pendingBatter ? availableBatters : bowlingLineup).length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {(pendingBatter ? availableBatters : bowlingLineup).map((n) => (
                  <button
                    key={n}
                    onClick={() => setNameInput(n)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      nameInput === n
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
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
              Choose openers &amp; bowler.
            </p>
            <div className="space-y-3">
              <input
                value={s2Striker}
                onChange={(e) => setS2Striker(e.target.value)}
                list="cm-s2-bat"
                placeholder="Striker"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                value={s2NonStriker}
                onChange={(e) => setS2NonStriker(e.target.value)}
                list="cm-s2-bat"
                placeholder="Non-striker"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                value={s2Bowler}
                onChange={(e) => setS2Bowler(e.target.value)}
                list="cm-s2-bowl"
                placeholder="Opening bowler"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <datalist id="cm-s2-bat">
                {lineupOf(bowlingFirst).map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <datalist id="cm-s2-bowl">
                {lineupOf(battingFirst).map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
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
  "aspect-square rounded-lg bg-secondary text-xl sm:text-2xl font-heading font-bold transition-transform hover:bg-secondary/70 active:scale-95";
const btnAlt =
  "aspect-square rounded-lg bg-secondary text-[10px] sm:text-sm font-medium leading-tight transition-transform hover:bg-secondary/70 active:scale-95";