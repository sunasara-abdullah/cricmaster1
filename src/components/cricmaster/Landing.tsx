import { Link } from "@tanstack/react-router";
import {
  Activity,
  Award,
  BarChart3,
  Radio,
  Trophy,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Activity,
    title: "Ball-by-Ball Scoring",
    desc: "Professional live scoring with toss, two-innings flow, strike rotation and instant commentary.",
  },
  {
    icon: BarChart3,
    title: "Player & Career Stats",
    desc: "Lifetime batting & bowling records, averages, strike rates, best figures and milestone badges.",
  },
  {
    icon: Trophy,
    title: "Leagues & Standings",
    desc: "Auto points tables with NRR, head-to-head tiebreakers and one-click tournament presets.",
  },
  {
    icon: Users,
    title: "Team Profiles & Squads",
    desc: "Manage teams, squads, logos and track win/loss records across competitions.",
  },
  {
    icon: Award,
    title: "Awards & Brackets",
    desc: "Man of the Match, season awards and knockout playoff brackets — quarter to final.",
  },
  {
    icon: Radio,
    title: "Live Share",
    desc: "Share a live match link so anyone can follow the score ball-by-ball in real time.",
  },
] as const;

export function Landing({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-primary)/15%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Broadcast-grade cricket scoring
            </span>
          </div>
          <h1 className="font-heading text-5xl font-bold tracking-tight sm:text-7xl">
            Score Cricket Like a{" "}
            <span className="text-primary">Pro</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            CricMaster gives you everything to run a match — live ball-by-ball
            scoring, full scorecards, player stats, leagues, standings and more.
            All in one professional platform.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="rounded-xl bg-primary px-8 py-4 font-heading text-lg font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Get Started
            </button>
            <Link
              to="/leagues"
              className="rounded-xl border border-border bg-card px-8 py-4 font-heading text-lg font-bold uppercase tracking-wide text-foreground transition-colors hover:border-primary"
            >
              Explore Leagues
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
            Everything you need
          </p>
          <h2 className="font-heading text-4xl font-bold tracking-tight">
            Built for serious cricket
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-6" />
              </div>
              <h3 className="mb-2 font-heading text-xl font-bold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="font-heading text-4xl font-bold tracking-tight">
            Ready to start your match?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Set up teams, do the toss and start scoring in seconds.
          </p>
          <button
            onClick={onGetStarted}
            className="mt-8 rounded-xl bg-primary px-10 py-4 font-heading text-lg font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Get Started
          </button>
        </div>
      </section>
    </div>
  );
}