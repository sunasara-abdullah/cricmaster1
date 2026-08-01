import { Link } from "@tanstack/react-router";
import { ChevronRight, ArrowLeft } from "lucide-react";

export type Crumb = { label: string; to?: string };

/** Back link + breadcrumb trail for deep pages. */
export function Breadcrumbs({
  items,
  backTo,
  backLabel = "Back",
}: {
  items: Crumb[];
  backTo: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {backLabel}
      </Link>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <li>
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          {items.map((c) => (
            <li key={c.label} className="flex items-center gap-1">
              <ChevronRight className="size-3" aria-hidden />
              {c.to ? (
                <Link to={c.to} className="hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
