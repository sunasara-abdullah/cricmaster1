/** "Load more" pagination footer for long lists. */
export function LoadMore({
  shown,
  total,
  onMore,
  noun = "items",
}: {
  shown: number;
  total: number;
  onMore: () => void;
  noun?: string;
}) {
  if (total === 0) return null;
  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <p className="text-xs text-muted-foreground">
        Showing {shown} of {total} {noun}
      </p>
      {shown < total && (
        <button
          type="button"
          onClick={onMore}
          className="rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-bold transition-colors hover:border-primary"
        >
          Load more
        </button>
      )}
    </div>
  );
}
