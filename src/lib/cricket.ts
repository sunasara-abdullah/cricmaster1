export type BallEvent = {
  id: number;
  /** runs scored off the bat (or attributed) */
  runs: number;
  /** display label e.g. "4", "6", "W", "wd", "nb", "0" */
  label: string;
  /** whether this delivery counts as a legal ball */
  legal: boolean;
  /** extra runs added to total beyond bat runs */
  extra: number;
  wicket: boolean;
  striker: string;
};

export type Batter = {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
};

export type Bowler = {
  name: string;
  balls: number;
  runs: number;
  wickets: number;
};

export type MatchConfig = {
  teamA: string;
  teamB: string;
  overs: number;
  striker: string;
  nonStriker: string;
  bowler: string;
  venue: string;
  /** number of players per team (used for all-out detection) */
  playersPerTeam?: number;
  /** toss winning team name */
  tossWinner?: string;
  /** what the toss winner chose to do */
  tossDecision?: "bat" | "bowl";
  /** team batting first (derived from toss) */
  battingFirst?: string;
  /** optional link back to a league fixture */
  leagueId?: string;
  leagueMatchId?: string;
  /** playing XI selected for each side (optional) */
  lineupA?: string[];
  lineupB?: string[];
  /** cosmetic match metadata */
  matchType?: string;
  ballType?: "leather" | "tennis" | "other";
};

export const strikeRate = (runs: number, balls: number) =>
  balls === 0 ? "0.0" : ((runs / balls) * 100).toFixed(1);

export const economy = (runs: number, balls: number) =>
  balls === 0 ? "0.0" : ((runs / (balls / 6))).toFixed(1);

export const oversText = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

export const runRate = (runs: number, balls: number) =>
  balls === 0 ? "0.00" : ((runs / balls) * 6).toFixed(2);