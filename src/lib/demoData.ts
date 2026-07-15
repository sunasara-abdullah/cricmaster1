import { upsertTeam, loadTeams } from "./teams";
import { saveMatch, loadMatches } from "./matchHistory";
import { createLeague, addTeam, addMatch, recordLeagueResult, loadLeagues } from "./leagues";
import { commitMatch, loadStats } from "./playerStats";
import type { Batter, Bowler } from "./cricket";
import type { InningsCard } from "./matchHistory";

const DEMO_FLAG_KEY = "cricmaster:demo-seeded:v1";

const bat = (name: string, runs: number, balls: number, fours = 0, sixes = 0, out = true): Batter => ({
  name, runs, balls, fours, sixes, out,
});

const bowl = (name: string, balls: number, runs: number, wickets: number): Bowler => ({
  name, balls, runs, wickets,
});

function buildInnings(
  battingTeam: string,
  bowlingTeam: string,
  batters: Batter[],
  bowlers: Bowler[],
): InningsCard {
  const runs = batters.reduce((s, b) => s + b.runs, 0)
    + bowlers.reduce((s, b) => s + b.runs, 0) - batters.reduce((s, b) => s + b.runs, 0); // batters already contain runs
  const finalRuns = batters.reduce((s, b) => s + b.runs, 0);
  const wickets = batters.filter((b) => b.out).length;
  const balls = bowlers.reduce((s, b) => s + b.balls, 0);
  void runs;
  return {
    battingTeam,
    bowlingTeam,
    runs: finalRuns,
    wickets,
    balls,
    batters,
    bowlers,
  };
}

/** Returns true if any demo/user data already exists. */
export function hasAnyData(): boolean {
  return (
    Object.keys(loadMatches()).length > 0 ||
    Object.keys(loadTeams()).length > 0 ||
    Object.keys(loadLeagues()).length > 0 ||
    Object.keys(loadStats()).length > 0
  );
}

export function isDemoSeeded(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(DEMO_FLAG_KEY);
}

/**
 * Seed a demo pack: 3 teams, 1 league with a completed match & 2 fixtures,
 * plus two standalone completed matches so every page has something to show.
 */
export function seedDemoData() {
  if (typeof window === "undefined") return;

  // Teams
  upsertTeam({ name: "Mumbai Strikers", homeGround: "Wankhede", squad: ["R. Sharma", "V. Kohli", "S. Iyer", "H. Pandya", "J. Bumrah", "R. Ashwin"] });
  upsertTeam({ name: "Chennai Kings", homeGround: "Chepauk", squad: ["MS. Dhoni", "R. Gaikwad", "R. Jadeja", "D. Chahar", "M. Ali", "S. Curran"] });
  upsertTeam({ name: "Bangalore Royals", homeGround: "Chinnaswamy", squad: ["F. du Plessis", "G. Maxwell", "M. Siraj", "D. Karthik", "J. Hazlewood", "W. Hasaranga"] });

  // Match 1 — Mumbai vs Chennai (completed)
  {
    const inn1 = buildInnings("Mumbai Strikers", "Chennai Kings",
      [
        bat("R. Sharma", 62, 41, 6, 3, true),
        bat("V. Kohli", 45, 32, 4, 1, true),
        bat("S. Iyer", 28, 19, 2, 1, true),
        bat("H. Pandya", 22, 14, 1, 2, false),
        bat("MS. Dhoni", 0, 0, 0, 0, false),
      ],
      [
        bowl("D. Chahar", 24, 34, 1),
        bowl("S. Curran", 24, 41, 2),
        bowl("R. Jadeja", 24, 32, 0),
        bowl("M. Ali", 24, 43, 1),
        bowl("MS. Dhoni", 24, 18, 0),
      ],
    );
    const inn2 = buildInnings("Chennai Kings", "Mumbai Strikers",
      [
        bat("R. Gaikwad", 40, 30, 4, 1, true),
        bat("MS. Dhoni", 58, 34, 5, 3, false),
        bat("R. Jadeja", 33, 22, 3, 1, true),
        bat("M. Ali", 12, 10, 1, 0, true),
        bat("S. Curran", 8, 5, 1, 0, false),
      ],
      [
        bowl("J. Bumrah", 24, 28, 2),
        bowl("H. Pandya", 24, 36, 1),
        bowl("R. Ashwin", 24, 33, 0),
        bowl("V. Kohli", 12, 22, 0),
        bowl("S. Iyer", 12, 27, 0),
      ],
    );
    const winner = inn2.runs > inn1.runs ? "Chennai Kings" : "Mumbai Strikers";
    const rec = saveMatch({
      date: new Date(Date.now() - 3 * 86400e3).toISOString(),
      venue: "Wankhede Stadium",
      overs: 20,
      teamA: "Mumbai Strikers",
      teamB: "Chennai Kings",
      toss: "Chennai Kings won the toss & chose to bowl",
      innings: [inn1, inn2],
      result: winner === "Chennai Kings"
        ? `Chennai Kings won by ${5} wickets`
        : `Mumbai Strikers won by ${inn1.runs - inn2.runs} runs`,
      manOfTheMatch: "MS. Dhoni",
      winner,
    });
    commitMatch(inn1.batters, inn1.bowlers);
    commitMatch(inn2.batters, inn2.bowlers);
    void rec;
  }

  // Match 2 — Bangalore vs Mumbai (completed)
  {
    const inn1 = buildInnings("Bangalore Royals", "Mumbai Strikers",
      [
        bat("F. du Plessis", 71, 48, 8, 2, true),
        bat("V. Kohli", 55, 40, 5, 1, true),
        bat("G. Maxwell", 42, 22, 3, 4, false),
        bat("D. Karthik", 15, 8, 1, 1, false),
      ],
      [
        bowl("J. Bumrah", 24, 26, 1),
        bowl("H. Pandya", 24, 42, 1),
        bowl("R. Ashwin", 24, 38, 0),
        bowl("S. Iyer", 24, 34, 0),
        bowl("R. Sharma", 24, 43, 0),
      ],
    );
    const inn2 = buildInnings("Mumbai Strikers", "Bangalore Royals",
      [
        bat("R. Sharma", 30, 24, 3, 1, true),
        bat("V. Kohli", 22, 20, 2, 0, true),
        bat("S. Iyer", 48, 35, 5, 1, true),
        bat("H. Pandya", 40, 26, 3, 2, true),
        bat("J. Bumrah", 6, 5, 1, 0, false),
      ],
      [
        bowl("M. Siraj", 24, 31, 2),
        bowl("J. Hazlewood", 24, 28, 1),
        bowl("W. Hasaranga", 24, 40, 1),
        bowl("G. Maxwell", 24, 34, 0),
        bowl("F. du Plessis", 24, 42, 0),
      ],
    );
    const rec = saveMatch({
      date: new Date(Date.now() - 6 * 86400e3).toISOString(),
      venue: "M. Chinnaswamy Stadium",
      overs: 20,
      teamA: "Bangalore Royals",
      teamB: "Mumbai Strikers",
      toss: "Bangalore Royals won the toss & chose to bat",
      innings: [inn1, inn2],
      result: `Bangalore Royals won by ${inn1.runs - inn2.runs} runs`,
      manOfTheMatch: "F. du Plessis",
      winner: "Bangalore Royals",
    });
    commitMatch(inn1.batters, inn1.bowlers);
    commitMatch(inn2.batters, inn2.bowlers);
    void rec;
  }

  // League
  const league = createLeague("Premier T20 Cup", new Date().getFullYear().toString());
  addTeam(league.id, "Mumbai Strikers");
  addTeam(league.id, "Chennai Kings");
  addTeam(league.id, "Bangalore Royals");
  addMatch(league.id, {
    homeTeam: "Mumbai Strikers",
    awayTeam: "Chennai Kings",
    date: new Date(Date.now() - 3 * 86400e3).toISOString().slice(0, 10),
    venue: "Wankhede Stadium",
    stage: "group",
  });
  addMatch(league.id, {
    homeTeam: "Bangalore Royals",
    awayTeam: "Mumbai Strikers",
    date: new Date(Date.now() - 6 * 86400e3).toISOString().slice(0, 10),
    venue: "M. Chinnaswamy Stadium",
    stage: "group",
  });
  addMatch(league.id, {
    homeTeam: "Chennai Kings",
    awayTeam: "Bangalore Royals",
    date: new Date(Date.now() + 2 * 86400e3).toISOString().slice(0, 10),
    venue: "MA Chidambaram Stadium",
    stage: "group",
  });
  // Record the first fixture as complete using the fresh league snapshot
  const fresh = loadLeagues()[league.id];
  if (fresh) {
    const m1 = fresh.matches[0];
    if (m1) {
      recordLeagueResult(league.id, m1.id, {
        result: "Chennai Kings won by 5 wickets",
        winner: "Chennai Kings",
        homeRuns: 157, homeWkts: 4, homeBalls: 120,
        awayRuns: 161, awayWkts: 5, awayBalls: 116,
      });
    }
  }

  window.localStorage.setItem(DEMO_FLAG_KEY, "1");
  window.dispatchEvent(new Event("cricmaster:matches-updated"));
  window.dispatchEvent(new Event("cricmaster:teams-updated"));
  window.dispatchEvent(new Event("cricmaster:leagues-updated"));
  window.dispatchEvent(new Event("cricmaster:stats-updated"));
}

/** Wipe every cricmaster:* localStorage key and notify listeners. */
export function clearAllData() {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith("cricmaster:") && k !== "cricmaster:fresh-reset:v1") keys.push(k);
  }
  keys.forEach((k) => window.localStorage.removeItem(k));
  window.dispatchEvent(new Event("cricmaster:matches-updated"));
  window.dispatchEvent(new Event("cricmaster:teams-updated"));
  window.dispatchEvent(new Event("cricmaster:leagues-updated"));
  window.dispatchEvent(new Event("cricmaster:stats-updated"));
}