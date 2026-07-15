import { supabase } from "@/integrations/supabase/client";

const prefix = "cricmaster:live:";

export type LiveSnapshot = {
  teamA: string;
  teamB: string;
  venue: string;
  overs: number;
  inningsNo: number;
  target: number | null;
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  balls: number;
  striker: { name: string; runs: number; balls: number };
  nonStriker: { name: string; runs: number; balls: number };
  bowler: { name: string; runs: number; wickets: number; balls: number };
  thisOver: string[];
  log: string[];
  result: string;
  finished: boolean;
  updatedAt: number;
};

/**
 * Publish a live scoreboard snapshot. Writes to localStorage (instant local
 * mirror for the scorer's own tab) and, for signed-in scorers, upserts the
 * snapshot to Supabase so any spectator on any device can follow the link.
 */
export const publishLive = (id: string, snap: LiveSnapshot) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(prefix + id, JSON.stringify(snap));
  window.dispatchEvent(new Event("cricmaster:live-updated"));
  void pushLiveToCloud(id, snap);
};

async function pushLiveToCloud(id: string, snap: LiveSnapshot) {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return; // anonymous scorer — local-only share
    await supabase
      .from("live_matches")
      .upsert({ id, user_id: userId, snapshot: snap as never });
  } catch {
    /* offline / transient — local snapshot still works for the scorer */
  }
}

/** One-shot fetch of the cloud snapshot for a live match. */
export async function fetchLive(id: string): Promise<LiveSnapshot | undefined> {
  try {
    const { data, error } = await supabase
      .from("live_matches")
      .select("snapshot")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return undefined;
    return data.snapshot as unknown as LiveSnapshot;
  } catch {
    return undefined;
  }
}

/** Subscribe to realtime updates for a specific live match id. */
export function subscribeLive(
  id: string,
  onSnap: (snap: LiveSnapshot) => void,
) {
  const channel = supabase
    .channel(`live-match-${id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_matches", filter: `id=eq.${id}` },
      (payload) => {
        const row = (payload.new ?? payload.old) as { snapshot?: LiveSnapshot } | null;
        if (row?.snapshot) onSnap(row.snapshot);
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export const readLive = (id: string): LiveSnapshot | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(prefix + id);
    return raw ? (JSON.parse(raw) as LiveSnapshot) : undefined;
  } catch {
    return undefined;
  }
};
