"use client";

interface VaultStatsBarProps {
  totalSources: number;
  totalStatements: number;
  totalPdfs: number;
}

/**
 * Horizontal stats strip showing aggregate vault counts.
 * Rendered above the tab bar when the user has statements.
 */
export function VaultStatsBar({
  totalSources,
  totalStatements,
  totalPdfs,
}: VaultStatsBarProps) {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-2 mb-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{totalSources}</span>{" "}
        {totalSources === 1 ? "source" : "sources"}
        {" · "}
        <span className="font-medium text-foreground">{totalStatements}</span>{" "}
        {totalStatements === 1 ? "statement" : "statements"}
        {" · "}
        <span className="font-medium text-foreground">{totalPdfs}</span>{" "}
        PDFs stored
      </p>
    </div>
  );
}
