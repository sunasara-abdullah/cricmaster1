const KEY = "cricmaster:leagues:v1";

export type MatchStatus = "scheduled" | "completed";

export type MatchStage = "group" | "qualifier" | "semi" | "final";

export type ScheduledMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string; // ISO date (yyyy-mm-dd)
  venue: string;
  status: MatchStatus;
  result: string;
  stage?: MatchStage;
  homeRuns?: number;
  homeWkts?: number;
  homeBalls?: number;
  awayRuns?: number;
  awayWkts?: number;
  awayBalls?: number;
  winner?: string; // team name, or "tie"
  matchRecordId?: string;
};

export type League = {
  id: string;
  name: string;
  season: string;
  teams: string[];
  matches: ScheduledMatch[];
  createdAt: string;
  pointsRules?: PointsRules;
};

export type LeagueStore = Record<string, League>;

export type PointsRules = {
  /** points for a win */
  win: number;
  /** points for a tie / no result */
  draw: number;
  /** points for a loss */
  loss: number;
  /** enable an extra bonus point for dominant wins */
  bonusEnabled: boolean;
  /** winner gets a bonus point if its run rate >= this factor × opponent's run rate */
  bonusRunRateFactor: number;
};

export const DEFAULT_POINTS_RULES: PointsRules = {
  win: 2,
  draw: 1,
  loss: 0,
  bonusEnabled: false,
  bonusRunRateFactor: 1.25,
};

export const getPointsRules = (league: League): PointsRules => ({
  ...DEFAULT_POINTS_RULES,
  ...(league.pointsRules ?? {}),
});

export type PointsPreset = {
  id: string;
  name: string;
  description: string;
  rules: PointsRules;
};

export const POINTS_PRESETS: PointsPreset[] = [
  {
    id: "t20",
    name: "T20 League",
    description: "Win 2 · Tie 1 · Loss 0",
    rules: { win: 2, draw: 1, loss: 0, bonusEnabled: false, bonusRunRateFactor: 1.25 },
  },
  {
    id: "odi",
    name: "ODI League",
    description: "Win 2 · Tie/NR 1 · Loss 0",
    rules: { win: 2, draw: 1, loss: 0, bonusEnabled: false, bonusRunRateFactor: 1.25 },
  },
  {
    id: "ipl",
    name: "IPL Style",
    description: "Win 2 · Tie 1 · Loss 0 (Super Over)",
    rules: { win: 2, draw: 1, loss: 0, bonusEnabled: false, bonusRunRateFactor: 1.25 },
  },
  {
    id: "bbl-bonus",
    name: "Bonus Point League",
    description: "Win 2 · Tie 1 · Loss 0 · +1 dominant win",
    rules: { win: 2, draw: 1, loss: 0, bonusEnabled: true, bonusRunRateFactor: 1.25 },
  },
  {
    id: "wc-super",
    name: "World Cup Super Six",
    description: "Win 4 · Tie/NR 2 · Loss 0",
    rules: { win: 4, draw: 2, loss: 0, bonusEnabled: false, bonusRunRateFactor: 1.25 },
  },
  {
    id: "test",
    name: "Test Championship",
    description: "Win 12 · Draw 4 · Loss 0",
    rules: { win: 12, draw: 4, loss: 0, bonusEnabled: false, bonusRunRateFactor: 1.25 },
  },
];

const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const loadLeagues = (): LeagueStore => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LeagueStore) : {};
  } catch {
    return {};
  }
};

const save = (store: LeagueStore) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("cricmaster:leagues-updated"));
};

export const getLeague = (id: string): League | undefined => loadLeagues()[id];

export const createLeague = (name: string, season: string): League => {
  const store = loadLeagues();
  const league: League = {
    id: uid(),
    name: name.trim(),
    season: season.trim(),
    teams: [],
    matches: [],
    createdAt: new Date().toISOString(),
  };
  store[league.id] = league;
  save(store);
  return league;
};

export const deleteLeague = (id: string) => {
  const store = loadLeagues();
  delete store[id];
  save(store);
};

const withLeague = (id: string, fn: (l: League) => void) => {
  const store = loadLeagues();
  const league = store[id];
  if (!league) return;
  fn(league);
  save(store);
};

export const addTeam = (leagueId: string, team: string) =>
  withLeague(leagueId, (l) => {
    const name = team.trim();
    if (!name) return;
    if (l.teams.some((t) => t.toLowerCase() === name.toLowerCase())) return;
    l.teams.push(name);
  });

export const removeTeam = (leagueId: string, team: string) =>
  withLeague(leagueId, (l) => {
    l.teams = l.teams.filter((t) => t !== team);
    l.matches = l.matches.filter(
      (m) => m.homeTeam !== team && m.awayTeam !== team,
    );
  });

export const addMatch = (
  leagueId: string,
  match: Omit<ScheduledMatch, "id" | "status" | "result">,
) =>
  withLeague(leagueId, (l) => {
    l.matches.push({
      ...match,
      id: uid(),
      status: "scheduled",
      result: "",
    });
    l.matches.sort((a, b) => a.date.localeCompare(b.date));
  });

export const updateMatch = (
  leagueId: string,
  matchId: string,
  patch: Partial<Pick<ScheduledMatch, "status" | "result">>,
) =>
  withLeague(leagueId, (l) => {
    const m = l.matches.find((x) => x.id === matchId);
    if (m) Object.assign(m, patch);
  });

export const removeMatch = (leagueId: string, matchId: string) =>
  withLeague(leagueId, (l) => {
    l.matches = l.matches.filter((m) => m.id !== matchId);
  });

export const recordLeagueResult = (
  leagueId: string,
  matchId: string,
  data: {
    result: string;
    winner: string;
    homeRuns: number;
    homeWkts: number;
    homeBalls: number;
    awayRuns: number;
    awayWkts: number;
    awayBalls: number;
    matchRecordId?: string;
  },
) =>
  withLeague(leagueId, (l) => {
    const m = l.matches.find((x) => x.id === matchId);
    if (m) Object.assign(m, { ...data, status: "completed" });
  });

export const setMatchStage = (
  leagueId: string,
  matchId: string,
  stage: MatchStage,
) =>
  withLeague(leagueId, (l) => {
    const m = l.matches.find((x) => x.id === matchId);
    if (m) m.stage = stage;
  });

export const updatePointsRules = (
  leagueId: string,
  rules: PointsRules,
) =>
  withLeague(leagueId, (l) => {
    l.pointsRules = { ...DEFAULT_POINTS_RULES, ...rules };
  });

export type Standing = {
  team: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  runsFor: number;
  ballsFor: number;
  runsAgainst: number;
  ballsAgainst: number;
  nrr: number;
  /** human-readable explanation of why this team ranks above the next one */
  reason?: string;
  /** bonus points earned from dominant wins */
  bonus: number;
};

/** Head-to-head points between two teams across completed group games */
const headToHead = (league: League, a: string, b: string): number => {
  const rules = getPointsRules(league);
  let pa = 0;
  let pb = 0;
  for (const m of league.matches) {
    if (m.status !== "completed") continue;
    if (m.stage && m.stage !== "group") continue;
    const isAB =
      (m.homeTeam === a && m.awayTeam === b) ||
      (m.homeTeam === b && m.awayTeam === a);
    if (!isAB) continue;
    if (!m.winner || m.winner === "tie") {
      pa += rules.draw;
      pb += rules.draw;
    } else if (m.winner === a) {
      pa += rules.win;
    } else if (m.winner === b) {
      pb += rules.win;
    }
  }
  return pa - pb;
};

export const computeStandings = (league: League): Standing[] => {
  const rules = getPointsRules(league);
  const table: Record<string, Standing> = {};
  for (const t of league.teams) {
    table[t] = {
      team: t,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runsFor: 0,
      ballsFor: 0,
      runsAgainst: 0,
      ballsAgainst: 0,
      nrr: 0,
      bonus: 0,
    };
  }
  const matchRR = (runs: number, balls: number) =>
    balls ? runs / (balls / 6) : 0;
  for (const m of league.matches) {
    if (m.status !== "completed") continue;
    if (m.stage && m.stage !== "group") continue; // only league/group games count
    const home = table[m.homeTeam];
    const away = table[m.awayTeam];
    if (!home || !away) continue;
    home.played += 1;
    away.played += 1;
    if (typeof m.homeRuns === "number" && typeof m.awayRuns === "number") {
      home.runsFor += m.homeRuns;
      home.runsAgainst += m.awayRuns;
      home.ballsFor += m.homeBalls ?? 0;
      home.ballsAgainst += m.awayBalls ?? 0;
      away.runsFor += m.awayRuns;
      away.runsAgainst += m.homeRuns;
      away.ballsFor += m.awayBalls ?? 0;
      away.ballsAgainst += m.homeBalls ?? 0;
    }
    // bonus point for a dominant win (winner's run rate >= factor × loser's)
    const awardBonus = (winnerKey: "home" | "away") => {
      if (!rules.bonusEnabled) return;
      if (typeof m.homeRuns !== "number" || typeof m.awayRuns !== "number")
        return;
      const homeRRate = matchRR(m.homeRuns, m.homeBalls ?? 0);
      const awayRRate = matchRR(m.awayRuns, m.awayBalls ?? 0);
      const winRRate = winnerKey === "home" ? homeRRate : awayRRate;
      const loseRRate = winnerKey === "home" ? awayRRate : homeRRate;
      if (loseRRate > 0 && winRRate >= rules.bonusRunRateFactor * loseRRate) {
        const target = winnerKey === "home" ? home : away;
        target.bonus += 1;
        target.points += 1;
      }
    };
    if (!m.winner || m.winner === "tie") {
      home.tied += 1;
      away.tied += 1;
      home.points += rules.draw;
      away.points += rules.draw;
    } else if (m.winner === m.homeTeam) {
      home.won += 1;
      home.points += rules.win;
      away.lost += 1;
      away.points += rules.loss;
      awardBonus("home");
    } else {
      away.won += 1;
      away.points += rules.win;
      home.lost += 1;
      home.points += rules.loss;
      awardBonus("away");
    }
  }
  const rr = (runs: number, balls: number) => (balls ? runs / (balls / 6) : 0);
  for (const s of Object.values(table)) {
    s.nrr = rr(s.runsFor, s.ballsFor) - rr(s.runsAgainst, s.ballsAgainst);
  }
  const sorted = Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    const h2h = headToHead(league, a.team, b.team);
    if (h2h !== 0) return -h2h;
    if (b.nrr !== a.nrr) return b.nrr - a.nrr;
    return a.team.localeCompare(b.team);
  });
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (a.points !== b.points) {
      a.reason = `Ahead on points (${a.points} vs ${b.points})`;
    } else if (a.won !== b.won) {
      a.reason = `Level on points — more wins (${a.won} vs ${b.won})`;
    } else if (headToHead(league, a.team, b.team) > 0) {
      a.reason = `Level on points — won head-to-head vs ${b.team}`;
    } else if (a.nrr !== b.nrr) {
      a.reason = `Level on points — better NRR (${a.nrr >= 0 ? "+" : ""}${a.nrr.toFixed(2)} vs ${b.nrr >= 0 ? "+" : ""}${b.nrr.toFixed(2)})`;
    } else {
      a.reason = "Level on all tiebreakers — ordered alphabetically";
    }
  }
  return sorted;
};
