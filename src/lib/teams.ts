import { listMatches, type SavedMatch } from "./matchHistory";
import { queuePush } from "./cloudSync";

const KEY = "cricmaster:teams:v1";

export type Team = {
  name: string;
  logo: string; // data URL or remote URL ("" = none)
  squad: string[]; // player names
  homeGround: string;
  createdAt: string;
};

export type TeamStore = Record<string, Team>;

const slug = (n: string) => n.trim().toLowerCase();

export const loadTeams = (): TeamStore => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TeamStore) : {};
  } catch {
    return {};
  }
};

const save = (store: TeamStore) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
  queuePush(KEY, store);
  window.dispatchEvent(new Event("cricmaster:teams-updated"));
};

export const getTeam = (name: string): Team | undefined => loadTeams()[slug(name)];

export const upsertTeam = (team: Partial<Team> & { name: string }) => {
  const store = loadTeams();
  const id = slug(team.name);
  const existing = store[id];
  store[id] = {
    name: team.name.trim(),
    logo: team.logo ?? existing?.logo ?? "",
    squad: team.squad ?? existing?.squad ?? [],
    homeGround: team.homeGround ?? existing?.homeGround ?? "",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  save(store);
  return store[id];
};

export const deleteTeam = (name: string) => {
  const store = loadTeams();
  delete store[slug(name)];
  save(store);
};

export const listTeams = (): Team[] =>
  Object.values(loadTeams()).sort((a, b) => a.name.localeCompare(b.name));

export type TeamRecord = {
  played: number;
  won: number;
  lost: number;
  tied: number;
  winPct: number;
};

export const teamRecord = (name: string, matches?: SavedMatch[]): TeamRecord => {
  const ms = (matches ?? listMatches()).filter(
    (m) => m.teamA === name || m.teamB === name,
  );
  let won = 0,
    lost = 0,
    tied = 0;
  for (const m of ms) {
    if (!m.winner) tied += 1;
    else if (m.winner === name) won += 1;
    else lost += 1;
  }
  const played = ms.length;
  return {
    played,
    won,
    lost,
    tied,
    winPct: played ? (won / played) * 100 : 0,
  };
};
