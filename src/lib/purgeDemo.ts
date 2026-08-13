/**
 * One-time cleanup of the old built-in demo/sample data (fictional IPL-style
 * teams and players) that may still be sitting in a user's localStorage.
 * Only demo entries are removed — real user-created teams, matches and
 * player profiles are left untouched.
 */

const DEMO_TEAMS = [
  "mumbai strikers",
  "chennai kings",
  "bangalore royals",
  "delhi dynamos",
  "kolkata tigers",
  "rajasthan royals",
  "punjab panthers",
  "hyderabad hawks",
];

const DEMO_PLAYERS = [
  "v. kohli",
  "r. sharma",
  "ms. dhoni",
  "j. bumrah",
  "r. jadeja",
  "r. ashwin",
  "h. pandya",
  "s. iyer",
  "m. siraj",
  "d. chahar",
  "s. curran",
  "d. karthik",
  "g. maxwell",
  "r. gaikwad",
  "j. hazlewood",
  "w. hasaranga",
  "f. du plessis",
  "m. ali",
  "k. rahul",
  "s. samson",
  "y. chahal",
  "b. kumar",
];

const isDemoTeam = (n?: string) => !!n && DEMO_TEAMS.includes(n.trim().toLowerCase());
const isDemoPlayer = (n?: string) => !!n && DEMO_PLAYERS.includes(n.trim().toLowerCase());

function editJson(key: string, fn: (v: any) => any) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const next = fn(JSON.parse(raw));
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function purgeDemoData() {
  // Matches played between demo teams
  editJson("cricmaster:matches:v1", (store) => {
    const out: Record<string, any> = {};
    for (const [id, m] of Object.entries<any>(store ?? {})) {
      if (isDemoTeam(m?.teamA) || isDemoTeam(m?.teamB)) continue;
      out[id] = m;
    }
    return out;
  });

  // Demo teams
  editJson("cricmaster:teams:v1", (store) => {
    const out: Record<string, any> = {};
    for (const [k, t] of Object.entries<any>(store ?? {})) {
      if (isDemoTeam(k) || isDemoTeam(t?.name)) continue;
      out[k] = t;
    }
    return out;
  });

  // Demo player career profiles
  editJson("cricmaster:playerStats:v1", (store) => {
    const out: Record<string, any> = {};
    for (const [k, p] of Object.entries<any>(store ?? {})) {
      if (isDemoPlayer(k) || isDemoPlayer(p?.name)) continue;
      out[k] = p;
    }
    return out;
  });

  // Leagues built around demo teams
  editJson("cricmaster:leagues:v1", (store) => {
    const out: Record<string, any> = {};
    for (const [id, l] of Object.entries<any>(store ?? {})) {
      const teams: string[] = Array.isArray(l?.teams) ? l.teams : [];
      if (teams.length > 0 && teams.every((t) => isDemoTeam(t))) continue;
      out[id] = {
        ...l,
        teams: teams.filter((t) => !isDemoTeam(t)),
        fixtures: Array.isArray(l?.fixtures)
          ? l.fixtures.filter((f: any) => !isDemoTeam(f?.teamA) && !isDemoTeam(f?.teamB))
          : l?.fixtures,
      };
    }
    return out;
  });
}
