"use client";

import { useState } from "react";
import { useVaultCoverage } from "@/lib/hooks/use-vault-coverage";
import { CoverageGrid } from "@/components/vault/coverage-grid";
import { HistoricalUploadModal } from "@/components/vault/historical-upload-modal";
import { PdfViewerModal } from "@/components/statements/pdf-viewer-modal";
import { Skeleton } from "@/components/ui/skeleton";
import type { CoverageCellClickInfo } from "@/components/vault/coverage-grid";

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

/**
 * Coverage tab content component.
 *
 * Orchestrates the coverage heat map grid, the historical upload wizard modal,
 * and the PDF viewer modal. Cell click dispatch:
 * - missing (gray) → HistoricalUploadModal in "missing" mode
 * - data (yellow)  → HistoricalUploadModal in "attach" mode
 * - pdf (green)    → PdfViewerModal
 *
 * Gap count header shows an amber banner when there are months missing PDFs.
 */
export function CoverageView() {
  const { data, isLoading } = useVaultCoverage();

  const [uploadModal, setUploadModal] = useState<UploadModalState | null>(null);
  const [pdfViewer, setPdfViewer] = useState<PdfViewerState | null>(null);

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

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  const sources = data?.sources ?? [];
  const months = data?.months ?? [];
  const gapCount = data?.gapCount ?? 0;

  return (
    <div className="space-y-4 pt-4">
      {/* Gap count amber banner — only shown when gaps exist */}
      {gapCount > 0 && (
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 px-4 py-2">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-medium">{gapCount}</span>{" "}
            {gapCount === 1 ? "month is" : "months are"} missing PDFs
          </p>
        </div>
      )}

      {/* Coverage heat map grid */}
      <CoverageGrid
        sources={sources}
        months={months}
        onCellClick={handleCellClick}
      />

      {/* Historical upload wizard modal — rendered when a gray or yellow cell is clicked */}
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

      {/* PDF viewer modal — only rendered when a green cell is clicked (hasPdf pattern) */}
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
