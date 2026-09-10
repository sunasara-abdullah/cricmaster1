import type { Batter, Bowler } from "./cricket";
import { queuePush } from "./cloudSync";
import { publishPlayers, deleteGlobalPlayer } from "./globalPlayers";
import { listMatches, updateMatch } from "./matchHistory";
import { listTeams, upsertTeam } from "./teams";

const KEY = "cricmaster:playerStats:v1";

export type BattingStats = {
  innings: number;
  notOuts: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  highest: number;
  fifties: number;
  hundreds: number;
};

export type BowlingStats = {
  innings: number;
  balls: number;
  runs: number;
  wickets: number;
  best: { wickets: number; runs: number };
};

export type PlayerProfile = {
  name: string;
  matches: number;
  batting: BattingStats;
  bowling: BowlingStats;
  lastPlayed: string;
  photo?: string; // data URL or remote URL
  /** manually assigned team names (in addition to squad membership) */
  teams?: string[];
  /** manually assigned league names */
  leagues?: string[];
};

export type StatsStore = Record<string, PlayerProfile>;

const emptyBatting = (): BattingStats => ({
  innings: 0,
  notOuts: 0,
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
  highest: 0,
  fifties: 0,
  hundreds: 0,
});

const emptyBowling = (): BowlingStats => ({
  innings: 0,
  balls: 0,
  runs: 0,
  wickets: 0,
  best: { wickets: -1, runs: 0 },
});

const slug = (name: string) => name.trim().toLowerCase();

export const loadStats = (): StatsStore => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StatsStore) : {};
  } catch {
    return {};
  }
};

const saveStats = (store: StatsStore) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
  queuePush(KEY, store);
  void publishPlayers(store);
  window.dispatchEvent(new Event("cricmaster:stats-updated"));
};

const ensure = (store: StatsStore, name: string): PlayerProfile => {
  const id = slug(name);
  if (!store[id]) {
    store[id] = {
      name: name.trim(),
      matches: 0,
      batting: emptyBatting(),
      bowling: emptyBowling(),
      lastPlayed: "",
    };
  }
  return store[id];
};

/**
 * Commit a single completed match's batting and bowling cards into the
 * lifetime stats store. Players are matched by name (case-insensitive).
 */
export const commitMatch = (batters: Batter[], bowlers: Bowler[]) => {
  const store = loadStats();
  const now = new Date().toISOString();
  const seen = new Set<string>();

  for (const b of batters) {
    if (!b.name.trim()) continue;
    if (b.balls === 0 && b.runs === 0 && !b.out) continue;
    const p = ensure(store, b.name);
    p.batting.innings += 1;
    if (!b.out) p.batting.notOuts += 1;
    p.batting.runs += b.runs;
    p.batting.balls += b.balls;
    p.batting.fours += b.fours;
    p.batting.sixes += b.sixes;
    p.batting.highest = Math.max(p.batting.highest, b.runs);
    if (b.runs >= 100) p.batting.hundreds += 1;
    else if (b.runs >= 50) p.batting.fifties += 1;
    p.lastPlayed = now;
    seen.add(slug(b.name));
  }

  for (const bw of bowlers) {
    if (!bw.name.trim()) continue;
    if (bw.balls === 0) continue;
    const p = ensure(store, bw.name);
    p.bowling.innings += 1;
    p.bowling.balls += bw.balls;
    p.bowling.runs += bw.runs;
    p.bowling.wickets += bw.wickets;
    const best = p.bowling.best;
    if (
      bw.wickets > best.wickets ||
      (bw.wickets === best.wickets && bw.runs < best.runs)
    ) {
      p.bowling.best = { wickets: bw.wickets, runs: bw.runs };
    }
    p.lastPlayed = now;
    seen.add(slug(bw.name));
  }

  for (const id of seen) store[id].matches += 1;

  saveStats(store);
  return seen.size;
};

export const findPlayer = (name: string): PlayerProfile | undefined =>
  loadStats()[slug(name)];

export const battingAverage = (b: BattingStats) => {
  const outs = b.innings - b.notOuts;
  return outs <= 0 ? null : b.runs / outs;
};

export const battingSR = (b: BattingStats) =>
  b.balls === 0 ? 0 : (b.runs / b.balls) * 100;

export const bowlingAverage = (b: BowlingStats) =>
  b.wickets === 0 ? null : b.runs / b.wickets;

export const bowlingEcon = (b: BowlingStats) =>
  b.balls === 0 ? 0 : b.runs / (b.balls / 6);

export const bestFigures = (b: BowlingStats) =>
  b.best.wickets < 0 ? "—" : `${b.best.wickets}/${b.best.runs}`;

const slugName = (n: string) => n.trim().toLowerCase();

export const setPlayerPhoto = (name: string, photo: string) => {
  const store = loadStats();
  const p = ensure(store, name);
  p.photo = photo;
  saveStats(store);
};

export type Badge = { label: string; tone: "gold" | "blue" | "green" };

export const computeBadges = (p: PlayerProfile): Badge[] => {
  const badges: Badge[] = [];
  if (p.batting.hundreds > 0)
    badges.push({ label: `${p.batting.hundreds}× Century`, tone: "gold" });
  if (p.batting.fifties > 0)
    badges.push({ label: `${p.batting.fifties}× Fifty`, tone: "blue" });
  if (p.batting.runs >= 1000)
    badges.push({ label: "1000+ Runs Club", tone: "gold" });
  if (p.bowling.best.wickets >= 5)
    badges.push({ label: "Five-Wicket Haul", tone: "gold" });
  if (p.bowling.wickets >= 50)
    badges.push({ label: "50+ Wickets Club", tone: "green" });
  if (p.batting.sixes >= 20)
    badges.push({ label: "Six Machine", tone: "blue" });
  if (p.matches >= 25)
    badges.push({ label: "Veteran (25+ matches)", tone: "green" });
  return badges;
};

// re-export to satisfy unused import guard awareness
void slugName;

/**
 * Recompute the whole lifetime stats store from saved match scorecards.
 * Fixes drift caused by edited/deleted matches or double-counted saves.
 * Player photos are preserved.
 */
export const rebuildStatsFromMatches = (): { players: number; matches: number } => {
  const photos: Record<string, string> = {};
  const meta: Record<string, { teams?: string[]; leagues?: string[] }> = {};
  const prev = loadStats();
  for (const [id, p] of Object.entries(prev)) {
    if (p.photo) photos[id] = p.photo;
    if (p.teams?.length || p.leagues?.length)
      meta[id] = { teams: p.teams, leagues: p.leagues };
  }

  const store: StatsStore = {};
  const matches = listMatches()
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const m of matches) {
    const seen = new Set<string>();
    for (const inn of m.innings) {
      for (const b of inn.batters) {
        if (!b.name?.trim()) continue;
        if (b.balls === 0 && b.runs === 0 && !b.out) continue;
        const p = ensure(store, b.name);
        p.batting.innings += 1;
        if (!b.out) p.batting.notOuts += 1;
        p.batting.runs += b.runs;
        p.batting.balls += b.balls;
        p.batting.fours += b.fours;
        p.batting.sixes += b.sixes;
        p.batting.highest = Math.max(p.batting.highest, b.runs);
        if (b.runs >= 100) p.batting.hundreds += 1;
        else if (b.runs >= 50) p.batting.fifties += 1;
        p.lastPlayed = m.date;
        seen.add(slug(b.name));
      }
      for (const bw of inn.bowlers) {
        if (!bw.name?.trim() || bw.balls === 0) continue;
        const p = ensure(store, bw.name);
        p.bowling.innings += 1;
        p.bowling.balls += bw.balls;
        p.bowling.runs += bw.runs;
        p.bowling.wickets += bw.wickets;
        const best = p.bowling.best;
        if (
          bw.wickets > best.wickets ||
          (bw.wickets === best.wickets && bw.runs < best.runs)
        ) {
          p.bowling.best = { wickets: bw.wickets, runs: bw.runs };
        }
        p.lastPlayed = m.date;
        seen.add(slug(bw.name));
      }
    }
    for (const id of seen) store[id].matches += 1;
  }

  for (const [id, photo] of Object.entries(photos)) {
    if (store[id]) store[id].photo = photo;
  }
  for (const [id, m] of Object.entries(meta)) {
    if (!store[id]) continue;
    if (m.teams?.length) store[id].teams = m.teams;
    if (m.leagues?.length) store[id].leagues = m.leagues;
  }

  saveStats(store);
  return { players: Object.keys(store).length, matches: matches.length };
};

/**
 * Rename a player everywhere: saved match scorecards, team squads,
 * man-of-the-match records and the lifetime stats store. The old entry in
 * the shared directory is removed so search shows a single, correct record.
 */
export const renamePlayer = (oldName: string, newName: string) => {
  const next = newName.trim();
  if (!next) throw new Error("Name required");
  const from = slug(oldName);
  const to = slug(next);
  if (!from) throw new Error("Invalid player");

  // 1. saved matches
  for (const m of listMatches()) {
    let changed = false;
    const innings = m.innings.map((inn) => ({
      ...inn,
      batters: inn.batters.map((b) => {
        if (slug(b.name ?? "") !== from) return b;
        changed = true;
        return { ...b, name: next };
      }),
      bowlers: inn.bowlers.map((b) => {
        if (slug(b.name ?? "") !== from) return b;
        changed = true;
        return { ...b, name: next };
      }),
    }));
    const momChanged = !!m.manOfTheMatch && slug(m.manOfTheMatch) === from;
    if (changed || momChanged) {
      updateMatch(m.id, {
        innings,
        ...(momChanged ? { manOfTheMatch: next } : {}),
      });
    }
  }

  // 2. team squads
  for (const t of listTeams()) {
    const squad = t.squad ?? [];
    if (!squad.some((s) => slug(s) === from)) continue;
    const nextSquad = squad.map((s) => (slug(s) === from ? next : s));
    upsertTeam({ ...t, squad: [...new Set(nextSquad)] });
  }

  // 3. lifetime stats store
  const store = loadStats();
  const prev = store[from];
  if (prev) {
    delete store[from];
    const merged = store[to];
    store[to] = merged
      ? { ...merged, name: next, photo: merged.photo ?? prev.photo }
      : { ...prev, name: next };
    saveStats(store);
  }

  if (from !== to) void deleteGlobalPlayer(from);
  return next;
};

/**
 * Set the teams and leagues a player belongs to. Team squads are kept in
 * sync so the team pages and the shared directory filters agree.
 */
export const setPlayerAffiliations = (
  name: string,
  teams: string[],
  leagues: string[],
) => {
  const id = slug(name);
  const cleanTeams = [...new Set(teams.map((t) => t.trim()).filter(Boolean))];
  const cleanLeagues = [...new Set(leagues.map((l) => l.trim()).filter(Boolean))];

  for (const t of listTeams()) {
    const squad = t.squad ?? [];
    const inSquad = squad.some((s) => slug(s) === id);
    const shouldBe = cleanTeams.some((x) => slug(x) === slug(t.name));
    if (inSquad === shouldBe) continue;
    const nextSquad = shouldBe
      ? [...squad, name.trim()]
      : squad.filter((s) => slug(s) !== id);
    upsertTeam({ ...t, squad: nextSquad });
  }

  const store = loadStats();
  const p = ensure(store, name);
  p.teams = cleanTeams;
  p.leagues = cleanLeagues;
  saveStats(store);
};
