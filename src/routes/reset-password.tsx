import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import markUrl from "@/assets/cricmaster-mark.png";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — CricMaster" },
      {
        name: "description",
        content: "Set a new password for your CricMaster account.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Wait for Supabase to pick up the recovery token from the URL hash and
  // establish a temporary session (fires PASSWORD_RECOVERY / SIGNED_IN).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password kam se kam 6 characters ka hona chahiye.");
      return;
    }
    if (password !== confirm) {
      setError("Dono passwords match nahi ho rahe.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/career" }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update fail hua");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={markUrl} alt="CricMaster" className="h-10 w-auto" />
          <span className="font-heading text-2xl font-bold tracking-tighter">
            <span className="text-foreground">Cric</span>
            <span className="text-primary">Master</span>
          </span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
          <h1 className="font-heading text-2xl font-bold">Set new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Naya password enter karein.
          </p>
          {!ready ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Reset link verify ho raha hai… agar 5 second mein kuch nahi hota
              toh email se link dobara open karein.
            </p>
          ) : done ? (
            <p className="mt-6 text-sm font-medium text-primary">
              ✓ Password update ho gaya! Redirect ho rahe hain…
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  New password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {busy ? "Please wait…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}