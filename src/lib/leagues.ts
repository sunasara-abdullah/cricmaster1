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
};

export type LeagueStore = Record<string, League>;

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
};

export const computeStandings = (league: League): Standing[] => {
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
    };
  }
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
    if (!m.winner || m.winner === "tie") {
      home.tied += 1;
      away.tied += 1;
      home.points += 1;
      away.points += 1;
    } else if (m.winner === m.homeTeam) {
      home.won += 1;
      home.points += 2;
      away.lost += 1;
    } else {
      away.won += 1;
      away.points += 2;
      home.lost += 1;
    }
  }
  const rr = (runs: number, balls: number) => (balls ? runs / (balls / 6) : 0);
  for (const s of Object.values(table)) {
    s.nrr = rr(s.runsFor, s.ballsFor) - rr(s.runsAgainst, s.ballsAgainst);
  }
  return Object.values(table).sort(
    (a, b) => b.points - a.points || b.nrr - a.nrr,
  );
};
