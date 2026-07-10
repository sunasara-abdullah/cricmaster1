import type { Batter, Bowler } from "./cricket";
import { queuePush } from "./cloudSync";

const KEY = "cricmaster:matches:v1";

export type InningsCard = {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  balls: number;
  batters: Batter[];
  bowlers: Bowler[];
};

export type SavedMatch = {
  id: string;
  date: string; // ISO
  venue: string;
  overs: number;
  teamA: string; // batting first
  teamB: string;
  toss: string; // descriptive toss text
  innings: InningsCard[];
  result: string;
  manOfTheMatch: string;
  winner: string; // team name or "" for tie
  leagueId?: string;
  leagueMatchId?: string;
};

export type MatchStore = Record<string, SavedMatch>;

const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const loadMatches = (): MatchStore => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MatchStore) : {};
  } catch {
    return {};
  }
};

const save = (store: MatchStore) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
  queuePush(KEY, store);
  window.dispatchEvent(new Event("cricmaster:matches-updated"));
};

export const getMatch = (id: string): SavedMatch | undefined =>
  loadMatches()[id];

export const saveMatch = (m: Omit<SavedMatch, "id">): SavedMatch => {
  const store = loadMatches();
  const rec: SavedMatch = { ...m, id: uid() };
  store[rec.id] = rec;
  save(store);
  return rec;
};

export const deleteMatch = (id: string) => {
  const store = loadMatches();
  delete store[id];
  save(store);
};

export const listMatches = (): SavedMatch[] =>
  Object.values(loadMatches()).sort((a, b) => b.date.localeCompare(a.date));
