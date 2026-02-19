"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// CRITICAL: Worker config MUST be in the same file as <Document>
// Placing this in a separate file causes "Setting up fake worker" and blank renders.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfViewerInnerProps {
  /** Signed URL for in-browser PDF rendering */
  url: string;
  /** Signed URL with Content-Disposition: attachment (for download) */
  downloadUrl?: string;
  /** Original filename (used for download attribute) */
  filename: string;
  /** Called when the PDF fails to load/render */
  onError?: () => void;
}

/**
 * Inner PDF viewer component.
 *
 * Contains react-pdf Document/Page and the worker configuration.
 * MUST be loaded via dynamic import with ssr: false from the outer modal wrapper.
 * Never import this file directly in a Server Component.
 */
export function PdfViewerInner({
  url,
  downloadUrl,
  filename,
  onError,
}: PdfViewerInnerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total);
      setPageNumber(1);
    },
    []
  );

  const onDocumentLoadError = useCallback(() => {
    onError?.();
  }, [onError]);

  const goToPrevPage = useCallback(() => {
    setPageNumber((p) => Math.max(1, p - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber((p) => Math.min(numPages, p + 1));
  }, [numPages]);

  // Responsive width: cap at 760px, subtract dialog padding on narrow screens
  const pageWidth =
    typeof window !== "undefined"
      ? Math.min(760, window.innerWidth - 80)
      : 760;

  // Download URL: prefer the dedicated download URL (has Content-Disposition: attachment)
  // Fall back to view URL if download URL not available
  const effectiveDownloadUrl = downloadUrl ?? url;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* PDF Document */}
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading PDF...
          </div>
        }
      >
        <Page
          pageNumber={pageNumber}
          width={pageWidth}
          renderTextLayer={true}
          renderAnnotationLayer={true}
        />
      </Document>

      {/* Page navigation — only shown when document has multiple pages */}
      {numPages > 1 && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pageNumber} of {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Download button — anchor styled to match shadcn outline button */}
      <a
        href={effectiveDownloadUrl}
        download={filename}
        className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
      >
        <Download className="size-4" />
        Download PDF
      </a>
    </div>
  );
}
