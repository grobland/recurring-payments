"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { CoverageSource } from "@/lib/hooks/use-vault-coverage";

export interface CoverageCellClickInfo {
  sourceType: string;
  month: string;
  state: "pdf" | "data" | "missing";
  statementId: string | null;
}

interface CoverageGridProps {
  sources: CoverageSource[];
  months: string[];
  onCellClick: (info: CoverageCellClickInfo) => void;
}

function cellColorClass(state: "pdf" | "data" | "missing"): string {
  if (state === "pdf") return "bg-green-500/80 hover:bg-green-500";
  if (state === "data") return "bg-yellow-400/80 hover:bg-yellow-400";
  return "bg-muted/40 hover:bg-muted/60";
}

function cellAriaLabel(
  sourceType: string,
  month: string,
  state: "pdf" | "data" | "missing"
): string {
  const monthFormatted = format(parseISO(month + "-01"), "MMM yyyy");
  if (state === "pdf") return `${sourceType} - ${monthFormatted}: PDF stored`;
  if (state === "data") return `${sourceType} - ${monthFormatted}: Data only, no PDF`;
  return `${sourceType} - ${monthFormatted}: Missing, click to upload`;
}

function TooltipBody({
  state,
  statementDate,
  transactionCount,
}: {
  state: "pdf" | "data" | "missing";
  statementDate: string | null;
  transactionCount: number;
}) {
  if (state === "missing") {
    return <span>No data — click to upload</span>;
  }
  const dateLabel = statementDate
    ? format(parseISO(statementDate), "MMM d, yyyy")
    : "Unknown date";
  if (state === "pdf") {
    return (
      <div className="space-y-0.5">
        <div>PDF stored</div>
        <div>{dateLabel}</div>
        <div>{transactionCount} transactions</div>
      </div>
    );
  }
  return (
    <div className="space-y-0.5">
      <div>Data only — no PDF</div>
      <div>{dateLabel}</div>
      <div>{transactionCount} transactions</div>
    </div>
  );
}

/**
 * GitHub-style heat map grid showing PDF coverage per source per month.
 *
 * Layout: first column is source names, then 12 month columns.
 * Cells are colored green (PDF stored), yellow (data only), or gray (missing).
 * Each cell is interactive — clicking opens the appropriate action.
 */
export function CoverageGrid({ sources, months, onCellClick }: CoverageGridProps) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No sources to display in coverage grid.
      </p>
    );
  }

  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <div className="w-full overflow-x-auto">
        {/* Grid container */}
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `minmax(80px, 120px) repeat(${months.length}, minmax(0, 1fr))`,
          }}
          role="grid"
        >
          {/* Header row: empty corner + month labels */}
          <div role="row" className="contents">
            <div aria-hidden="true" />
            {months.map((month) => (
              <div
                key={month}
                className="text-xs text-center text-muted-foreground pb-1"
                role="columnheader"
              >
                {format(parseISO(month + "-01"), "MMM")}
              </div>
            ))}
          </div>

          {/* Source rows */}
          {sources.map((source) => (
            <div key={source.sourceType} role="row" className="contents">
              {/* Source name cell */}
              <div
                className="text-sm font-medium truncate max-w-[120px] flex items-center pr-2"
                title={source.sourceType}
              >
                {source.sourceType}
              </div>

              {/* Month cells */}
              {source.cells.map((cell) => (
                <TooltipPrimitive.Root key={cell.month}>
                  <TooltipPrimitive.Trigger asChild>
                    <button
                      className={cn(
                        "min-w-7 min-h-7 rounded-sm cursor-pointer transition-colors",
                        cellColorClass(cell.state)
                      )}
                      onClick={() =>
                        onCellClick({
                          sourceType: source.sourceType,
                          month: cell.month,
                          state: cell.state,
                          statementId: cell.statementId,
                        })
                      }
                      aria-label={cellAriaLabel(source.sourceType, cell.month, cell.state)}
                      role="gridcell"
                    />
                  </TooltipPrimitive.Trigger>
                  <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                      sideOffset={4}
                      className={cn(
                        "bg-foreground text-background animate-in fade-in-0 zoom-in-95",
                        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                        "z-50 rounded-md px-3 py-1.5 text-xs"
                      )}
                    >
                      <TooltipBody
                        state={cell.state}
                        statementDate={cell.statementDate}
                        transactionCount={cell.transactionCount}
                      />
                      <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
                    </TooltipPrimitive.Content>
                  </TooltipPrimitive.Portal>
                </TooltipPrimitive.Root>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-500/80" />
          PDF stored
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-yellow-400/80" />
          Data only
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-muted/40 border" />
          Missing
        </div>
      </div>
    </TooltipPrimitive.Provider>
  );
}
