import { supabase } from "@/integrations/supabase/client";
import type { BattingStats, BowlingStats, PlayerProfile, StatsStore } from "./playerStats";
import { loadTeams } from "./teams";
import { loadLeagues } from "./leagues";

/**
 * Shared player directory.
 *
 * Every signed-in scorer mirrors their local player profiles into the
 * `global_players` table. Any signed-in user can then search the whole
 * directory and see the lifetime history of every player recorded in
 * CricMaster, not just the ones they scored themselves.
 */

export type GlobalPlayer = {
  slug: string;
  name: string;
  matches: number;
  batting: BattingStats;
  bowling: BowlingStats;
  photo?: string;
  lastPlayed: string;
  scorers: number; // how many different scorers contributed to this record
  teams: string[];
  leagues: string[];
  seasons: string[];
};

export type GlobalSort =
  | "runs"
  | "average"
  | "wickets"
  | "bowlingAverage"
  | "matches";

export type GlobalFilters = {
  team?: string;
  league?: string;
  season?: string;
  sort?: GlobalSort;
};

/** Map every local player slug to the teams/leagues/seasons they belong to. */
function localAffiliations() {
  const teams = Object.values(loadTeams());
  const leagues = Object.values(loadLeagues());
  const map = new Map<string, { teams: Set<string>; leagues: Set<string>; seasons: Set<string> }>();
  for (const t of teams) {
    for (const member of t.squad ?? []) {
      const id = member.trim().toLowerCase();
      if (!id) continue;
      const entry =
        map.get(id) ?? { teams: new Set<string>(), leagues: new Set<string>(), seasons: new Set<string>() };
      entry.teams.add(t.name);
      for (const l of leagues) {
        if (l.teams?.some((x) => x.toLowerCase() === t.name.toLowerCase())) {
          entry.leagues.add(l.name);
          if (l.season) entry.seasons.add(l.season);
        }
      }
      map.set(id, entry);
    }
  }
  return map;
}

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

/** Push the whole local stats store into the shared directory. */
export async function publishPlayers(store: StatsStore): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const aff = localAffiliations();
    const rows = Object.entries(store)
      .filter(([, p]) => p && p.name?.trim())
      .map(([slug, p]) => ({
        user_id: userId,
        slug,
        name: p.name.trim(),
        matches: p.matches ?? 0,
        batting: (p.batting ?? emptyBatting()) as never,
        bowling: (p.bowling ?? emptyBowling()) as never,
        photo: p.photo ?? null,
        last_played: p.lastPlayed || null,
        teams: [...(aff.get(slug)?.teams ?? [])],
        leagues: [...(aff.get(slug)?.leagues ?? [])],
        seasons: [...(aff.get(slug)?.seasons ?? [])],
      }));
    if (rows.length === 0) return;
    await supabase.from("global_players").upsert(rows, { onConflict: "user_id,slug" });
  } catch {
    /* offline / transient — local copy is still saved */
  }
}

function mergeInto(target: GlobalPlayer, p: PlayerProfile) {
  target.matches += p.matches ?? 0;
  const b = p.batting ?? emptyBatting();
  target.batting.innings += b.innings ?? 0;
  target.batting.notOuts += b.notOuts ?? 0;
  target.batting.runs += b.runs ?? 0;
  target.batting.balls += b.balls ?? 0;
  target.batting.fours += b.fours ?? 0;
  target.batting.sixes += b.sixes ?? 0;
  target.batting.fifties += b.fifties ?? 0;
  target.batting.hundreds += b.hundreds ?? 0;
  target.batting.highest = Math.max(target.batting.highest, b.highest ?? 0);

  const w = p.bowling ?? emptyBowling();
  target.bowling.innings += w.innings ?? 0;
  target.bowling.balls += w.balls ?? 0;
  target.bowling.runs += w.runs ?? 0;
  target.bowling.wickets += w.wickets ?? 0;
  const best = w.best ?? { wickets: -1, runs: 0 };
  if (
    best.wickets > target.bowling.best.wickets ||
    (best.wickets === target.bowling.best.wickets && best.runs < target.bowling.best.runs)
  ) {
    target.bowling.best = { wickets: best.wickets, runs: best.runs };
  }
  if (!target.photo && p.photo) target.photo = p.photo;
  if ((p.lastPlayed ?? "") > target.lastPlayed) target.lastPlayed = p.lastPlayed ?? "";
  target.scorers += 1;
}

/**
 * Search the shared directory. Empty query returns the most recently
 * active players. Records with the same name (from different scorers) are
 * merged into one combined lifetime profile.
 */
export async function searchGlobalPlayers(query: string, limit = 50): Promise<GlobalPlayer[]> {
  const q = query.trim().toLowerCase();
  let req = supabase
    .from("global_players")
    .select("slug, name, matches, batting, bowling, photo, last_played")
    .order("last_played", { ascending: false, nullsFirst: false })
    .limit(400);
  if (q) req = req.ilike("slug", `%${q}%`);

  const { data, error } = await req;
  if (error) throw error;

  const merged = new Map<string, GlobalPlayer>();
  for (const row of data ?? []) {
    const existing =
      merged.get(row.slug) ??
      ({
        slug: row.slug,
        name: row.name,
        matches: 0,
        batting: emptyBatting(),
        bowling: emptyBowling(),
        photo: undefined,
        lastPlayed: "",
        scorers: 0,
      } satisfies GlobalPlayer);
    mergeInto(existing, {
      name: row.name,
      matches: row.matches,
      batting: row.batting as unknown as BattingStats,
      bowling: row.bowling as unknown as BowlingStats,
      photo: row.photo ?? undefined,
      lastPlayed: row.last_played ?? "",
    });
    merged.set(row.slug, existing);
  }

  return [...merged.values()]
    .sort((a, b) => b.batting.runs - a.batting.runs || b.matches - a.matches)
    .slice(0, limit);
}