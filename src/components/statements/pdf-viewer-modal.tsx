"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePdfUrl } from "@/lib/hooks/use-pdf-url";

// Dynamic import — SSR disabled — required for react-pdf (uses canvas + browser APIs)
// The inner component contains the worker config and must NOT be SSR'd.
const PdfViewerInner = dynamic(
  () =>
    import("./pdf-viewer-inner").then((m) => ({ default: m.PdfViewerInner })),
  {
    ssr: false,
    loading: () => (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading viewer...
      </div>
    ),
  }
);

interface PdfViewerModalProps {
  /** Statement UUID — used to fetch the signed URL */
  statementId: string;
  /** Original filename — shown in dialog title and used for download */
  filename: string;
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the user closes the dialog */
  onClose: () => void;
}

/**
 * Modal PDF viewer.
 *
 * Wraps PdfViewerInner in a shadcn Dialog with:
 * - Loading state while signed URL is being fetched
 * - Error state if URL fetch fails
 * - Render error fallback (download link) if PDF cannot be rendered in-app
 *
 * The signed URL is fetched lazily — only when the modal opens.
 * Uses a single API call that returns both a viewing URL and a download URL.
 */
export function PdfViewerModal({
  statementId,
  filename,
  open,
  onClose,
}: PdfViewerModalProps) {
  // Reset render error when modal re-opens
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    if (open) {
      setRenderError(false);
    }
  }, [open]);

  // Lazy fetch — only runs when modal is open
  const { data, isLoading, error } = usePdfUrl(statementId, open);
  const signedUrl = data?.url;
  const downloadUrl = data?.downloadUrl;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{filename}</DialogTitle>
        </DialogHeader>

        {/* Loading state — fetching signed URL */}
        {isLoading && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Preparing PDF...
          </div>
        )}

        {/* Error state — could not fetch signed URL */}
        {!isLoading && (error || !signedUrl) && (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Could not load PDF for viewing.
            </p>
          </div>
        )}

        {/* Render error fallback — PDF URL fetched successfully but react-pdf couldn't render it */}
        {signedUrl && renderError && (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              This PDF could not be rendered in-app.
            </p>
            <a
              href={downloadUrl ?? signedUrl}
              download={filename}
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Download PDF instead
            </a>
          </div>
        )}

        {/* Main viewer — shown when URL is ready and no render error */}
        {signedUrl && !renderError && (
          <PdfViewerInner
            url={signedUrl}
            downloadUrl={downloadUrl}
            filename={filename}
            onError={() => setRenderError(true)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
