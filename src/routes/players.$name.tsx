import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/cricmaster/Navbar";
import { Breadcrumbs } from "@/components/cricmaster/Breadcrumbs";
import { oversText } from "@/lib/cricket";
import {
  type PlayerProfile,
  findPlayer,
  battingAverage,
  battingSR,
  bowlingAverage,
  bowlingEcon,
  bestFigures,
  computeBadges,
  setPlayerPhoto,
} from "@/lib/playerStats";

export const Route = createFileRoute("/players/$name")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.name} — Player Profile | CricMaster` },
      {
        name: "description",
        content: `Career batting and bowling stats for ${params.name} on CricMaster.`,
      },
    ],
  }),
  component: ProfilePage,
});

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function ProfilePage() {
  const { name } = Route.useParams();
  const [player, setPlayer] = useState<PlayerProfile | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPlayer(findPlayer(name));
      setReady(true);
    };
    sync();
    window.addEventListener("cricmaster:stats-updated", sync);
    return () => window.removeEventListener("cricmaster:stats-updated", sync);
  }, [name]);

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await fileToDataUrl(f);
    setPlayerPhoto(name, url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Breadcrumbs
          backTo="/players"
          backLabel="All players"
          items={[{ label: "Players", to: "/players" }, { label: name }]}
        />

        {ready && !player ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No stats for "{name}"</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This player hasn't been saved to any match yet.
            </p>
          </div>
        ) : player ? (
          <>
            <header className="mb-8 mt-4 flex items-center gap-4">
              {player.photo ? (
                <img
                  src={player.photo}
                  alt={player.name}
                  className="size-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
                  {player.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-heading text-3xl font-bold tracking-tight">{player.name}</h1>
                <p className="text-sm text-muted-foreground">{player.matches} matches played</p>
                <label className="mt-1 inline-block cursor-pointer text-xs text-primary hover:underline">
                  Upload photo
                  <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
                </label>
              </div>
            </header>

            {computeBadges(player).length > 0 && (
              <section className="mb-6 flex flex-wrap gap-2">
                {computeBadges(player).map((b) => (
                  <span
                    key={b.label}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      b.tone === "gold"
                        ? "bg-primary/15 text-primary"
                        : b.tone === "blue"
                          ? "bg-secondary text-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    🏅 {b.label}
                  </span>
                ))}
              </section>
            )}

            <section className="mb-6">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Batting
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Runs" value={player.batting.runs} />
                <Stat
                  label="Average"
                  value={battingAverage(player.batting)?.toFixed(1) ?? "—"}
                />
                <Stat label="Strike Rate" value={battingSR(player.batting).toFixed(1)} />
                <Stat label="Highest" value={player.batting.highest} />
                <Stat label="Innings" value={player.batting.innings} />
                <Stat label="50s / 100s" value={`${player.batting.fifties}/${player.batting.hundreds}`} />
                <Stat label="Fours" value={player.batting.fours} />
                <Stat label="Sixes" value={player.batting.sixes} />
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Bowling
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Wickets" value={player.bowling.wickets} />
                <Stat
                  label="Average"
                  value={bowlingAverage(player.bowling)?.toFixed(1) ?? "—"}
                />
                <Stat
                  label="Economy"
                  value={player.bowling.balls ? bowlingEcon(player.bowling).toFixed(1) : "—"}
                />
                <Stat label="Best" value={bestFigures(player.bowling)} />
                <Stat label="Overs" value={oversText(player.bowling.balls)} />
                <Stat label="Runs Conceded" value={player.bowling.runs} />
                <Stat label="Spells" value={player.bowling.innings} />
              </div>
            </section>
          </>
        ) : (
          <p className="mt-8 text-muted-foreground">Loading…</p>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-heading text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}