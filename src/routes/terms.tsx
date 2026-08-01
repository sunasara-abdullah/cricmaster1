import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/cricmaster/Navbar";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — CricMaster" },
      {
        name: "description",
        content:
          "The terms that govern your use of CricMaster accounts, cricket scoring data and shared live match links.",
      },
      { property: "og:title", content: "Terms of Service — CricMaster" },
      { property: "og:description", content: "Rules for using CricMaster accounts and scoring data." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cricmaster1.lovable.app/terms" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://cricmaster1.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-heading text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().getFullYear()}. This page is maintained by the CricMaster
          team and describes how the app may be used.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">1. Using CricMaster</h2>
            <p className="mt-2">
              CricMaster lets you score cricket matches, keep player and team records and run
              leagues. You may use it for personal, club or tournament purposes. You are
              responsible for the accuracy of the scores and player details you enter.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">2. Accounts</h2>
            <p className="mt-2">
              An account is optional — you can score locally without one. If you create an
              account, keep your password confidential and let us know if you believe it has
              been compromised. You must provide an email address you control.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">3. Your content</h2>
            <p className="mt-2">
              Match data, team names, squads and photos you upload remain yours. You grant us
              permission to store and display that content back to you, and to anyone you
              deliberately share a live match link with. Do not upload content you do not have
              the right to share, or anything unlawful or offensive.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">4. Shared live links</h2>
            <p className="mt-2">
              When you publish a live match link, the scoreboard for that match becomes
              viewable by anyone holding the link. Only share it when you are happy for the
              match details to be public.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">5. Availability</h2>
            <p className="mt-2">
              We work to keep CricMaster running, but the service is provided "as is" without
              guarantees of uninterrupted availability. Keep your own record of anything
              critical, such as official tournament results.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">6. Ending use</h2>
            <p className="mt-2">
              You can stop using CricMaster at any time and delete your matches and account
              data from the settings page. We may suspend accounts that abuse the service or
              other users.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">7. Contact</h2>
            <p className="mt-2">
              Questions about these terms? Reach us via the{" "}
              <Link to="/contact" className="text-primary hover:underline">contact page</Link>. See also our{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
