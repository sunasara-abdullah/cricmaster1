import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BarChart3, Radio, Trophy } from "lucide-react";
import { Navbar } from "@/components/cricmaster/Navbar";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About CricMaster — Our Cricket Scoring Platform" },
      {
        name: "description",
        content:
          "Learn what CricMaster is, who builds it and how our ball-by-ball cricket scoring, stats and league platform works for clubs and street cricket alike.",
      },
      { property: "og:title", content: "About CricMaster" },
      {
        property: "og:description",
        content:
          "The story behind CricMaster — professional cricket scoring, stats and leagues for every level of the game.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cricmaster1.lovable.app/about" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cricmaster1.lovable.app/about" }],
  }),
  component: AboutPage,
});

const pillars = [
  { icon: Activity, title: "Accurate scoring", desc: "Strike rotation, extras, over completion and innings switch handled exactly like the rule book." },
  { icon: BarChart3, title: "Stats that last", desc: "Every innings feeds lifetime batting and bowling records you can revisit any time." },
  { icon: Trophy, title: "Real competitions", desc: "Points tables with NRR and head-to-head tiebreakers, plus knockout brackets." },
  { icon: Radio, title: "Share the game", desc: "Send a live link so family and fans follow ball-by-ball in real time." },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-heading text-4xl font-bold tracking-tight">
          About <span className="text-primary">CricMaster</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          CricMaster is a professional cricket scoring platform built for the people who
          actually run matches — club scorers, tournament organisers and weekend players
          who want their game recorded properly.
        </p>

        <section className="mt-10">
          <h2 className="font-heading text-2xl font-bold">Why we built it</h2>
          <p className="mt-3 text-muted-foreground">
            Most local cricket is scored on paper and forgotten the next day. CricMaster
            keeps the whole story — every ball, every partnership, every spell — and turns
            it into scorecards, career records and league standings automatically. Sign in
            and your history syncs to your account so it survives a lost phone or a new device.
          </p>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <p.icon className="size-5" />
              </div>
              <h3 className="font-heading text-lg font-bold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-heading text-2xl font-bold">Questions?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We read every message. Head to our support page and tell us what you need.
          </p>
          <Link
            to="/contact"
            className="mt-4 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
          >
            Contact & Support
          </Link>
        </section>
      </main>
    </div>
  );
}
