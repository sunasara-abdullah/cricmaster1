/**
 * Server-only helpers for Lovable AI Gateway calls (OpenAI Responses endpoint).
 * Copied from the ai-apps-gateway-sdk run-id helper; adapted to local imports.
 * Never import this file from client code (the .server.ts filename keeps it
 * out of client bundles).
 */

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (value: string | undefined) => void = () => {};
  let runIdResolved = false;
  const runIdReady = new Promise<string | undefined>((resolve) => {
    resolveRunId = resolve;
  });

  const publishRunId = (value?: string) => {
    const nextRunId = value?.trim() || undefined;
    if (!runId && nextRunId) {
      runId = nextRunId;
    }
    if (!runIdResolved) {
      runIdResolved = true;
      resolveRunId(runId);
    }
  };
  if (runId) publishRunId(runId);

  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }

      try {
        const response = await fetch(input, { ...init, headers });
        publishRunId(response.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined);
        return response;
      } catch (error) {
        publishRunId(undefined);
        throw error;
      }
    },
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : runIdReady),
  };
}

export const LOVABLE_AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

export type GatewayCallResult =
  | { ok: true; content: string }
  | { ok: false; message: string; retryable?: boolean };

/** Maps a gateway failure to a safe, user-facing message (error semantics). */
function safeErrorMessage(error: unknown): { message: string; retryable?: boolean } {
  const err = error as { statusCode?: number; responseBody?: string; message?: string };
  const status = typeof err?.statusCode === "number" ? err.statusCode : undefined;
  let upstreamMessage = err?.message ?? "The AI service returned an error.";
  try {
    if (err?.responseBody) {
      const body = JSON.parse(err.responseBody) as { message?: string; error?: { message?: string } };
      upstreamMessage = body.message ?? body.error?.message ?? upstreamMessage;
    }
  } catch {
    /* keep err.message */
  }
  const safe = String(upstreamMessage).slice(0, 300);

  if (status === 402) return { message: safe || "AI credits are exhausted. Top up credits to keep generating reports.", retryable: false };
  if (status === 401 || status === 403)
    return { message: safe || "AI report generation is not available right now.", retryable: false };
  if (status === 400)
    return { message: safe || "The report request could not be processed. Try regenerating.", retryable: false };
  if (status === 429 || (status && status >= 500))
    return { message: safe || "The AI service is busy. Try again in a few moments.", retryable: true };
  return { message: safe || "Something went wrong while generating the report.", retryable: true };
}

type MatchReportMatch = {
  teamA: string;
  teamB: string;
  overs: number;
  venue: string;
  date: string;
  toss: string;
  result: string;
  winner: string;
  manOfTheMatch: string;
  innings: Array<{
    battingTeam: string;
    bowlingTeam: string;
    runs: number;
    wickets: number;
    balls: number;
    batters: Array<{ name: string; runs: number; balls: number; fours: number; sixes: number; out: boolean; how?: string }>;
    bowlers: Array<{ name: string; balls: number; runs: number; wickets: number }>;
    extras?: { wd: number; nb: number; b: number; lb: number };
  }>;
};

const INSTRUCTIONS = `You are a professional cricket journalist. Write a shareable match report from the raw scorecard data provided.
Rules:
- Write in engaging, factual sports-journalism English. Never invent facts that are not in the data; if something is missing (e.g. a turning point), describe only what the numbers show.
- Structure: one headline line, then 3-5 short paragraphs covering: the result and how it unfolded; the standout batting performances (with figures); the standout bowling spells; how the match was won or lost.
- Close with a one-line "Player of the Match" style verdict using the man of the match if provided.
- Plain text only: no markdown syntax, no bullet lists, no tables. Use plain paragraphs.
- Keep the whole report between 300 and 450 words.`;

export async function runMatchReport(match: MatchReportMatch): Promise<GatewayCallResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return { ok: false, message: "AI is not configured on the server yet.", retryable: false };
  }

  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText } = await import("ai");
  const runIdFetch = createLovableAiGatewayRunIdFetch();

  const provider = createOpenAI({
    baseURL: LOVABLE_AI_GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const summary = {
    match: `${match.teamA} vs ${match.teamB}`,
    format: `${match.overs} overs per side`,
    venue: match.venue,
    date: match.date,
    toss: match.toss,
    result: match.result,
    winner: match.winner,
    man_of_the_match: match.manOfTheMatch,
    innings: match.innings.map((inn) => ({
      batting_team: inn.battingTeam,
      bowling_team: inn.bowlingTeam,
      score: `${inn.runs}/${inn.wickets} in ${Math.floor(inn.balls / 6)}.${inn.balls % 6} overs`,
      batters: inn.batters.map((b) => ({
        name: b.name,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        dismissal: b.out ? b.how ?? "out" : "not out",
      })),
      bowlers: inn.bowlers.map((b) => ({
        name: b.name,
        overs: `${Math.floor(b.balls / 6)}.${b.balls % 6}`,
        runs_conceded: b.runs,
        wickets: b.wickets,
      })),
      extras: inn.extras,
    })),
  };

  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: INSTRUCTIONS,
      messages: [
        {
          role: "user",
          content: `Write the match report for this scorecard:\n\n${JSON.stringify(summary, null, 2)}`,
        },
      ],
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const text = await result.text;
    if (!text.trim()) {
      return { ok: false, message: "The AI returned an empty report. Try regenerating.", retryable: true };
    }
    return { ok: true, content: text.trim() };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, message: "Report generation was cancelled.", retryable: true };
    }
    const { message, retryable } = safeErrorMessage(error);
    return { ok: false, message, retryable };
  }
}
