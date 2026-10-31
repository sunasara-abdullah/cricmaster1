import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Copy, Pencil, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/cricmaster/Navbar";
import { Breadcrumbs } from "@/components/cricmaster/Breadcrumbs";
import {
  getMatch,
  editMatchLineup,
  deleteMatch,
  setMatchAiReport,
  type InningsCard,
  type SavedMatch,
} from "@/lib/matchHistory";
import { generateMatchReport } from "@/lib/matchReport.functions";
import { supabase } from "@/integrations/supabase/client";
import { rebuildStatsFromMatches } from "@/lib/playerStats";
import { ConfirmButton } from "@/components/cricmaster/ConfirmButton";
import { exportMatchPdf } from "@/lib/careerExport";
import { oversText, strikeRate, economy } from "@/lib/cricket";

export const Route = createFileRoute("/matches/$id")({
  head: ({ params }) => {
    const match = typeof window !== "undefined" ? getMatch(params.id) : undefined;
    const title = match
      ? `${match.teamA} vs ${match.teamB} — Scorecard | Playnivo`
      : "Scorecard — Playnivo";
    const description = match
      ? `${match.result}. ${match.teamA} vs ${match.teamB}, ${match.overs} overs at ${match.venue}. Full ball-by-ball scorecard on Playnivo.`
      : "View the full ball-by-ball scorecard on Playnivo.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
      ],
      scripts: match
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SportsEvent",
                name: `${match.teamA} vs ${match.teamB}`,
                sport: "Cricket",
                startDate: match.date,
                location: { "@type": "Place", name: match.venue },
                competitor: [
                  { "@type": "SportsTeam", name: match.teamA },
                  { "@type": "SportsTeam", name: match.teamB },
                ],
                description: match.result,
              }),
            },
          ]
        : undefined,
    };
  },
  component: ScorecardPage,
});

function ScorecardPage() {
  const { id } = Route.useParams();
  const navigate = Route.useNavigate();
  const [match, setMatch] = useState<SavedMatch | undefined>(undefined);
  const [ready, setReady] = useState(false);

  const downloadPdf = () => {
    if (!match) return;
    try {
      exportMatchPdf({
        id: match.id,
        team_a: match.teamA,
        team_b: match.teamB,
        venue: match.venue ?? "",
        overs: match.overs ?? 0,
        result: match.result ?? "",
        winner: match.winner ?? "",
        man_of_the_match: match.manOfTheMatch ?? "",
        played_at: match.date,
        data: match,
      });
      toast.success("Scorecard PDF download ho gaya");
    } catch {
      toast.error("PDF banane me problem aayi, dobara try karein");
    }
  };

  useEffect(() => {
    setMatch(getMatch(id));
    setReady(true);
  }, [id]);

  if (ready && !match) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="text-lg font-medium">Scorecard not found</p>
          <Link to="/matches" className="mt-4 inline-block text-primary">
            Back to matches
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Breadcrumbs
          backTo="/matches"
          backLabel="All matches"
          items={[
            { label: "Matches", to: "/matches" },
            { label: match ? `${match.teamA} vs ${match.teamB}` : "Scorecard" },
          ]}
        />
        {match && (
          <>
            <header className="mb-6 mt-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="font-heading text-3xl font-bold tracking-tight">
                  {match.teamA} vs {match.teamB}
                </h1>
                <button
                  type="button"
                  onClick={downloadPdf}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-bold transition-colors hover:border-primary hover:text-primary"
                >
                  <Download className="size-4" />
                  Download PDF
                </button>
                <ConfirmButton
                  title="Delete this match?"
                  description={`"${match.teamA} vs ${match.teamB}" ka scorecard permanently delete ho jayega.`}
                  onConfirm={() => {
                    try {
                      deleteMatch(match.id);
                      rebuildStatsFromMatches();
                      toast.success("Match deleted");
                      navigate({ to: "/matches" });
                    } catch {
                      toast.error("Match delete nahi ho paya");
                    }
                  }}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                >
                  Delete match
                </ConfirmButton>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(match.date).toLocaleString()} · {match.overs} overs ·{" "}
                {match.venue}
              </p>
              {match.toss && (
                <p className="text-xs text-muted-foreground">{match.toss}</p>
              )}
              <p className="mt-3 inline-block rounded-lg bg-primary/10 px-4 py-1.5 font-bold text-primary">
                {match.result}
              </p>
              {match.manOfTheMatch && (
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Man of the Match:</span>{" "}
                  <Link
                    to="/players/$name"
                    params={{ name: match.manOfTheMatch }}
                    className="font-bold text-primary hover:underline"
                  >
                    {match.manOfTheMatch}
                  </Link>
                </p>
              )}
            </header>

            <AiReportCard match={match} onSaved={(m) => setMatch(m)} />

            <LineupEditor
              match={match}
              onSaved={(m) => setMatch(m)}
            />

            {match.innings.map((inn, i) => (
              <InningsTable key={i} card={inn} />
            ))}
          </>
        )}
      </main>
    </div>
  );
}

function AiReportCard({
  match,
  onSaved,
}: {
  match: SavedMatch;
  onSaved: (m: SavedMatch) => void;
}) {
  const generate = useServerFn(generateMatchReport);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)))
      .catch(() => setSignedIn(false));
  }, []);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await generate({ data: { match } });
      if (res.ok) {
        const updated = setMatchAiReport(match.id, {
          content: res.content,
          generatedAt: new Date().toISOString(),
        });
        if (updated) onSaved(updated);
        toast.success("Match report ready");
      } else {
        setError(res.message);
        toast.error(res.message);
      }
    } catch {
      const msg = signedIn
        ? "Report could not be generated. Please try again."
        : "Sign in to generate an AI match report.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!match.aiReport) return;
    try {
      await navigator.clipboard.writeText(match.aiReport.content);
      toast.success("Report copied — paste it anywhere to share");
    } catch {
      toast.error("Copy nahi ho paya, text select karke copy karein");
    }
  };

  if (signedIn === false && !match.aiReport) {
    return (
      <section className="mb-8 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-heading flex items-center gap-2 text-lg font-bold">
          <Sparkles className="size-4 text-primary" /> AI Match Report
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to turn this scorecard into a shareable, written match report.
        </p>
        <Link
          to="/auth"
          className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
        >
          Sign in
        </Link>
      </section>
    );
  }

  const report = match.aiReport;

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading flex items-center gap-2 text-lg font-bold">
          <Sparkles className="size-4 text-primary" /> AI Match Report
        </h2>
        <div className="flex gap-2">
          {report && (
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition-colors hover:border-primary hover:text-primary"
            >
              <Copy className="size-3.5" /> Copy report
            </button>
          )}
          <button
            type="button"
            onClick={run}
            disabled={busy || signedIn === false}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {busy ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {busy ? "Writing…" : report ? "Regenerate" : "Generate report"}
          </button>
        </div>
      </div>

      {busy && (
        <p className="mt-3 text-xs text-muted-foreground">
          The AI is writing the report from your scorecard — this usually takes
          15–40 seconds.
        </p>
      )}

      {error && !busy && (
        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      {report && !busy && (
        <>
          <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {report.content}
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </>
      )}

      {!report && !busy && !error && signedIn !== false && (
        <p className="mt-2 text-sm text-muted-foreground">
          Turn the scorecard into a professional, shareable match report with one tap.
        </p>
      )}
    </section>
  );
}

function InningsTable({ card }: { card: InningsCard }) {
  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-white/[0.02] px-5 py-3">
        <h2 className="font-heading text-lg font-bold">{card.battingTeam}</h2>
        <span className="font-mono text-lg font-bold">
          {card.runs}/{card.wickets}{" "}
          <span className="text-sm text-muted-foreground">
            ({oversText(card.balls)})
          </span>
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 font-bold">Batter</th>
            <th className="px-2 py-2 text-right font-bold">R</th>
            <th className="px-2 py-2 text-right font-bold">B</th>
            <th className="px-2 py-2 text-right font-bold">4s</th>
            <th className="px-2 py-2 text-right font-bold">6s</th>
            <th className="px-4 py-2 text-right font-bold">SR</th>
          </tr>
        </thead>
        <tbody>
          {card.batters
            .filter((b) => b.balls > 0 || b.runs > 0 || b.out)
            .map((b, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-4 py-2">
                  <Link
                    to="/players/$name"
                    params={{ name: b.name }}
                    className="hover:text-primary"
                  >
                    {b.name}
                  </Link>{" "}
                  <span className="text-xs text-muted-foreground">
                    {b.out ? "out" : "not out"}
                  </span>
                </td>
                <td className="px-2 py-2 text-right font-bold">{b.runs}</td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {b.balls}
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {b.fours}
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {b.sixes}
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground">
                  {strikeRate(b.runs, b.balls)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <table className="w-full border-t border-border text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 font-bold">Bowler</th>
            <th className="px-2 py-2 text-right font-bold">O</th>
            <th className="px-2 py-2 text-right font-bold">R</th>
            <th className="px-2 py-2 text-right font-bold">W</th>
            <th className="px-4 py-2 text-right font-bold">Econ</th>
          </tr>
        </thead>
        <tbody>
          {card.bowlers
            .filter((b) => b.balls > 0)
            .map((b, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-4 py-2">
                  <Link
                    to="/players/$name"
                    params={{ name: b.name }}
                    className="hover:text-primary"
                  >
                    {b.name}
                  </Link>
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {oversText(b.balls)}
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {b.runs}
                </td>
                <td className="px-2 py-2 text-right font-bold">{b.wickets}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">
                  {economy(b.runs, b.balls)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  );
}


function LineupEditor({
  match,
  onSaved,
}: {
  match: SavedMatch;
  onSaved: (m: SavedMatch) => void;
}) {
  const names = Array.from(
    new Set(
      match.innings.flatMap((i) => [
        ...i.batters.map((b) => b.name),
        ...i.bowlers.map((b) => b.name),
      ]),
    ),
  ).filter((n) => n && n.trim());

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const start = () => {
    setDraft(Object.fromEntries(names.map((n) => [n, n])));
    setOpen(true);
  };

  const save = () => {
    try {
      const updated = editMatchLineup(match.id, draft);
      if (!updated) throw new Error("missing");
      rebuildStatsFromMatches();
      onSaved(updated);
      setOpen(false);
      toast.success("Lineup updated");
    } catch {
      toast.error("Lineup save nahi ho paya");
    }
  };

  if (names.length === 0) return null;

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-bold">Lineup</h2>
        {!open ? (
          <button
            type="button"
            onClick={start}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition-colors hover:border-primary hover:text-primary"
          >
            <Pencil className="size-3.5" /> Edit lineup
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
            >
              Save lineup
            </button>
          </div>
        )}
      </div>

      {open ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {names.map((n) => (
            <label key={n} className="block">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {n}
              </span>
              <input
                value={draft[n] ?? n}
                onChange={(e) => setDraft((d) => ({ ...d, [n]: e.target.value }))}
                aria-label={`Edit name for ${n}`}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {names.map((n) => (
            <span key={n} className="rounded-full bg-secondary px-2.5 py-1">
              {n}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
