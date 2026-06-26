const KEY = "cricmaster:leagues:v1";

export type MatchStatus = "scheduled" | "completed";

export type ScheduledMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string; // ISO date (yyyy-mm-dd)
  venue: string;
  status: MatchStatus;
  result: string;
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