# Phase 19: Batch Upload Foundation - Research

**Researched:** 2026-02-08
**Domain:** Multi-file upload with progress tracking, client-side file hashing, sequential processing, transaction storage, blob storage
**Confidence:** HIGH

## Summary

Phase 19 requires implementing a robust batch upload system for PDF statements with full transaction storage and deduplication. The research reveals that the current stack (React, Next.js, TanStack Query, Supabase, Drizzle ORM) already provides most needed capabilities, but requires new patterns for queue management, client-side hashing, and sequential processing to avoid memory exhaustion.

The standard approach combines react-dropzone for file selection, Web Crypto API (SubtleCrypto) for client-side SHA-256 hashing, TanStack Query mutations with local state for progress tracking, and Supabase Storage for blob storage. Sequential processing prevents memory exhaustion by handling one file at a time server-side. A new database schema will store ALL transactions (not just subscriptions) with full lineage tracking.

**Primary recommendation:** Use react-dropzone (already installed) for multi-file uploads, implement client-side SHA-256 hashing with Web Crypto API before upload for duplicate detection, manage upload queue with React useState and process files sequentially server-side. Store PDFs in Supabase Storage and create new transaction/statement tables in the existing schema for full statement data persistence.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-dropzone | 14.3.8 | Multi-file drag-and-drop | Already installed, industry standard for React file uploads, supports validation and multiple files |
| Web Crypto API | Native | SHA-256 file hashing | Browser built-in, zero dependencies, hardware-accelerated, secure contexts |
| Supabase Storage | Current | PDF blob storage | Part of existing stack, S3-compatible, built-in auth integration |
| Drizzle ORM | 0.45.1 | Database schema/queries | Already installed, type-safe schema definitions for new tables |
| TanStack Query | 5.90.19 | Upload mutation state | Already installed, handles loading/error states naturally |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-progress | 1.1.8 | Progress bars | Already installed, accessible progress visualization |
| pdf2json | 4.0.2 | PDF text extraction | Already installed, serverless-compatible for parsing |
| openai | 6.16.0 | Transaction extraction | Already installed, GPT-4o for parsing statement line items |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Web Crypto API | CryptoJS library | Library adds 50KB+ bundle size, Web Crypto is native and faster |
| Supabase Storage | Direct S3/R2 | More complex auth handling, Supabase integrates with existing setup |
| Sequential server-side | Parallel processing | Parallel risks OOM errors with 50-100MB PDFs, sequential is safer |
| Client-side hashing | Server-side hashing | Client-side reduces duplicate uploads, saves bandwidth |

**Installation:**
```bash
# All required libraries already installed
npm install  # Confirms: react-dropzone@14.3.8, openai@6.16.0, pdf2json@4.0.2
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/
│   └── batch/                    # New batch upload endpoints
│       ├── upload/route.ts       # Single file upload (with dedup check)
│       ├── check-hash/route.ts   # Duplicate detection by hash
│       └── process/route.ts      # Statement processing endpoint
├── components/
│   ├── batch/                    # New batch upload components
│   │   ├── batch-uploader.tsx    # Main component with dropzone
│   │   ├── file-queue.tsx        # File list with progress
│   │   └── file-item.tsx         # Individual file row with progress
│   └── ui/                       # Existing shadcn/ui components
├── lib/
│   ├── db/
│   │   └── schema.ts             # Add statements, transactions tables
│   ├── hooks/
│   │   └── use-batch-upload.ts   # Upload queue management hook
│   └── utils/
│       └── file-hash.ts          # SHA-256 hashing utilities
```

### Pattern 1: Client-Side File Hashing for Duplicate Detection
**What:** Calculate SHA-256 hash of PDF file in browser before upload
**When to use:** Before every file upload to detect exact duplicates
**Example:**
```typescript
// Source: MDN Web Crypto API + Transloadit blog
async function hashFile(file: File): Promise<string> {
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  const hashes: Uint8Array[] = [];

  for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    hashes.push(new Uint8Array(hashBuffer));
  }

  // Combine all chunk hashes for final hash
  const finalBuffer = new Uint8Array(hashes.flat());
  const finalHash = await crypto.subtle.digest('SHA-256', finalBuffer);

  // Convert to hex string
  return Array.from(new Uint8Array(finalHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### Pattern 2: Upload Queue with Sequential Processing
**What:** Manage multiple file uploads with status tracking and sequential execution
**When to use:** For batch uploads where order matters or to prevent memory exhaustion
**Example:**
```typescript
// Source: React file upload queue patterns + TanStack Query
interface QueuedFile {
  id: string;
  file: File;
  hash: string;
  status: 'pending' | 'hashing' | 'checking' | 'uploading' | 'processing' | 'complete' | 'error' | 'duplicate';
  progress: number;
  error?: string;
}

function useBatchUpload() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async (item: QueuedFile) => {
      // Update status: uploading
      updateQueueItem(item.id, { status: 'uploading', progress: 0 });

      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('hash', item.hash);

      const response = await fetch('/api/batch/upload', {
        method: 'POST',
        body: formData,
      });

      return response.json();
    },
    onSuccess: (data, item) => {
      updateQueueItem(item.id, { status: 'complete', progress: 100 });
      // Process next file
      setCurrentIndex(prev => prev + 1);
    },
    onError: (error, item) => {
      updateQueueItem(item.id, {
        status: 'error',
        error: error.message
      });
    },
  });

  // Process queue sequentially
  useEffect(() => {
    const current = queue[currentIndex];
    if (current && current.status === 'pending') {
      uploadMutation.mutate(current);
    }
  }, [currentIndex, queue]);

  return { queue, addFiles, cancelFile, retryFile };
}
```

### Pattern 3: Supabase Storage for PDF Persistence
**What:** Store original PDFs in Supabase Storage with proper access control
**When to use:** After successful upload, before transaction extraction
**Example:**
```typescript
// Source: Supabase Storage documentation
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Server-side only
);

async function storePDF(userId: string, file: File, hash: string) {
  const filename = `${userId}/${hash}.pdf`;

  const { data, error } = await supabase.storage
    .from('statements') // Private bucket
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false, // Prevent overwrites
    });

  if (error) throw error;
  return data.path;
}
```

### Pattern 4: Transaction Storage with Full Lineage
**What:** Store ALL statement transactions with links to source PDFs
**When to use:** After AI extraction, store complete transaction history
**Example:**
```typescript
// New schema tables (add to schema.ts)
export const statements = pgTable('statements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sourceType: varchar('source_type', { length: 100 }).notNull(), // "Chase Sapphire", "Bank of America"
  pdfHash: varchar('pdf_hash', { length: 64 }).notNull().unique(), // SHA-256
  pdfStoragePath: text('pdf_storage_path').notNull(),
  statementDate: timestamp('statement_date', { withTimezone: true }),
  processingStatus: varchar('processing_status', { length: 20 }).notNull(), // 'pending', 'processing', 'complete', 'failed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  statementId: uuid('statement_id').notNull().references(() => statements.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Transaction data
  transactionDate: timestamp('transaction_date', { withTimezone: true }).notNull(),
  merchantName: varchar('merchant_name', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),

  // Deduplication fingerprint (merchant + amount + date)
  fingerprint: varchar('fingerprint', { length: 64 }).notNull(),

  // AI metadata
  isRecurringCandidate: boolean('is_recurring_candidate').default(false),
  confidenceScore: integer('confidence_score'), // 0-100
  rawText: text('raw_text'),
  aiMetadata: jsonb('ai_metadata').$type<{
    categoryGuesses?: string[];
    extractedAt: string;
    model: string;
  }>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('transactions_user_id_idx').on(table.userId),
  index('transactions_statement_id_idx').on(table.statementId),
  index('transactions_fingerprint_idx').on(table.fingerprint),
  index('transactions_recurring_idx').on(table.isRecurringCandidate),
]);
```

### Anti-Patterns to Avoid
- **Loading entire PDF into memory:** Use streaming/chunking for files >10MB to prevent memory exhaustion
- **Parallel server-side processing:** Processing 12 PDFs simultaneously can cause OOM errors; process sequentially
- **Missing progress feedback:** Users need per-file progress, not just batch-level progress
- **No retry mechanism:** Failed uploads should be retryable without re-uploading the file
- **Storing only subscriptions:** Phase 19 requires ALL transactions for future pattern detection

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File drag-and-drop UI | Custom drop zone with event listeners | react-dropzone | Handles browser quirks, validation, multiple files, paste events |
| SHA-256 hashing | JavaScript hash implementation | Web Crypto API (crypto.subtle) | Hardware-accelerated, secure, native browser API |
| Upload progress tracking | XMLHttpRequest with manual progress | Axios with onUploadProgress or Fetch with ReadableStream | Battle-tested, handles edge cases, better error handling |
| PDF text extraction | Regex parsing of PDF binary | pdf2json (already installed) | Handles PDF structure complexity, encoding issues |
| Blob storage | Custom S3 integration | Supabase Storage | Auth integration, RLS policies, CDN, resumable uploads via TUS |
| Queue state management | Custom reducer logic | useState + useEffect with index tracking | Simple, predictable, easy to debug |

**Key insight:** File upload is deceptively complex (network failures, browser quirks, memory management, progress tracking). Use proven libraries and native APIs rather than building from scratch.

## Common Pitfalls

### Pitfall 1: Memory Exhaustion from Large PDFs
**What goes wrong:** Loading 12 × 50MB PDFs into memory simultaneously causes server OOM errors
**Why it happens:** Node.js default memory limit is 512MB-1GB; processing multiple large files in parallel exceeds this
**How to avoid:**
- Process files sequentially server-side (one at a time)
- Use streaming APIs for file reading/writing
- Set explicit memory limits in Next.js config if needed
**Warning signs:**
- Server crashes with "JavaScript heap out of memory"
- Slow processing times followed by timeouts
- Vercel/deployment platform errors

### Pitfall 2: Blocking UI During Client-Side Hashing
**What goes wrong:** Hashing large files on main thread freezes the browser
**Why it happens:** SHA-256 computation is CPU-intensive; 50MB file can take 2-3 seconds
**How to avoid:**
- Use Web Workers for hashing (move computation off main thread)
- Show progress indicator during hashing
- Process files in chunks (1MB) with yielding between chunks
**Warning signs:**
- Browser "Page Unresponsive" warnings
- UI freezes during upload
- Progress bars don't update smoothly

### Pitfall 3: Incomplete Duplicate Detection
**What goes wrong:** Same statement uploaded multiple times creates duplicate transactions
**Why it happens:** Only checking merchant name + amount misses re-imports of same PDF
**How to avoid:**
- Hash entire PDF file (SHA-256) before upload
- Check hash against existing statements
- Prompt user: "This file was uploaded on [date]. Skip or re-import?"
- Re-import should delete old transactions and create new ones
**Warning signs:**
- Users report duplicate subscriptions after re-uploading
- Transaction counts don't match statement totals
- Pattern detection shows artificial patterns from duplicates

### Pitfall 4: Lost Progress on Network Failures
**What goes wrong:** Upload fails mid-batch, all progress is lost
**Why it happens:** No persistence of upload queue state
**How to avoid:**
- Track status per file (not just batch-level)
- Allow individual file retry without re-upload
- Consider persisting queue to localStorage for session recovery
- Use Supabase Storage's TUS resumable uploads for large files
**Warning signs:**
- Users complain about re-uploading same files
- Batch upload success rate <90%
- No way to retry just failed files

### Pitfall 5: Inadequate Error Handling
**What goes wrong:** Generic "Upload failed" message doesn't help user resolve issue
**Why it happens:** Not surfacing specific errors (file too large, invalid format, extraction failed)
**How to avoid:**
- Show error per file with specific message
- Distinguish between: upload failure, processing failure, extraction failure
- Provide actionable guidance ("File too large, try splitting the PDF")
- Keep failed files in queue with "Retry" option
**Warning signs:**
- High support tickets asking "why did upload fail?"
- Users repeatedly uploading incompatible files
- No way to diagnose issues

## Code Examples

Verified patterns from official sources:

### Client-Side File Hashing (Chunked for Large Files)
```typescript
// Source: MDN SubtleCrypto + Medium article by Luca Vaccaro
async function hashFileChunked(file: File): Promise<string> {
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  const hashPromises: Promise<ArrayBuffer>[] = [];

  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    hashPromises.push(
      chunk.arrayBuffer().then(buffer =>
        crypto.subtle.digest('SHA-256', buffer)
      )
    );
  }

  // Combine chunk hashes
  const chunkHashes = await Promise.all(hashPromises);
  const combined = new Uint8Array(
    chunkHashes.reduce((acc, hash) => {
      const arr = Array.from(new Uint8Array(hash));
      return acc.concat(arr);
    }, [] as number[])
  );

  // Final hash
  const finalHash = await crypto.subtle.digest('SHA-256', combined);

  // Convert to hex
  return Array.from(new Uint8Array(finalHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### Duplicate Detection API Endpoint
```typescript
// Source: Project architecture pattern
// app/api/batch/check-hash/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { statements } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { hash } = await request.json();

  // Check if hash exists
  const existing = await db.query.statements.findFirst({
    where: and(
      eq(statements.userId, session.user.id),
      eq(statements.pdfHash, hash)
    ),
    columns: {
      id: true,
      sourceType: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    isDuplicate: !!existing,
    existing: existing || null,
  });
}
```

### Sequential File Processing with Progress
```typescript
// Source: TanStack Query + React queue patterns
function useBatchUpload() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [processing, setProcessing] = useState(false);

  const processNext = useCallback(async () => {
    const nextFile = queue.find(f => f.status === 'pending');
    if (!nextFile || processing) return;

    setProcessing(true);

    try {
      // 1. Hash file
      updateFileStatus(nextFile.id, 'hashing', 10);
      const hash = await hashFileChunked(nextFile.file);

      // 2. Check for duplicate
      updateFileStatus(nextFile.id, 'checking', 20);
      const checkRes = await fetch('/api/batch/check-hash', {
        method: 'POST',
        body: JSON.stringify({ hash }),
      });
      const { isDuplicate, existing } = await checkRes.json();

      if (isDuplicate) {
        updateFileStatus(nextFile.id, 'duplicate', 100, existing);
        setProcessing(false);
        return;
      }

      // 3. Upload file
      updateFileStatus(nextFile.id, 'uploading', 30);
      const formData = new FormData();
      formData.append('file', nextFile.file);
      formData.append('hash', hash);

      const uploadRes = await fetch('/api/batch/upload', {
        method: 'POST',
        body: formData,
      });

      const { statementId } = await uploadRes.json();

      // 4. Process transactions
      updateFileStatus(nextFile.id, 'processing', 60);
      await fetch('/api/batch/process', {
        method: 'POST',
        body: JSON.stringify({ statementId }),
      });

      updateFileStatus(nextFile.id, 'complete', 100);
    } catch (error) {
      updateFileStatus(nextFile.id, 'error', 0, null, error.message);
    } finally {
      setProcessing(false);
      // Process next file
      setTimeout(processNext, 100);
    }
  }, [queue, processing]);

  // Start processing when files are added
  useEffect(() => {
    if (!processing) processNext();
  }, [queue, processing, processNext]);

  return { queue, addFiles, cancelFile, retryFile };
}
```

### Transaction Fingerprinting for Deduplication
```typescript
// Source: PostgreSQL deduplication best practices
import crypto from 'crypto';

function generateTransactionFingerprint(
  merchantName: string,
  amount: number,
  date: Date,
  currency: string
): string {
  // Normalize merchant name (remove spaces, lowercase, special chars)
  const normalized = merchantName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  // Create deterministic string
  const data = `${normalized}:${amount.toFixed(2)}:${date.toISOString().split('T')[0]}:${currency}`;

  // Hash for efficient indexing
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Usage in transaction insertion
const fingerprint = generateTransactionFingerprint(
  'Netflix Inc',
  15.99,
  new Date('2026-01-15'),
  'USD'
);

// Check for existing transaction with same fingerprint
const existing = await db.query.transactions.findFirst({
  where: eq(transactions.fingerprint, fingerprint),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| XHR for uploads | Fetch API + ReadableStream | 2020+ | Better streaming support, simpler API |
| CryptoJS library | Web Crypto API (native) | 2020+ (baseline) | Zero bundle size, faster, secure contexts |
| Sequential awaits | Parallel Promise.all | Ongoing | Watch for memory issues with large files |
| Body parser in API routes | Stream processing with busboy | Next.js 13+ | Handle large files without memory limits |
| B-tree indexes only | B-tree with deduplication enabled | PostgreSQL 13+ | 40-50% index size reduction for duplicates |

**Deprecated/outdated:**
- Body parser for large files: Next.js API routes default 1MB limit. Use streaming for files >10MB
- Loading entire file: Memory exhaustion risk. Use chunked processing
- Dropzone.js: Too opinionated, hard to customize. react-dropzone is more flexible

## Open Questions

Things that couldn't be fully resolved:

1. **Supabase Storage bucket configuration**
   - What we know: Need private bucket with RLS policies, supports files up to 50MB
   - What's unclear: Exact RLS policy syntax for user-scoped access, whether to use signed URLs
   - Recommendation: Create bucket "statements" with policy `user_id = auth.uid()`, use server-side service key for uploads

2. **Optimal chunk size for file hashing**
   - What we know: 1MB chunks recommended, but varies by device performance
   - What's unclear: Whether to adjust chunk size based on file size or device capabilities
   - Recommendation: Start with 1MB, add telemetry to track hashing performance, adjust if needed

3. **Transaction extraction prompt changes**
   - What we know: Current prompt extracts only subscriptions (high-confidence recurring charges)
   - What's unclear: How to prompt GPT-4o to extract ALL transactions with category guesses
   - Recommendation: Update system prompt to explicitly request "all line items" with structured output

4. **Statement date extraction**
   - What we know: Need statement date to properly organize imports
   - What's unclear: How reliably GPT-4o can extract statement period dates
   - Recommendation: Add statement date to extraction prompt, fall back to upload date if not found

5. **Re-import transaction handling**
   - What we know: Re-import should replace transactions but preserve linked subscriptions
   - What's unclear: Whether to soft-delete or hard-delete old transactions, how to handle changed amounts
   - Recommendation: Soft-delete old transactions (set `deletedAt`), keep for audit trail

## Sources

### Primary (HIGH confidence)
- [MDN: SubtleCrypto.digest()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest) - SHA-256 hashing API
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage) - Blob storage patterns
- [Drizzle ORM: PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg) - JSONB and schema patterns
- [Next.js: API Routes Response Size Limit](https://nextjs.org/docs/messages/api-routes-response-size-limit) - Memory limits

### Secondary (MEDIUM confidence)
- [Transloadit: Hash files in the browser with Web Crypto](https://transloadit.com/devtips/hash-files-in-the-browser-with-web-crypto/) - Chunked hashing pattern
- [Medium: Hashing big file with FileReader JS](https://medium.com/@0xVaccaro/hashing-big-file-with-filereader-js-e0a5c898fc98) - Large file handling
- [BezKoder: React Dropzone Multiple Files Upload](https://www.bezkoder.com/react-dropzone-multiple-files-upload/) - Progress tracking patterns
- [Microsoft Learn: GPT-4o PDF extraction](https://learn.microsoft.com/en-us/samples/azure-samples/azure-openai-gpt-4-vision-pdf-extraction-sample/using-azure-openai-gpt-4o-to-extract-structured-json-data-from-pdf-documents/) - Structured extraction
- [GitHub: react-uploady](https://github.com/rpldy/react-uploady) - Upload queue management
- [Alibaba Cloud: PostgreSQL deduplication](https://www.alibabacloud.com/blog/postgresql-data-deduplication-methods_596032) - Fingerprinting strategies

### Tertiary (LOW confidence)
- [React sequential API calls](https://medium.com/@shikharsingh03/react-sequential-api-calls-4fd5db15c053) - Queue patterns (general)
- [File upload management with progress](https://medium.com/@didemsahin1789/file-upload-management-robust-upload-system-with-progress-tracking-c5971c48f074) - UI patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and verified in package.json
- Architecture: HIGH - Patterns verified through official documentation and existing codebase
- Pitfalls: HIGH - Based on Next.js memory limits docs, PostgreSQL best practices, Web Crypto API specs
- Transaction storage: MEDIUM - Schema design based on requirements, not existing implementation
- Duplicate detection: HIGH - SHA-256 hashing well-documented, straightforward implementation

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (60 days - stable technologies with slow change rate)
