# Architecture Patterns: PDF Vault Integration

**Domain:** PDF Persistence + In-App Viewer + Dual-View Vault UI
**Researched:** 2026-02-19
**Confidence:** HIGH

## Executive Summary

This document maps how PDF storage (Supabase Storage), an in-app PDF viewer (react-pdf), and a dual-view vault UI (file cabinet + timeline) integrate into the existing subscription manager architecture.

The existing codebase already has `statements.pdfStoragePath` in the schema (migration 0005, currently NULL for all records) and a `// TODO: In future, upload PDF to Supabase Storage here` comment in `/api/batch/upload/route.ts`. This milestone fills that gap and builds the vault UI on top.

**Key architectural decisions:**
- Upload to Supabase Storage happens server-side in the existing `/api/batch/upload` route — file bytes are in memory at that point, avoiding a second upload round-trip
- Storage path pattern: `{userId}/{statementId}.pdf` — user-scoped, no collision possible
- Signed URLs served via a dedicated `/api/statements/[id]/pdf` route — PDFs never served as public URLs
- react-pdf loaded client-side via `dynamic(() => import(...), { ssr: false })` — mandatory because pdf.js requires browser canvas APIs
- Vault UI lives at `/vault` as a new dashboard page with two sub-views: file cabinet (grid) and timeline (chronological list)
- No new database tables needed — `statements.pdfStoragePath` is the only schema change, and it's already in the schema as nullable

---

## Current Architecture Baseline

### Existing Import Flow (Batch)

```
Client hashes PDF file
    |
    v
POST /api/batch/check-hash    <- duplicate check
    |
    v  (if not duplicate)
POST /api/batch/upload        <- creates statements row, pdfStoragePath = NULL
    |
    v
POST /api/batch/process       <- extracts text in-memory, inserts transactions, updates status
    |
    v
statements.processingStatus = "complete", pdfStoragePath still NULL
```

The PDF bytes exist only in Vercel's serverless memory during the `/api/batch/process` call. After the request completes, they are gone. That is the integration point.

### Relevant Existing Tables

**statements** (already exists, migration 0005):
```
id                 uuid PRIMARY KEY
userId             uuid NOT NULL -> users.id
sourceType         varchar(100) NOT NULL       -- "Chase Sapphire"
pdfHash            varchar(64) NOT NULL        -- SHA-256
pdfStoragePath     text                        -- NULL currently, this milestone fills it
originalFilename   varchar(255) NOT NULL
fileSizeBytes      integer NOT NULL
statementDate      timestamp
processingStatus   enum (pending/processing/complete/failed)
processingError    text
transactionCount   integer
createdAt          timestamp
processedAt        timestamp
```

**transactions** (already exists):
```
id               uuid PRIMARY KEY
statementId      uuid NOT NULL -> statements.id
userId           uuid NOT NULL -> users.id
transactionDate  timestamp NOT NULL
merchantName     varchar(255) NOT NULL
amount           decimal
currency         varchar(3)
...
```

### Existing API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/batch/upload` | POST | Creates `statements` row (TODO: upload to storage here) |
| `/api/batch/process` | POST | Parses PDF, inserts transactions, marks complete |
| `/api/batch/check-hash` | POST | Checks `statements.pdfHash` for duplicates |
| `/api/sources` | GET | Returns all source types with coverage stats |
| `/api/sources/[sourceType]/statements` | GET | Lists statements for a source |
| `/api/statements/[id]` | GET | Returns single statement with transaction stats |
| `/api/statements/[id]/transactions` | GET | Returns transactions for a statement |

### Existing UI Pages

| Route | Component | Current State |
|-------|-----------|---------------|
| `/import/batch` | BatchUploader | Upload + process pipeline |
| `/sources` | SourceDashboard | Source coverage grid |
| `/statements/[id]` | StatementDetail | Transaction table + re-import |

---

## Recommended Architecture: PDF Vault Extension

### System Overview

```
┌───────────────────────────────────────────────────────────────┐
│                         CLIENT                                 │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │  Vault Page │   │  PDF Viewer  │   │  BatchUploader     │  │
│  │  /vault     │   │  (react-pdf) │   │  (modified)        │  │
│  └──────┬──────┘   └──────┬───────┘   └──────────┬─────────┘  │
│         │                  │                       │            │
└─────────┼──────────────────┼───────────────────────┼────────────┘
          │                  │                       │
┌─────────┼──────────────────┼───────────────────────┼────────────┐
│         │           API LAYER                       │            │
│  ┌──────▼──────┐   ┌───────▼──────┐   ┌────────────▼─────────┐  │
│  │/api/vault   │   │/api/statements│   │/api/batch/upload     │  │
│  │(list+filter)│   │/[id]/pdf     │   │(MODIFIED: uploads    │  │
│  └──────┬──────┘   └───────┬───────┘   │to Supabase Storage)  │  │
│         │                  │            └──────────┬────────────┘  │
│         │                  │                       │            │
└─────────┼──────────────────┼───────────────────────┼────────────┘
          │                  │                       │
┌─────────┼──────────────────┼───────────────────────┼────────────┐
│         │        DATA LAYER │                       │            │
│  ┌──────▼──────┐   ┌───────▼──────┐   ┌────────────▼─────────┐  │
│  │  statements │   │ Supabase     │   │  statements          │  │
│  │  table      │   │ Storage      │   │  table               │  │
│  │ (Drizzle)   │   │ (PDFs)       │   │ (pdfStoragePath set) │  │
│  └─────────────┘   └──────────────┘   └──────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `/api/batch/upload` | Creates statement row + uploads PDF to Supabase Storage | MODIFY |
| `/api/statements/[id]/pdf` | Generates signed URL, returns to client | NEW |
| `/api/vault` | Lists statements for vault view with filters | NEW |
| `VaultPage` (`/vault`) | Dual-view UI (file cabinet + timeline tabs) | NEW |
| `VaultGrid` | File cabinet view — cards sorted by upload date | NEW |
| `VaultTimeline` | Timeline view — chronological scroll with month headers | NEW |
| `StatementCard` | Single card in file cabinet (filename, source, date, status) | NEW |
| `PDFViewerModal` | Dialog wrapping react-pdf Document+Page components | NEW |
| `usePdfUrl` | TanStack Query hook fetching signed URL | NEW |
| `useVault` | TanStack Query hook for vault list | NEW |

---

## Integration Point 1: PDF Upload to Supabase Storage

### Where to Integrate

**File:** `src/app/api/batch/upload/route.ts`

The `/api/batch/upload` handler receives the PDF as a `File` (FormData), hashes it, checks for duplicates, and creates the `statements` row. The PDF bytes are available in memory at line 84 (`const uploadFormData = new FormData()`). The `// TODO` comment is at line 97.

### Storage Path Convention

```
bucket: "statements"
path:   "{userId}/{statementId}.pdf"
```

**Rationale:**
- User-scoped folder enables simple RLS policy (`path LIKE '{userId}/%'`)
- `statementId` (UUID) as filename prevents collisions across users and uploads
- No sub-folders needed at current scale

### Supabase Storage Client Setup

The project currently has no Supabase client (`@supabase/supabase-js` not in package.json). The `src/lib/db/index.ts` connects directly via `postgres` driver to the database connection string.

Two new environment variables are required:
```bash
SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # No NEXT_PUBLIC_ prefix - server only
```

**Client instantiation (server-side only):**
```typescript
// src/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
```

The service role key bypasses RLS entirely — appropriate for server-side uploads where the route handler has already verified auth via `await auth()`. Never expose this key to the client.

### Modified Upload Route Pattern

```typescript
// src/app/api/batch/upload/route.ts — ADD after statement row created

// Upload PDF to Supabase Storage
const arrayBuffer = await file.arrayBuffer();
const fileBuffer = Buffer.from(arrayBuffer);
const storagePath = `${session.user.id}/${newStatement.id}.pdf`;

const supabase = createAdminClient();
const { error: uploadError } = await supabase.storage
  .from("statements")
  .upload(storagePath, fileBuffer, {
    contentType: "application/pdf",
    upsert: false,       // Statement IDs are UUIDs, no collision possible
    cacheControl: "3600",
  });

if (uploadError) {
  // Non-fatal: Statement row exists but PDF not stored
  // Log error but proceed — processing can still happen from memory
  console.error("Storage upload error:", uploadError);
} else {
  // Update statement with storage path
  await db
    .update(statements)
    .set({ pdfStoragePath: storagePath })
    .where(eq(statements.id, newStatement.id));
}
```

**Why non-fatal:** The existing processing flow works without the PDF in storage (text is extracted in-memory during `/api/batch/process`). A storage failure should not block the user from processing. Log it, continue.

### Supabase Storage Bucket Setup

One-time setup in Supabase dashboard or via SQL:

```sql
-- Create private bucket (no public access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('statements', 'statements', false);

-- RLS policy: authenticated users can upload to their own folder
CREATE POLICY "Users can upload own statements"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'statements'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: authenticated users can read own files
CREATE POLICY "Users can read own statements"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'statements'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Note:** Since the upload route uses the service role key, these RLS policies apply to direct Supabase access only. The API route handles its own auth check before calling storage.

### Historical Uploads (Backfill)

Existing statements with `pdfStoragePath = NULL` have no stored PDF — those files are gone. The vault must handle this gracefully:

- Show the statement card (metadata is in DB)
- Disable "View PDF" button when `pdfStoragePath` is null
- Show tooltip: "PDF not available — uploaded before vault feature"

No backfill migration possible (bytes are gone). Only new uploads after vault deployment will have PDFs stored.

---

## Integration Point 2: Serving PDFs via Signed URLs

### New API Route: `/api/statements/[id]/pdf`

PDFs must never be served as permanent public URLs (sensitive financial documents). Use short-lived signed URLs generated server-side.

**File:** `src/app/api/statements/[id]/pdf/route.ts` (NEW)

```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership and get storage path
  const [statement] = await db
    .select({ pdfStoragePath: statements.pdfStoragePath })
    .from(statements)
    .where(
      and(
        eq(statements.id, id),
        eq(statements.userId, session.user.id)
      )
    );

  if (!statement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!statement.pdfStoragePath) {
    return NextResponse.json(
      { error: "PDF not available for this statement" },
      { status: 404 }
    );
  }

  // Generate signed URL (5 minute expiry — enough to view, short enough to be safe)
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("statements")
    .createSignedUrl(statement.pdfStoragePath, 300); // 300 seconds = 5 minutes

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Failed to generate PDF URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: data.signedUrl });
}
```

**Security rationale:**
- Ownership verified before URL generation (can't access other users' PDFs)
- Signed URL expires in 5 minutes (minimal window for misuse)
- No permanent public URL stored or returned

### TanStack Query Hook

```typescript
// src/lib/hooks/use-pdf-url.ts
import { useQuery } from "@tanstack/react-query";

export function usePdfUrl(statementId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["pdf-url", statementId],
    queryFn: async () => {
      const res = await fetch(`/api/statements/${statementId}/pdf`);
      if (!res.ok) throw new Error("Failed to fetch PDF URL");
      const data = await res.json();
      return data.url as string;
    },
    enabled,                        // Only fetch when modal opens
    staleTime: 4 * 60 * 1000,      // 4 minutes (URL expires at 5)
    gcTime: 5 * 60 * 1000,         // Garbage collect after 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
```

---

## Integration Point 3: In-App PDF Viewer

### Library Choice: react-pdf

**Why react-pdf over alternatives:**
- Uses Mozilla's PDF.js under the hood — battle-tested, same engine Firefox uses
- React component API (`<Document>`, `<Page>`) matches existing codebase style
- Actively maintained (current major version v9)
- Lighter than Nutrient/PSPDFKit (no license cost, no iframe isolation needed)
- ~1.5MB bundle (pdf.js worker loaded separately, doesn't block main bundle)

**Installation:**
```bash
npm install react-pdf
```

**Critical Next.js App Router requirement:** react-pdf uses browser Canvas APIs and cannot run server-side. The viewer component must be wrapped in `dynamic()` with `ssr: false`.

### PDF Viewer Component

```typescript
// src/components/vault/pdf-viewer-modal.tsx
"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import { usePdfUrl } from "@/lib/hooks/use-pdf-url";

// Must be dynamically imported — pdf.js requires browser Canvas
const PDFDocument = dynamic(
  () => import("./pdf-document-inner").then((m) => m.PDFDocumentInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface PdfViewerModalProps {
  statementId: string;
  filename: string;
  open: boolean;
  onClose: () => void;
}

export function PdfViewerModal({
  statementId,
  filename,
  open,
  onClose,
}: PdfViewerModalProps) {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);

  // Only fetch URL when modal is open
  const { data: pdfUrl, isLoading, error } = usePdfUrl(statementId, open);

  const handleDocumentLoad = useCallback(({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
    setPage(1);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{filename}</DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {page} / {totalPages || "—"}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto flex justify-center">
          {isLoading && (
            <div className="flex h-96 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex h-96 items-center justify-center text-destructive text-sm">
              Failed to load PDF
            </div>
          )}
          {pdfUrl && (
            <PDFDocument
              url={pdfUrl}
              pageNumber={page}
              scale={scale}
              onDocumentLoad={handleDocumentLoad}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

```typescript
// src/components/vault/pdf-document-inner.tsx
// This file is imported ONLY via dynamic() — never directly
"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Worker must be configured in same file as Document usage
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PDFDocumentInnerProps {
  url: string;
  pageNumber: number;
  scale: number;
  onDocumentLoad: (data: { numPages: number }) => void;
}

export function PDFDocumentInner({
  url,
  pageNumber,
  scale,
  onDocumentLoad,
}: PDFDocumentInnerProps) {
  return (
    <Document file={url} onLoadSuccess={onDocumentLoad}>
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderTextLayer={true}
        renderAnnotationLayer={false}
      />
    </Document>
  );
}
```

**Why split into two files:** react-pdf's `pdfjs.GlobalWorkerOptions.workerSrc` must be set in the same module where `<Document>` is rendered. Dynamic imports create module boundaries, so the worker config and Document must co-locate in `pdf-document-inner.tsx`.

---

## Integration Point 4: Vault API

### New Route: `/api/vault`

The vault needs a filtered list of statements with metadata for the dual-view UI.

**File:** `src/app/api/vault/route.ts` (NEW)

```typescript
// GET /api/vault?source=X&hasFile=true&from=date&to=date
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  const hasFile = url.searchParams.get("hasFile") === "true";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const conditions = [eq(statements.userId, session.user.id)];

  if (source) {
    conditions.push(eq(statements.sourceType, source));
  }
  if (hasFile) {
    conditions.push(isNotNull(statements.pdfStoragePath));
  }
  if (from) {
    conditions.push(gte(statements.createdAt, new Date(from)));
  }
  if (to) {
    conditions.push(lte(statements.createdAt, new Date(to)));
  }

  const results = await db
    .select({
      id: statements.id,
      originalFilename: statements.originalFilename,
      sourceType: statements.sourceType,
      statementDate: statements.statementDate,
      uploadedAt: statements.createdAt,
      fileSizeBytes: statements.fileSizeBytes,
      processingStatus: statements.processingStatus,
      transactionCount: statements.transactionCount,
      hasPdf: sql<boolean>`${statements.pdfStoragePath} IS NOT NULL`.as("has_pdf"),
    })
    .from(statements)
    .where(and(...conditions))
    .orderBy(desc(statements.createdAt))
    .limit(100); // Vault shows up to 100 statements per load

  return NextResponse.json({ statements: results });
}
```

---

## Integration Point 5: Vault UI

### Page Route

**File:** `src/app/(dashboard)/vault/page.tsx` (NEW)

Sits in the existing `(dashboard)` route group — auth guard and sidebar layout inherited automatically.

Add vault link to sidebar in `src/components/layout/app-sidebar.tsx`.

### Dual-View Architecture

```
VaultPage
├── VaultHeader (title, filter bar, view toggle)
├── [tabs]
│   ├── "Cabinet" tab → VaultGrid
│   │   └── StatementCard × N
│   │       ├── FileText icon (large)
│   │       ├── filename (truncated)
│   │       ├── sourceType badge
│   │       ├── date
│   │       ├── transaction count
│   │       └── "View PDF" button (disabled if no PDF)
│   └── "Timeline" tab → VaultTimeline
│       └── [grouped by month]
│           ├── MonthHeader ("January 2026")
│           └── StatementRow × N
│               ├── FileText icon (small)
│               ├── filename
│               ├── sourceType
│               ├── date
│               └── "View PDF" icon button
└── PdfViewerModal (renders when selectedStatementId set)
```

### Vault Page Component

```typescript
// src/app/(dashboard)/vault/page.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/layout";
import { VaultGrid } from "@/components/vault/vault-grid";
import { VaultTimeline } from "@/components/vault/vault-timeline";
import { VaultFilters } from "@/components/vault/vault-filters";
import { PdfViewerModal } from "@/components/vault/pdf-viewer-modal";
import { useVault } from "@/lib/hooks/use-vault";

export default function VaultPage() {
  const [selectedStatement, setSelectedStatement] = useState<{
    id: string;
    filename: string;
  } | null>(null);

  const [filters, setFilters] = useState({
    source: "",
    hasFile: false,
  });

  const { data, isLoading } = useVault(filters);
  const statements = data?.statements ?? [];

  return (
    <>
      <DashboardHeader
        title="Document Vault"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Document Vault" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <VaultFilters filters={filters} onChange={setFilters} />

          <Tabs defaultValue="cabinet">
            <TabsList>
              <TabsTrigger value="cabinet">File Cabinet</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="cabinet">
              <VaultGrid
                statements={statements}
                isLoading={isLoading}
                onViewPdf={setSelectedStatement}
              />
            </TabsContent>
            <TabsContent value="timeline">
              <VaultTimeline
                statements={statements}
                isLoading={isLoading}
                onViewPdf={setSelectedStatement}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {selectedStatement && (
        <PdfViewerModal
          statementId={selectedStatement.id}
          filename={selectedStatement.filename}
          open={true}
          onClose={() => setSelectedStatement(null)}
        />
      )}
    </>
  );
}
```

### Timeline View — Grouping by Month

```typescript
// src/components/vault/vault-timeline.tsx
"use client";

import { useMemo } from "react";
import { format, startOfMonth } from "date-fns";

type Statement = {
  id: string;
  originalFilename: string;
  sourceType: string;
  uploadedAt: string;
  hasPdf: boolean;
  transactionCount: number;
};

// Group statements by calendar month of upload date
function groupByMonth(statements: Statement[]) {
  const groups = new Map<string, Statement[]>();
  for (const stmt of statements) {
    const key = format(startOfMonth(new Date(stmt.uploadedAt)), "MMMM yyyy");
    const existing = groups.get(key) ?? [];
    existing.push(stmt);
    groups.set(key, existing);
  }
  return groups;
}
```

---

## New Files to Create

| File | Type | Purpose |
|------|------|---------|
| `src/lib/supabase/admin.ts` | Library | Service role Supabase client for server-side ops |
| `src/app/api/vault/route.ts` | API Route | Filtered list of statements for vault |
| `src/app/api/statements/[id]/pdf/route.ts` | API Route | Generate signed URL for PDF access |
| `src/app/(dashboard)/vault/page.tsx` | Page | Vault entry point with dual-view tabs |
| `src/components/vault/vault-grid.tsx` | Component | File cabinet view (card grid) |
| `src/components/vault/vault-timeline.tsx` | Component | Timeline view (grouped by month) |
| `src/components/vault/statement-card.tsx` | Component | Card used in grid view |
| `src/components/vault/vault-filters.tsx` | Component | Source filter + "has PDF" toggle |
| `src/components/vault/pdf-viewer-modal.tsx` | Component | Dialog with controls + react-pdf |
| `src/components/vault/pdf-document-inner.tsx` | Component | Inner react-pdf Document (dynamic import target) |
| `src/lib/hooks/use-vault.ts` | Hook | TanStack Query hook for vault list |
| `src/lib/hooks/use-pdf-url.ts` | Hook | TanStack Query hook for signed URL |

## Modified Files

| File | Change |
|------|--------|
| `src/app/api/batch/upload/route.ts` | Add Supabase Storage upload after row creation |
| `src/components/layout/app-sidebar.tsx` | Add "Document Vault" navigation link |
| `.env.example` | Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` |
| `package.json` | Add `react-pdf` and `@supabase/supabase-js` |

---

## Data Flow Diagrams

### Upload Flow (Modified)

```
User selects PDF file
    |
    v
Client hashes file (SHA-256)
    |
    v
POST /api/batch/check-hash   (unchanged)
    |
    v
POST /api/batch/upload       (MODIFIED)
    |-- creates statements row
    |-- uploads file buffer to Supabase Storage: {userId}/{statementId}.pdf
    |-- updates statements.pdfStoragePath on success
    |-- logs error but continues if storage upload fails
    |
    v
POST /api/batch/process      (unchanged — works from in-memory bytes)
    |
    v
statements.processingStatus = "complete"
statements.pdfStoragePath    = "{userId}/{statementId}.pdf"  (if upload succeeded)
```

### View PDF Flow

```
User clicks "View PDF" on statement card
    |
    v
PdfViewerModal opens (selectedStatement set in state)
    |
    v
usePdfUrl hook fires (enabled=true now that modal is open)
    |
    v
GET /api/statements/[id]/pdf
    |-- auth check
    |-- verify statements.userId = session.user.id
    |-- check pdfStoragePath not null
    |-- supabase.storage.createSignedUrl(path, 300)
    |-- return { url: signedUrl }
    |
    v
usePdfUrl returns url
    |
    v
dynamic(() => import('./pdf-document-inner')) loads
(pdfjs worker initializes in browser)
    |
    v
<Document file={signedUrl}> renders PDF
    |
    v
User navigates pages / zooms
```

### Vault List Flow

```
User navigates to /vault
    |
    v
VaultPage renders
    |
    v
useVault hook fires
    |
    v
GET /api/vault?[filters]
    |-- auth check
    |-- query statements table with filters
    |-- returns {id, filename, sourceType, uploadedAt, hasPdf, ...}
    |
    v
Statements list returned
    |
    v
Tab "cabinet" → VaultGrid renders StatementCard × N
Tab "timeline" → VaultTimeline renders grouped rows
    |
    v
User clicks "View PDF" → opens PdfViewerModal
```

---

## Architectural Patterns

### Pattern 1: Server-Side Upload with Service Role Key

**What:** Upload file bytes in API route using Supabase admin client; never expose service key to client.

**When to use:** Any server-side file operation that needs to bypass RLS (because auth is handled at the API layer, not at Supabase auth level).

**Example:**
```typescript
// In API route — auth already verified via await auth()
const supabase = createAdminClient(); // service role key
await supabase.storage.from("statements").upload(path, buffer);
```

**Trade-offs:**
- Service role bypasses all RLS — no per-user access check at storage level
- Compensated by: ownership check in API route before any storage operation
- Alternative (signed upload URLs) adds a round-trip and complicates mobile support

### Pattern 2: Short-Lived Signed URLs for Sensitive Files

**What:** Never store permanent public URLs for financial documents. Generate signed URLs on demand, short expiry.

**When to use:** Any file access involving sensitive user data (statements, tax docs, etc.).

**Example:**
```typescript
const { data } = await supabase.storage
  .from("statements")
  .createSignedUrl(storagePath, 300); // 5 minute expiry
```

**Trade-offs:**
- URL fetched on every modal open (fast, <100ms for signed URL generation)
- TanStack Query caches URL for 4 minutes (refetches before expiry)
- Cannot be bookmarked or shared (intentional for financial privacy)

### Pattern 3: Dynamic Import SSR Bypass for Browser APIs

**What:** Wrap react-pdf components in `dynamic(() => import(...), { ssr: false })` to prevent hydration errors.

**When to use:** Any library that uses Canvas, WebGL, or other browser-only APIs.

**Example:**
```typescript
const PDFDocument = dynamic(
  () => import("./pdf-document-inner").then((m) => m.PDFDocumentInner),
  { ssr: false, loading: () => <Spinner /> }
);
```

**Trade-offs:**
- Component not included in SSR HTML (no SEO impact for modal content — acceptable)
- Loading state shown while JS bundle downloads (~1.5MB for pdf.js)
- Must configure `pdfjs.GlobalWorkerOptions.workerSrc` in the dynamically-imported file

### Pattern 4: Dual-View with Shared State

**What:** Two views (grid + timeline) backed by same data query. View toggle is UI-only state.

**When to use:** When same data benefits from different visual arrangements but data fetching is identical.

**Example:**
```typescript
// One hook call, two views
const { data } = useVault(filters);   // fetches once

// Tab switch → view re-renders from same data, no refetch
<TabsContent value="cabinet">
  <VaultGrid statements={data?.statements} />
</TabsContent>
<TabsContent value="timeline">
  <VaultTimeline statements={data?.statements} />
</TabsContent>
```

**Trade-offs:**
- Both views always get fresh data together
- No stale cabinet data when switching to timeline
- Simple invalidation: invalidate `["vault"]` query key, both views update

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing PDFs in the Database

**What people do:** Store PDF bytes as BYTEA column or base64 in JSONB.

**Why it's wrong:** 10MB PDFs in Postgres bloats the database, slows backups, and causes out-of-memory in Vercel serverless. Supabase Storage is purpose-built for binary objects.

**Do this instead:** Store only the storage path (`pdfStoragePath`) in the database; bytes live in Supabase Storage.

### Anti-Pattern 2: Serving PDFs via API Proxy

**What people do:** API route fetches the PDF from storage, streams it to the client.

**Why it's wrong:** Proxying a 5MB PDF through a Vercel serverless function (10MB response limit, 10s timeout) will fail on large statements. Also doubles bandwidth cost.

**Do this instead:** Use signed URLs. Client fetches directly from Supabase CDN. API route only generates and returns the signed URL (tiny JSON response).

### Anti-Pattern 3: Long-Lived or Public Signed URLs

**What people do:** Generate signed URL with 24-hour or longer expiry to avoid frequent refreshes.

**Why it's wrong:** Financial documents shared via long-lived URLs expose sensitive data if the URL is captured in logs, browser history, or referrer headers.

**Do this instead:** 5-minute expiry. TanStack Query handles refresh transparently.

### Anti-Pattern 4: Importing react-pdf Without SSR Bypass

**What people do:** Import `{ Document, Page }` directly in a component with `"use client"`.

**Why it's wrong:** Next.js still attempts to render client components on the server for initial HTML. pdf.js calls `document.createElement('canvas')` which throws in Node.js.

**Do this instead:** Dynamic import with `ssr: false`. Worker config in the dynamically-imported module.

### Anti-Pattern 5: Blocking Upload on Storage Failure

**What people do:** Return 500 if Supabase Storage upload fails, preventing the statement row from being created.

**Why it's wrong:** Storage is a value-added feature (view original PDF). The core value (transaction extraction) still works from in-memory bytes. Blocking on storage failure degrades reliability for a non-critical feature.

**Do this instead:** Log the storage error, continue with processing. Set `pdfStoragePath` to NULL. Vault shows the statement with "PDF not available" state.

---

## Integration with Existing Import Flow

### /api/batch/upload Sequence (After Modification)

```
1. auth()                              [existing]
2. isUserActive()                      [existing]
3. validate formData (file, hash, sourceType) [existing]
4. check for duplicate hash            [existing]
5. INSERT INTO statements (pending)    [existing]
6. createAdminClient()                 [NEW]
7. upload file buffer to Supabase Storage [NEW]
8. UPDATE statements SET pdfStoragePath  [NEW, only if step 7 succeeded]
9. return { statementId, status }      [existing]
```

Steps 6-8 add ~200-500ms to the upload response time (network call to Supabase CDN). This is acceptable given files are typically 1-10MB and are already being transferred from the browser.

### StatementDetail Page Integration

The existing `/statements/[id]` page and `StatementDetail` component can gain a "View PDF" button using the same `PdfViewerModal`. It just needs to pass the `statementId` and check if `hasPdf` is true.

This is a minor enhancement — not a blocking dependency for the vault.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 100K users |
|---------|--------------|--------------|---------------|
| Storage size | ~50MB (500 statements avg) | ~5GB | ~50GB |
| Supabase Storage cost | Negligible (5GB free) | ~$25/mo (Pro plan) | ~$250/mo |
| Signed URL latency | <100ms | <100ms | <100ms (CDN) |
| Vault list query | <10ms | <50ms (with index) | Needs index tuning |
| react-pdf bundle | 1.5MB, cached | 1.5MB, cached | Same (static asset) |

**First bottleneck:** Storage costs at 10K+ users. Mitigation: gate PDF storage behind a paid plan tier (enhanced/advanced). Free users get metadata only, no stored PDF.

**Index already exists:** `statements_user_id_idx` on `userId` covers vault list queries.

---

## Build Order Recommendation

Build in this order — each step is independently deployable:

**Step 1: Supabase Storage setup (infrastructure)**
- Create "statements" bucket in Supabase dashboard
- Add RLS policies
- Add env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Install `@supabase/supabase-js`
- Create `src/lib/supabase/admin.ts`

No code changes yet. Verify bucket works with manual upload test.

**Step 2: Modify upload route to persist PDFs**
- Modify `src/app/api/batch/upload/route.ts`
- Test with a real PDF upload — verify `pdfStoragePath` is set in DB
- Verify historical statements show `pdfStoragePath = NULL` (expected)

**Step 3: Signed URL API route**
- Create `src/app/api/statements/[id]/pdf/route.ts`
- Create `src/lib/hooks/use-pdf-url.ts`
- Test manually: curl the endpoint, paste signed URL in browser — PDF should open

**Step 4: PDF viewer component**
- Install `react-pdf`
- Create `src/components/vault/pdf-document-inner.tsx`
- Create `src/components/vault/pdf-viewer-modal.tsx`
- Test in isolation: render modal with a known statement ID

**Step 5: Vault list API**
- Create `src/app/api/vault/route.ts`
- Create `src/lib/hooks/use-vault.ts`
- Test: hit endpoint, verify returns statements with `hasPdf` field

**Step 6: Vault UI**
- Create vault components (grid, timeline, filters, statement card)
- Create `src/app/(dashboard)/vault/page.tsx`
- Add sidebar link
- Wire `PdfViewerModal` into page

---

## Open Questions

**1. Should PDF upload happen in `/api/batch/upload` or `/api/batch/process`?**

Current recommendation: in `/api/batch/upload`. The file bytes are available there, and it separates the "store the file" concern from the "process the file" concern. If upload is in `/api/batch/process`, failure during processing could lose the upload window.

Counterargument: If `process` is called without the file (e.g., retry from persisted queue), storage upload can't happen. Would need a separate re-upload mechanism.

**2. File size limit for stored PDFs?**

Current limit is 50MB per file (set in `/api/batch/upload`). Supabase Storage has a 5GB single-file limit on Pro plan. 50MB is fine. No change needed.

**3. Should "View PDF" open a new tab or a modal?**

Recommendation: Modal (keeps user in context). The signed URL can also be opened in new tab as an escape hatch (provide a "Open in new tab" link inside the modal).

**4. Historical uploads with no PDF — show or hide in vault?**

Recommendation: Show them. The vault is the authoritative list of all statements. Mark cards with "PDF not available" state visually. Users can see their full history even if they can't view the original file.

---

## Sources

### Primary (HIGH confidence — verified against codebase)

- `src/lib/db/schema.ts` lines 495-533 — `statements` table with `pdfStoragePath` field
- `src/app/api/batch/upload/route.ts` — Upload flow, TODO comment at line 97
- `src/app/api/batch/process/route.ts` — Processing flow, in-memory PDF handling
- `src/app/api/statements/[id]/route.ts` — Statement GET pattern to follow
- `src/components/sources/statement-detail.tsx` — Existing statement UI pattern
- `src/lib/hooks/use-statement.ts` — TanStack Query hook pattern to follow

### Primary (HIGH confidence — verified against official docs)

- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — RLS policies for user-scoped storage
- [Supabase createSignedUrl](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl) — Signed URL API
- [Supabase Resumable Uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads) — Upload patterns and size recommendations

### Secondary (MEDIUM confidence — community-verified)

- [react-pdf GitHub](https://github.com/wojtekmaj/react-pdf) — Next.js App Router compatibility, worker config requirement
- [NextJS 14 and react-pdf integration](https://benhur-martins.medium.com/nextjs-14-and-react-pdf-integration-ccd38b1fd515) — Dynamic import pattern with SSR bypass
- [Supabase service role in Next.js](https://adrianmurage.com/posts/supabase-service-role-secret-key/) — Server-side client setup pattern

---

*Architecture research for: PDF Vault (Supabase Storage + react-pdf + Dual-View UI)*
*Researched: 2026-02-19*
*Confidence: HIGH*
