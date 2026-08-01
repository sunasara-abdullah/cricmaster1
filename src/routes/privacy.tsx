import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/cricmaster/Navbar";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CricMaster" },
      {
        name: "description",
        content:
          "How CricMaster collects, stores and protects your account details, match data and player statistics.",
      },
      { property: "og:title", content: "Privacy Policy — CricMaster" },
      { property: "og:description", content: "What data CricMaster stores and how it is used." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cricmaster1.lovable.app/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://cricmaster1.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-heading text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().getFullYear()}. This page is maintained by the CricMaster
          team and explains what we store and why.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">What we collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Account details: your email address, display name and optional profile photo.</li>
              <li>Cricket data you enter: matches, scorecards, player names, teams and leagues.</li>
              <li>Live share snapshots for matches you choose to publish via a link.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">Where it is stored</h2>
            <p className="mt-2">
              Without an account, your data stays in your browser's local storage on that
              device only. When you sign in, your matches, teams and leagues are also stored
              in our managed cloud database so they follow you across devices. Access rules
              restrict your records to your own signed-in account.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">How we use it</h2>
            <p className="mt-2">
              Only to run the app: showing your scorecards, computing career statistics and
              league standings, and syncing your data between devices. We do not sell your
              data or use it for advertising.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">Publicly shared matches</h2>
            <p className="mt-2">
              A live match link you create is readable by anyone with that link, including the
              team names, player names and running score for that match. Delete the live match
              from the app to stop sharing it.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">Your choices</h2>
            <p className="mt-2">
              You can edit your name and photo, delete individual matches, clear all local data
              from the app, sign out of all devices, or contact us to have your account data
              removed. Signing out also clears CricMaster data stored in your browser.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">Contact</h2>
            <p className="mt-2">
              Privacy question or a deletion request? Use the{" "}
              <Link to="/contact" className="text-primary hover:underline">contact page</Link>. Our{" "}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> explain the rest.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
