"use client";

import { useState, useMemo } from "react";
import { format, subMonths, startOfMonth, startOfYear } from "date-fns";
import { useVaultCoverage } from "@/lib/hooks/use-vault-coverage";
import type { CoverageDateRange } from "@/lib/hooks/use-vault-coverage";
import { CoverageGrid } from "@/components/vault/coverage-grid";
import { CoverageDateToolbar } from "@/components/vault/coverage-date-toolbar";
import { HistoricalUploadModal } from "@/components/vault/historical-upload-modal";
import { PdfViewerModal } from "@/components/statements/pdf-viewer-modal";
import { Skeleton } from "@/components/ui/skeleton";
import type { CoverageCellClickInfo } from "@/components/vault/coverage-grid";

export type CoveragePreset = "12m" | "this-year" | "last-year" | "all";

interface UploadModalState {
  open: boolean;
  sourceType: string;
  month: string;
  mode: "missing" | "attach";
  statementId?: string;
}

interface PdfViewerState {
  open: boolean;
  statementId: string;
  filename: string;
}

/** Compute from/to for a preset. "all" needs the actual data range. */
function presetToRange(
  preset: CoveragePreset,
  allEarliest?: string | null,
  allLatest?: string | null,
): CoverageDateRange {
  const now = new Date();

  switch (preset) {
    case "12m":
      return {
        from: format(startOfMonth(subMonths(now, 11)), "yyyy-MM"),
        to: format(startOfMonth(now), "yyyy-MM"),
      };
    case "this-year":
      return {
        from: format(startOfYear(now), "yyyy-MM"),
        to: format(startOfMonth(now), "yyyy-MM"),
      };
    case "last-year": {
      const lastYear = now.getFullYear() - 1;
      return {
        from: `${lastYear}-01`,
        to: `${lastYear}-12`,
      };
    }
    case "all": {
      // Fall back to last 12 months if no data range known yet
      const fallbackFrom = format(startOfMonth(subMonths(now, 11)), "yyyy-MM");
      const fallbackTo = format(startOfMonth(now), "yyyy-MM");
      return {
        from: allEarliest ?? fallbackFrom,
        to: allLatest ?? fallbackTo,
      };
    }
  }
}

/**
 * Coverage tab content component.
 *
 * Orchestrates the date range toolbar, scrollable coverage heat map grid,
 * the historical upload wizard modal, and the PDF viewer modal.
 */
export function CoverageView() {
  const [preset, setPreset] = useState<CoveragePreset>("12m");
  const [customRange, setCustomRange] = useState<CoverageDateRange | null>(null);

  // First fetch with default range to discover the global date extent
  const defaultRange = useMemo(() => presetToRange("12m"), []);
  const { data: initialData } = useVaultCoverage(defaultRange);
  const globalDateRange = initialData?.dateRange;

  // Compute the active range
  const activeRange = useMemo(() => {
    if (customRange) return customRange;
    return presetToRange(preset, globalDateRange?.earliest, globalDateRange?.latest);
  }, [preset, customRange, globalDateRange]);

  // Fetch coverage for the active range
  const { data, isLoading } = useVaultCoverage(activeRange);

  const [uploadModal, setUploadModal] = useState<UploadModalState | null>(null);
  const [pdfViewer, setPdfViewer] = useState<PdfViewerState | null>(null);

  function handlePresetChange(newPreset: CoveragePreset) {
    setPreset(newPreset);
    setCustomRange(null);
  }

  function handleCustomRangeChange(range: CoverageDateRange) {
    setCustomRange(range);
    setPreset("12m"); // Deselect presets when custom range is set
  }

  function handleCellClick(info: CoverageCellClickInfo) {
    if (info.state === "missing") {
      setUploadModal({
        open: true,
        sourceType: info.sourceType,
        month: info.month,
        mode: "missing",
        statementId: undefined,
      });
    } else if (info.state === "data") {
      setUploadModal({
        open: true,
        sourceType: info.sourceType,
        month: info.month,
        mode: "attach",
        statementId: info.statementId ?? undefined,
      });
    } else if (info.state === "pdf" && info.statementId) {
      setPdfViewer({
        open: true,
        statementId: info.statementId,
        filename: `${info.sourceType} - ${info.month}.pdf`,
      });
    }
  }

  const sources = data?.sources ?? [];
  const months = data?.months ?? [];
  const gapCount = data?.gapCount ?? 0;

  return (
    <div className="space-y-4 pt-4">
      {/* Date range toolbar */}
      <CoverageDateToolbar
        preset={customRange ? null : preset}
        range={activeRange}
        onPresetChange={handlePresetChange}
        onRangeChange={handleCustomRangeChange}
      />

      {/* Gap count amber banner — only shown when gaps exist */}
      {gapCount > 0 && !isLoading && (
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 px-4 py-2">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-medium">{gapCount}</span>{" "}
            {gapCount === 1 ? "month is" : "months are"} missing PDFs
          </p>
        </div>
      )}

      {/* Coverage heat map grid */}
      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <CoverageGrid
          sources={sources}
          months={months}
          onCellClick={handleCellClick}
        />
      )}

      {/* Historical upload wizard modal */}
      {uploadModal && (
        <HistoricalUploadModal
          open={uploadModal.open}
          onClose={() => setUploadModal(null)}
          sourceType={uploadModal.sourceType}
          targetMonth={uploadModal.month}
          mode={uploadModal.mode}
          statementId={uploadModal.statementId}
        />
      )}

      {/* PDF viewer modal */}
      {pdfViewer && pdfViewer.open && (
        <PdfViewerModal
          open={pdfViewer.open}
          onClose={() => setPdfViewer(null)}
          statementId={pdfViewer.statementId}
          filename={pdfViewer.filename}
        />
      )}
    </div>
  );
}
