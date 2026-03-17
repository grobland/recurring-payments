"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

// ── Cell styling ──────────────────────────────────────────────

function cellColorClass(state: "pdf" | "data" | "missing"): string {
  if (state === "pdf") return "bg-green-500/80 hover:bg-green-500";
  if (state === "data") return "bg-amber-400/80 hover:bg-amber-400";
  return "bg-muted/40 hover:bg-muted/60";
}

function cellAriaLabel(
  sourceType: string,
  month: string,
  state: "pdf" | "data" | "missing",
): string {
  const monthFormatted = format(parseISO(month + "-01"), "MMM yyyy");
  if (state === "pdf") return `${sourceType} - ${monthFormatted}: PDF stored`;
  if (state === "data")
    return `${sourceType} - ${monthFormatted}: Data only, no PDF`;
  return `${sourceType} - ${monthFormatted}: Missing, click to upload`;
}

// ── Tooltip body ──────────────────────────────────────────────

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

// ── Month header formatting ──────────────────────────────────

function formatMonthHeader(yyyyMM: string): { short: string; year: string } {
  const d = parseISO(yyyyMM + "-01");
  return {
    short: format(d, "MMM"),     // e.g. "Jan"
    year: format(d, "yy"),       // e.g. "26"
  };
}

// ── Scroll edge detection ────────────────────────────────────

function useScrollEdges(ref: React.RefObject<HTMLDivElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Initial check
    update();

    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref, update]);

  return { canScrollLeft, canScrollRight };
}

// ── Cell size constant ───────────────────────────────────────
// Each month column: min 44px wide so labels fit comfortably
const COL_MIN_W = 44;
const SOURCE_COL_W = 130;

// ── Main component ───────────────────────────────────────────

/**
 * GitHub-style heat map grid showing PDF coverage per source per month.
 *
 * Features:
 * - Horizontal scroll with edge indicators and nav buttons
 * - Month headers show abbreviated month + 2-digit year
 * - Source name column is sticky-left during scroll
 */
export function CoverageGrid({
  sources,
  months,
  onCellClick,
}: CoverageGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight } = useScrollEdges(scrollRef);

  if (sources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No sources to display in coverage grid.
      </p>
    );
  }

  function scrollBy(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const amount = COL_MIN_W * 4; // scroll 4 months at a time
    el.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  }

  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <div className="relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy("left")}
            className={cn(
              "absolute left-0 top-0 bottom-0 z-10 w-8 flex items-center justify-center",
              "bg-gradient-to-r from-background via-background/80 to-transparent",
              "hover:from-muted/60 transition-colors cursor-pointer",
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-4 text-muted-foreground" />
          </button>
        )}

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scrollBy("right")}
            className={cn(
              "absolute right-0 top-0 bottom-0 z-10 w-8 flex items-center justify-center",
              "bg-gradient-to-l from-background via-background/80 to-transparent",
              "hover:from-muted/60 transition-colors cursor-pointer",
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent pb-2"
        >
          {/* Grid */}
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `${SOURCE_COL_W}px repeat(${months.length}, minmax(${COL_MIN_W}px, 1fr))`,
              minWidth:
                months.length > 12
                  ? `${SOURCE_COL_W + months.length * COL_MIN_W}px`
                  : undefined,
            }}
            role="grid"
          >
            {/* Header row */}
            <div role="row" className="contents">
              <div aria-hidden="true" />
              {months.map((month) => {
                const { short, year } = formatMonthHeader(month);
                return (
                  <div
                    key={month}
                    className="text-center pb-1.5 select-none"
                    role="columnheader"
                  >
                    <div className="text-xs font-medium text-foreground/70 leading-tight">
                      {short}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-tight">
                      ʼ{year}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Source rows */}
            {sources.map((source) => (
              <div key={source.sourceType} role="row" className="contents">
                {/* Source name — sticky left */}
                <div
                  className="text-sm font-medium truncate flex items-center pr-2 sticky left-0 bg-background z-[1]"
                  style={{ maxWidth: SOURCE_COL_W }}
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
                          "min-h-7 rounded-sm cursor-pointer transition-colors",
                          cellColorClass(cell.state),
                        )}
                        onClick={() =>
                          onCellClick({
                            sourceType: source.sourceType,
                            month: cell.month,
                            state: cell.state,
                            statementId: cell.statementId,
                          })
                        }
                        aria-label={cellAriaLabel(
                          source.sourceType,
                          cell.month,
                          cell.state,
                        )}
                        role="gridcell"
                      />
                    </TooltipPrimitive.Trigger>
                    <TooltipPrimitive.Portal>
                      <TooltipPrimitive.Content
                        sideOffset={4}
                        className={cn(
                          "bg-foreground text-background animate-in fade-in-0 zoom-in-95",
                          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                          "z-50 rounded-md px-3 py-1.5 text-xs",
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
      </div>

      {/* Legend bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-500/80" />
          PDF stored
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-400/80" />
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
