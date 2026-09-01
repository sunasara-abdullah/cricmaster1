import { listMatches, type SavedMatch } from "./matchHistory";
import { loadLeagues, type League } from "./leagues";

export type PlayerMatchPerf = {
  matchId: string;
  date: string;
  venue: string;
  opponent: string;
  team: string;
  result: string;
  mom: boolean;
  batting?: { runs: number; balls: number; fours: number; sixes: number; out: boolean };
  bowling?: { balls: number; runs: number; wickets: number };
};

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/** Every saved match this player appeared in, newest first. */
export const playerMatches = (
  name: string,
  matches?: SavedMatch[],
): PlayerMatchPerf[] => {
  const all = matches ?? listMatches();
  const out: PlayerMatchPerf[] = [];

  for (const m of all) {
    for (const inn of m.innings) {
      const bat = inn.batters.find((b) => same(b.name, name));
      const bowl = inn.bowlers.find((b) => same(b.name, name) && b.balls > 0);
      if (!bat && !bowl) continue;
      const team = bat ? inn.battingTeam : inn.bowlingTeam;
      const opponent = bat ? inn.bowlingTeam : inn.battingTeam;
      out.push({
        matchId: m.id,
        date: m.date,
        venue: m.venue,
        team,
        opponent,
        result: m.result,
        mom: !!m.manOfTheMatch && same(m.manOfTheMatch, name),
        batting: bat
          ? {
              runs: bat.runs,
              balls: bat.balls,
              fours: bat.fours,
              sixes: bat.sixes,
              out: bat.out,
            }
          : undefined,
        bowling: bowl
          ? { balls: bowl.balls, runs: bowl.runs, wickets: bowl.wickets }
          : undefined,
      });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
};

/** Top batting innings sorted by runs (then strike rate). */
export const bestInnings = (perfs: PlayerMatchPerf[], take = 5) =>
  perfs
    .filter((p) => p.batting && (p.batting.balls > 0 || p.batting.runs > 0))
    .sort((a, b) => {
      const d = (b.batting!.runs ?? 0) - (a.batting!.runs ?? 0);
      if (d !== 0) return d;
      return (a.batting!.balls ?? 0) - (b.batting!.balls ?? 0);
    })
    .slice(0, take);

/** Top bowling spells sorted by wickets (then runs conceded). */
export const bestSpells = (perfs: PlayerMatchPerf[], take = 5) =>
  perfs
    .filter((p) => p.bowling)
    .sort((a, b) => {
      const d = b.bowling!.wickets - a.bowling!.wickets;
      if (d !== 0) return d;
      return a.bowling!.runs - b.bowling!.runs;
    })
    .slice(0, take);

export type LeagueAppearance = {
  league: League;
  matches: number;
  runs: number;
  wickets: number;
  teams: string[];
};

/** Leagues this player featured in, derived from saved matches. */
export const playerLeagueHistory = (
  perfs: PlayerMatchPerf[],
  matches?: SavedMatch[],
): LeagueAppearance[] => {
  const all = matches ?? listMatches();
  const byId = new Map(all.map((m) => [m.id, m] as const));
  const leagues = loadLeagues();
  const acc = new Map<string, LeagueAppearance>();

  for (const p of perfs) {
    const m = byId.get(p.matchId);
    const lid = m?.leagueId;
    if (!lid) continue;
    const league = leagues[lid];
    if (!league) continue;
    const cur =
      acc.get(lid) ??
      ({ league, matches: 0, runs: 0, wickets: 0, teams: [] } as LeagueAppearance);
    cur.matches += 1;
    cur.runs += p.batting?.runs ?? 0;
    cur.wickets += p.bowling?.wickets ?? 0;
    if (p.team && !cur.teams.includes(p.team)) cur.teams.push(p.team);
    acc.set(lid, cur);
  }
  return Array.from(acc.values()).sort((a, b) => b.matches - a.matches);
};

/** Distinct teams the player has represented. */
export const playerTeams = (perfs: PlayerMatchPerf[]) =>
  Array.from(new Set(perfs.map((p) => p.team).filter(Boolean)));
