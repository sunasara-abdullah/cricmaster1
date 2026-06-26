import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/cricmaster/Navbar";
import { MatchSetup } from "@/components/cricmaster/MatchSetup";
import { Scoreboard } from "@/components/cricmaster/Scoreboard";
import type { MatchConfig } from "@/lib/cricket";

const FIXTURE_KEY = "cricmaster:pendingFixture";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CricMaster — Pro Live Cricket Scoring" },
      {
        name: "description",
        content:
          "CricMaster is a professional ball-by-ball cricket scoring app with toss, two-innings flow, live scoreboard, scorecards, player & team stats and leagues.",
      },
      { property: "og:title", content: "CricMaster — Pro Live Cricket Scoring" },
      {
        property: "og:description",
        content:
          "Broadcast-grade live cricket scoring: toss, two innings, scorecards, stats and more.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [initial, setInitial] = useState<Partial<MatchConfig> | undefined>(
    undefined,
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FIXTURE_KEY);
      if (raw) {
        setInitial(JSON.parse(raw));
        window.localStorage.removeItem(FIXTURE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      {config ? (
        <Scoreboard config={config} onReset={() => setConfig(null)} />
      ) : (
        <MatchSetup onStart={setConfig} initial={initial} />
      )}
    </div>
  );
}
