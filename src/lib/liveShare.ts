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

export const publishLive = (id: string, snap: LiveSnapshot) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(prefix + id, JSON.stringify(snap));
  window.dispatchEvent(new Event("cricmaster:live-updated"));
};

export const readLive = (id: string): LiveSnapshot | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(prefix + id);
    return raw ? (JSON.parse(raw) as LiveSnapshot) : undefined;
  } catch {
    return undefined;
  }
};
