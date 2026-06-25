import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/cricmaster/Navbar";
import { MatchSetup } from "@/components/cricmaster/MatchSetup";
import { Scoreboard } from "@/components/cricmaster/Scoreboard";
import type { MatchConfig } from "@/lib/cricket";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CricMaster — Pro Live Cricket Scoring" },
      {
        name: "description",
        content:
          "CricMaster is a professional ball-by-ball cricket scoring app with live scoreboard, batting & bowling stats, run rate and over tracking.",
      },
      { property: "og:title", content: "CricMaster — Pro Live Cricket Scoring" },
      {
        property: "og:description",
        content: "Broadcast-grade live cricket scoring: ball-by-ball, stats, run rate and more.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [config, setConfig] = useState<MatchConfig | null>(null);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      {config ? (
        <Scoreboard config={config} onReset={() => setConfig(null)} />
      ) : (
        <MatchSetup onStart={setConfig} />
      )}
    </div>
  );
}
