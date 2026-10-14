# CricMaster live-match safety improvements

## Goal
Prevent an in-progress score from being lost through refresh, accidental navigation, or an unintended reset.

## Work
- Save the active match setup and scoring state locally as scoring changes, and offer a clear resume/recovery path after reload.
- Warn before leaving an active match; allow users to continue scoring or confirm leaving.
- Require confirmation before starting a new match from the scoreboard.
- Clear recovery data only after a match is successfully saved or the user explicitly confirms abandoning it.
- Verify the recovery, scoring, and reset flows in the running preview.

## Technical details
- Keep this client-side and use the existing match state and confirmation patterns; no database or schema changes.
- Record the active-match recovery convention in the root `AGENTS.md`.
