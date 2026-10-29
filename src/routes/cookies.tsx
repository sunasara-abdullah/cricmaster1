import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/cricmaster/Navbar";
import { resetCookieConsent } from "@/components/cricmaster/CookieConsent";
import { toast } from "sonner";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Playnivo" },
      {
        name: "description",
        content:
          "How Playnivo uses cookies and local device storage for your matches, sign-in session and preferences — and how to change your choice.",
      },
      { property: "og:title", content: "Cookie Policy — Playnivo" },
      { property: "og:description", content: "What Playnivo stores on your device and why." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://playnivo.lovable.app/cookies" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://playnivo.lovable.app/cookies" }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-heading text-4xl font-bold tracking-tight">Cookie Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().getFullYear()}. This page explains what Playnivo keeps on
          your device and how to change your choice.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">Do we use cookies?</h2>
            <p className="mt-2">
              We use no advertising, tracking or third-party marketing cookies. Playnivo keeps
              everything you need for scoring in your browser's local storage on your device,
              plus the small browser storage your sign-in session needs.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">
              What is stored on your device
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Your matches, teams, leagues and computed player statistics.</li>
              <li>Your sign-in session, so you stay logged in between visits.</li>
              <li>Your preferences, such as the sidebar state and cookie choice.</li>
            </ul>
            <p className="mt-2">
              When you sign in, this data is also stored in our managed cloud database so it
              follows you across devices — see the{" "}
              <Link to="/privacy" className="text-primary hover:underline">privacy policy</Link>.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">Your choice</h2>
            <p className="mt-2">
              The first time you visit, you can accept or reject optional storage. Rejecting it
              keeps only what the app strictly needs to run (your sign-in session and live
              scoring state while you are on the page). Choosing either way does not change the
              features you can use.
            </p>
            <button
              onClick={() => {
                resetCookieConsent();
                toast.success("Cookie choice cleared — the banner will show again.");
              }}
              className="mt-3 rounded-xl border border-input bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Change cookie choice
            </button>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">Clearing everything</h2>
            <p className="mt-2">
              Signing out clears Playnivo's local data from that browser. You can also clear
              browser storage yourself from your browser settings at any time.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">Contact</h2>
            <p className="mt-2">
              Questions about cookies or data? Use the{" "}
              <Link to="/contact" className="text-primary hover:underline">contact page</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
