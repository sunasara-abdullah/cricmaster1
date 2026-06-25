import { useMemo, useState } from "react";
import {
  type Batter,
  type Bowler,
  type MatchConfig,
  economy,
  oversText,
  runRate,
  strikeRate,
} from "@/lib/cricket";

type State = {
  runs: number;
  wickets: number;
  legalBalls: number;
  batters: [Batter, Batter];
  strikerIdx: 0 | 1;
  bowler: Bowler;
  thisOver: string[];
  log: string[];
};

const mkBatter = (name: string): Batter => ({
  name,
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
  out: false,
});

export function Scoreboard({ config, onReset }: { config: MatchConfig; onReset: () => void }) {
  const init: State = {
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    batters: [mkBatter(config.striker), mkBatter(config.nonStriker)],
    strikerIdx: 0,
    bowler: { name: config.bowler, balls: 0, runs: 0, wickets: 0 },
    thisOver: [],
    log: [],
  };

  const [history, setHistory] = useState<State[]>([init]);
  const state = history[history.length - 1];
  const [pendingBatter, setPendingBatter] = useState(false);
  const [pendingBowler, setPendingBowler] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const totalBalls = config.overs * 6;
  const ballsLeft = totalBalls - state.legalBalls;

  const clone = (s: State): State => ({
    ...s,
    batters: [{ ...s.batters[0] }, { ...s.batters[1] }],
    bowler: { ...s.bowler },
    thisOver: [...s.thisOver],
    log: [...s.log],
  });

  const push = (next: State) => setHistory((h) => [...h, next]);

  const matchOver =
    state.legalBalls >= totalBalls || state.wickets >= state.batters.length + 99; // wickets handled separately

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

  const score = (runs: number) => {
    if (matchOver || pendingBatter) return;
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
    const label = String(runs);
    s.thisOver.push(label);
    s.log.unshift(`${b.name} scored ${runs}`);
    if (runs % 2 === 1) swapStrike(s);
    endOverCheck(s);
    push(s);
  };

  const extra = (kind: "wd" | "nb") => {
    if (matchOver || pendingBatter) return;
    const s = clone(state);
    s.runs += 1;
    s.bowler.runs += 1;
    s.thisOver.push(kind);
    s.log.unshift(`${kind === "wd" ? "Wide" : "No ball"} +1`);
    push(s);
  };

  const wicket = () => {
    if (matchOver || pendingBatter) return;
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
    setNameInput("");
    setPendingBatter(true);
  };

  const confirmBatter = () => {
    const name = nameInput.trim() || "New Batter";
    const s = clone(state);
    s.batters[s.strikerIdx] = mkBatter(name);
    push(s);
    setPendingBatter(false);
    // over may have ended on the wicket ball
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

  const striker = state.batters[state.strikerIdx];
  const nonStriker = state.batters[state.strikerIdx === 0 ? 1 : 0];
  const crr = runRate(state.runs, state.legalBalls);

  const projected = useMemo(() => {
    if (state.legalBalls === 0) return state.runs;
    return Math.round((state.runs / state.legalBalls) * totalBalls);
  }, [state.runs, state.legalBalls, totalBalls]);

  const isInningsDone = state.legalBalls >= totalBalls;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT — score + controls */}
        <div className="space-y-6 lg:col-span-2">
          {/* Score block */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-white/[0.02] px-6 py-4">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {config.teamA} vs {config.teamB} • {config.venue}
              </span>
              <span className="text-xs font-medium text-primary">
                Over {oversText(state.legalBalls)} / {config.overs}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 p-8">
              <h2 className="font-heading text-2xl font-bold tracking-tight text-muted-foreground">
                {config.teamA.toUpperCase()} BATTING
              </h2>
              <div className="font-heading text-7xl font-bold tracking-tight">
                {state.runs}/{state.wickets}
              </div>
              <div className="font-medium text-muted-foreground">
                CRR: {crr} • Proj: {projected} • Balls left: {Math.max(0, ballsLeft)}
              </div>
              {isInningsDone && (
                <div className="mt-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary">
                  Innings Complete
                </div>
              )}
            </div>

            {/* this over */}
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

          {/* Controls */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((r) => (
                <button key={r} onClick={() => score(r)} className={btnBase}>
                  {r}
                </button>
              ))}
              <button onClick={() => score(4)} className={`${btnBase} border-b-2 border-muted-foreground`}>
                4
              </button>
              <button onClick={() => score(6)} className={`${btnBase} border-b-2 border-primary text-primary`}>
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
                onClick={onReset}
                className="col-span-2 aspect-auto rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5"
              >
                New Match
              </button>
            </div>
          </section>
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
                <div key={i} className="flex items-center justify-between px-4 py-3">
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
                  {state.bowler.wickets}/{state.bowler.runs} ({oversText(state.bowler.balls)})
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

      {/* Modals */}
      {(pendingBatter || pendingBowler) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="mb-1 font-heading text-xl font-bold">
              {pendingBatter ? "New Batter" : "New Bowler"}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {pendingBatter ? "Enter the incoming batter's name." : "Over complete — who bowls next?"}
            </p>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (pendingBatter ? confirmBatter() : confirmBowler())}
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
    </main>
  );
}

const btnBase =
  "aspect-square rounded-lg bg-secondary text-2xl font-heading font-bold transition-transform hover:bg-secondary/70 active:scale-95";
const btnAlt =
  "aspect-square rounded-lg bg-secondary text-base font-medium transition-transform hover:bg-secondary/70 active:scale-95";