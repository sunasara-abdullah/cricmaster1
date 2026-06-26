import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/cricmaster/Navbar";
import { readLive, type LiveSnapshot } from "@/lib/liveShare";
import { oversText } from "@/lib/cricket";

export const Route = createFileRoute("/live/$id")({
  head: () => ({ meta: [{ title: "Live Match — CricMaster" }] }),
  component: LivePage,
});

function LivePage() {
  const { id } = Route.useParams();
  const [snap, setSnap] = useState<LiveSnapshot | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSnap(readLive(id));
      setReady(true);
    };
    sync();
    const t = setInterval(sync, 2000);
    window.addEventListener("cricmaster:live-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(t);
      window.removeEventListener("cricmaster:live-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        {ready && !snap ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No live match here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This live link is only available on the device that is scoring the
              match (it streams locally). Ask the scorer to keep their tab open.
            </p>
            <Link to="/" className="mt-4 inline-block text-primary">
              Start your own match
            </Link>
          </div>
        ) : snap ? (
          <>
            <div className="mb-4 flex items-center justify-center gap-2">
              {!snap.finished && (
                <span className="flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1">
                  <span className="size-2 animate-pulse rounded-full bg-destructive" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                    Live
                  </span>
                </span>
              )}
            </div>

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <div className="border-b border-border bg-white/[0.02] px-6 py-4 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {snap.teamA} vs {snap.teamB} • {snap.venue}
              </div>
              <div className="flex flex-col items-center gap-2 p-8">
                <h2 className="font-heading text-xl font-bold text-muted-foreground">
                  {snap.battingTeam.toUpperCase()} • INN {snap.inningsNo}
                </h2>
                <div className="font-heading text-6xl font-bold tracking-tight">
                  {snap.runs}/{snap.wickets}
                </div>
                <div className="text-muted-foreground">
                  {oversText(snap.balls)} / {snap.overs} ov
                </div>
                {snap.target != null && !snap.finished && (
                  <div className="mt-1 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary">
                    Need {Math.max(0, snap.target - snap.runs)} • Target{" "}
                    {snap.target}
                  </div>
                )}
                {snap.finished && snap.result && (
                  <div className="mt-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary">
                    {snap.result}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-px border-t border-border bg-border text-sm">
                <div className="bg-card p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Striker
                  </p>
                  <p className="font-medium">
                    {snap.striker.name} {snap.striker.runs} (
                    {snap.striker.balls})
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {snap.nonStriker.name} {snap.nonStriker.runs} (
                    {snap.nonStriker.balls})
                  </p>
                </div>
                <div className="bg-card p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Bowler
                  </p>
                  <p className="font-medium">
                    {snap.bowler.name} {snap.bowler.wickets}/{snap.bowler.runs}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {oversText(snap.bowler.balls)} overs
                  </p>
                </div>
              </div>
              <div className="border-t border-border p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  This Over
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {snap.thisOver.length === 0 && (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                  {snap.thisOver.map((l, i) => (
                    <span
                      key={i}
                      className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                        l === "W"
                          ? "bg-destructive text-destructive-foreground"
                          : l === "4" || l === "6"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                      }`}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-border bg-card p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Commentary
              </p>
              <div className="space-y-1 text-sm text-muted-foreground">
                {snap.log.length === 0 && <p>Match yet to begin…</p>}
                {snap.log.map((l, i) => (
                  <p key={i}>• {l}</p>
                ))}
              </div>
            </section>
          </>
        ) : (
          <p className="text-muted-foreground">Loading…</p>
        )}
      </main>
    </div>
  );
}
