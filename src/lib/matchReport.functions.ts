import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runMatchReport } from "./ai/gateway.server";

const inningsSchema = z.object({
  battingTeam: z.string(),
  bowlingTeam: z.string(),
  runs: z.number(),
  wickets: z.number(),
  balls: z.number(),
  batters: z.array(
    z.object({
      name: z.string(),
      runs: z.number(),
      balls: z.number(),
      fours: z.number(),
      sixes: z.number(),
      out: z.boolean(),
      how: z.string().optional(),
    }),
  ),
  bowlers: z.array(
    z.object({
      name: z.string(),
      balls: z.number(),
      runs: z.number(),
      wickets: z.number(),
    }),
  ),
  extras: z
    .object({ wd: z.number(), nb: z.number(), b: z.number(), lb: z.number() })
    .optional(),
});

const inputSchema = z.object({
  match: z.object({
    teamA: z.string(),
    teamB: z.string(),
    overs: z.number(),
    venue: z.string(),
    date: z.string(),
    toss: z.string(),
    result: z.string(),
    winner: z.string(),
    manOfTheMatch: z.string(),
    innings: z.array(inningsSchema),
  }),
});

/**
 * Generates a shareable AI match report from a saved match's scorecard.
 * Requires a signed-in user; the caller passes the match data it already has.
 */
export const generateMatchReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => runMatchReport(data.match));
