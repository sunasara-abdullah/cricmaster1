import { supabase } from "@/integrations/supabase/client";
import type { SavedMatch } from "./matchHistory";

export type CareerMatch = {
  id: string;
  team_a: string;
  team_b: string;
  venue: string;
  overs: number;
  result: string;
  winner: string;
  man_of_the_match: string;
  played_at: string;
  data: SavedMatch;
};

/** Save a completed match to the signed-in user's career. No-op if signed out. */
export async function saveCareerMatch(m: SavedMatch): Promise<void> {
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user.id;
  if (!userId) return;
  await supabase.from("career_matches").insert({
    user_id: userId,
    team_a: m.teamA,
    team_b: m.teamB,
    venue: m.venue ?? "",
    overs: m.overs ?? 0,
    result: m.result ?? "",
    winner: m.winner ?? "",
    man_of_the_match: m.manOfTheMatch ?? "",
    played_at: m.date ?? new Date().toISOString(),
    data: m as unknown as never,
  });
}

export async function listCareerMatches(): Promise<CareerMatch[]> {
  const { data, error } = await supabase
    .from("career_matches")
    .select("*")
    .order("played_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CareerMatch[];
}

export async function deleteCareerMatch(id: string): Promise<void> {
  await supabase.from("career_matches").delete().eq("id", id);
}

export type CareerStats = {
  matches: number;
  wins: number;
  motm: number;
  runs: number;
  wickets: number;
};

/** Aggregate simple career totals across all stored matches. */
export function computeCareerStats(matches: CareerMatch[]): CareerStats {
  let runs = 0;
  let wickets = 0;
  let motm = 0;
  for (const cm of matches) {
    if (cm.man_of_the_match) motm++;
    for (const inn of cm.data?.innings ?? []) {
      runs += inn.runs ?? 0;
      wickets += inn.wickets ?? 0;
    }
  }
  return {
    matches: matches.length,
    wins: matches.filter((m) => m.winner).length,
    motm,
    runs,
    wickets,
  };
}