import { useEffect, useState } from "react";
import { seedDemoData, clearAllData, isDemoSeeded } from "@/lib/demoData";

/**
 * Renders inside an empty-state card. Shows a "Load Sample Data" button so a
 * fresh user can see the app populated, and a "Clear demo data" button when
 * demo data has been seeded.
 */
export function DemoDataButtons({ compact = false }: { compact?: boolean }) {
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    setSeeded(isDemoSeeded());
    const sync = () => setSeeded(isDemoSeeded());
    window.addEventListener("cricmaster:matches-updated", sync);
    window.addEventListener("cricmaster:teams-updated", sync);
    return () => {
      window.removeEventListener("cricmaster:matches-updated", sync);
      window.removeEventListener("cricmaster:teams-updated", sync);
    };
  }, []);

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2 ${
        compact ? "" : "mt-4"
      }`}
    >
      <button
        type="button"
        onClick={() => seedDemoData()}
        className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/20"
      >
        ⚡ Load Sample Data
      </button>
      {seeded && (
        <button
          type="button"
          onClick={() => {
            if (confirm("Clear all demo data? This removes sample teams, matches and leagues.")) {
              clearAllData();
            }
          }}
          className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive"
        >
          Clear demo data
        </button>
      )}
    </div>
  );
}