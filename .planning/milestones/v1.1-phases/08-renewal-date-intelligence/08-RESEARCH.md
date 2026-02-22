# Phase 8: Renewal Date Intelligence - Research

**Researched:** 2026-02-02
**Domain:** AI date extraction, date parsing, inline editing UX
**Confidence:** HIGH

## Summary

This phase extends the existing AI extraction pipeline to extract transaction dates from bank statements and calculate renewal dates. The codebase already has a solid foundation: OpenAI GPT-4o integration for document parsing, date-fns for date manipulation, Zod for validation, and a working import review UI with inline editing.

The key implementation areas are:
1. **Extending the AI prompt** to extract transaction dates alongside subscription details
2. **Adding renewal date calculation logic** based on transaction date + billing cycle
3. **Building inline date editing UI** with click-to-edit pattern and visual diff

The user decisions in CONTEXT.md are clear and specific: binary date confidence (found/not found), inline text input (not calendar picker), visual diff after editing, auto-recalculation when transaction date changes, and ability to edit both dates independently.

**Primary recommendation:** Extend the existing `DetectedSubscription` interface with `transactionDate` field, update the OpenAI prompt to extract it, and build reusable `EditableDateField` component for the inline editing pattern.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | ^4.x | Date parsing, formatting, calculation | Already used, tree-shakeable, immutable |
| Zod | ^3.x | Schema validation for dates | Already used with React Hook Form |
| OpenAI SDK | ^4.x | AI extraction with GPT-4o | Already integrated for PDF parsing |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-tooltip | ^1.x | Tooltips for date explanations | Show "Date not found" explanations |
| lucide-react | ^0.x | Warning icons for missing dates | AlertTriangle for date warnings |

### No New Dependencies Needed

All required functionality can be implemented with existing libraries. No new packages required.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Changes to Existing Structure
```
src/
├── lib/
│   ├── openai/
│   │   └── pdf-parser.ts      # MODIFY: Add transactionDate to extraction
│   ├── utils/
│   │   └── dates.ts           # MODIFY: Add calculateRenewalFromTransaction()
│   └── validations/
│       └── import.ts          # MODIFY: Add date fields to schemas
├── components/
│   └── import/
│       ├── editable-date-field.tsx  # NEW: Reusable inline date editing
│       └── date-confidence-badge.tsx # NEW: Visual indicator for date status
└── app/
    └── (dashboard)/
        └── import/
            └── page.tsx       # MODIFY: Add date display and editing
```

### Pattern 1: Transaction Date Extraction via AI Prompt
**What:** Extend the existing SYSTEM_PROMPT to request transaction date extraction
**When to use:** During PDF/image processing
**Example:**
```typescript
// Source: Existing codebase pattern in src/lib/openai/pdf-parser.ts
interface DetectedSubscription {
  name: string;
  amount: number;
  currency: string;
  frequency: "monthly" | "yearly";
  confidence: number;
  rawText?: string;
  // NEW: Transaction date fields
  transactionDate?: string;      // ISO format: "2026-01-15"
  dateFound: boolean;            // Binary: found or not found
}

const SYSTEM_PROMPT = `...existing prompt...

6. Transaction date (if visible in the statement) - the date the charge occurred
7. Whether a transaction date was found (true/false)

For each subscription found, extract:
{
  ...existing fields...
  "transactionDate": "2026-01-15",  // ISO 8601 format, or null if not found
  "dateFound": true                  // Boolean indicating if date was extracted
}

If a transaction date is visible near the charge, include it.
If no date is visible or you cannot determine the date with reasonable certainty, set dateFound to false and transactionDate to null.
`;
```

### Pattern 2: Renewal Date Calculation from Transaction Date
**What:** Calculate next renewal by advancing transaction date by billing cycle
**When to use:** After extraction, and when transaction date is edited
**Example:**
```typescript
// Source: Extend existing src/lib/utils/dates.ts patterns
import { addMonths, addYears, isBefore, startOfDay } from "date-fns";

export function calculateRenewalFromTransaction(
  transactionDate: Date,
  frequency: "monthly" | "yearly"
): Date {
  const today = startOfDay(new Date());
  let nextRenewal = transactionDate;

  // Advance until we get a future date
  while (isBefore(nextRenewal, today)) {
    nextRenewal = frequency === "monthly"
      ? addMonths(nextRenewal, 1)
      : addYears(nextRenewal, 1);
  }

  return nextRenewal;
}
```

### Pattern 3: Click-to-Edit Inline Date Field
**What:** Text displays date, click reveals input, blur/Enter saves
**When to use:** For both transaction date and renewal date editing
**Example:**
```typescript
// Component pattern for inline editing
interface EditableDateFieldProps {
  value: Date | null;
  originalValue: Date | null;  // For showing diff
  onChange: (date: Date | null) => void;
  placeholder?: string;
  dateNotFound?: boolean;
}

// Shows: "Jan 15, 2026" (clickable text)
// On click: Shows input with format hint "MM/DD/YYYY"
// After edit: Shows "Jan 10, 2026" with struck-through original
```

### Anti-Patterns to Avoid
- **Using calendar picker for date input:** User decided on text input with format hint
- **Showing percentage confidence for dates:** User decided on binary found/not-found
- **Blocking import for missing dates:** User decided imports allowed without dates
- **Global bulk date editing:** User decided on per-item editing only

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date parsing from string | Custom regex | date-fns `parse()` | Handles edge cases, locales |
| Date validation | Manual checks | Zod with date-fns `isValid()` | Type-safe, composable |
| Relative date display | Custom formatting | date-fns `formatDistanceToNow()` | Already used in codebase |
| Date advancement | Manual while loops | date-fns `addMonths()`/`addYears()` | Handles month boundaries |

**Key insight:** date-fns is already heavily used in the codebase for date operations. All date manipulation should use date-fns functions for consistency and correctness.

## Common Pitfalls

### Pitfall 1: Timezone Issues with Date Parsing
**What goes wrong:** Dates parsed without timezone info shift by a day
**Why it happens:** JavaScript Date uses local timezone, ISO strings are interpreted as UTC
**How to avoid:**
- Store dates as Date objects, not strings, in state
- Use date-fns `parseISO()` for ISO strings from AI
- Use `startOfDay()` when comparing dates
**Warning signs:** Dates appearing as one day earlier/later than expected

### Pitfall 2: Invalid Date Input Silently Accepted
**What goes wrong:** User types "2/31/2026" (Feb 31 doesn't exist), system accepts it
**Why it happens:** JavaScript Date auto-corrects invalid dates (Feb 31 becomes Mar 3)
**How to avoid:**
- Use date-fns `isValid()` after parsing
- Validate that re-formatting the date matches the input
- Block obviously wrong years (< 2020, > 2030)
**Warning signs:** Dates in the far past or future after entry

### Pitfall 3: Auto-Recalculation Loop
**What goes wrong:** Editing transaction date triggers renewal recalc, which triggers re-render, which loses focus
**Why it happens:** State update patterns that cause unnecessary re-renders
**How to avoid:**
- Batch state updates (transaction date + renewal date together)
- Use stable callbacks with useCallback
- Only recalculate on blur/submit, not on every keystroke
**Warning signs:** Input losing focus unexpectedly, flickering

### Pitfall 4: AI Date Format Inconsistency
**What goes wrong:** AI returns dates in different formats ("Jan 15", "1/15/26", "2026-01-15")
**Why it happens:** LLMs aren't deterministic; prompt may not be specific enough
**How to avoid:**
- Explicitly request ISO 8601 format in prompt
- Parse multiple common formats as fallback
- Return `dateFound: false` if parsing fails
**Warning signs:** Some dates parse correctly, others don't

### Pitfall 5: Editing Original vs Calculated Date Confusion
**What goes wrong:** User edits renewal date, then edits transaction date, renewal gets overwritten
**Why it happens:** Auto-recalculation from transaction date clobbers manual renewal edits
**How to avoid:**
- Track whether renewal date was manually edited (flag)
- Only auto-recalculate if renewal date hasn't been manually set
- Clear the manual flag when transaction date is edited (per CONTEXT.md decision)
**Warning signs:** User frustration when edits are overwritten

## Code Examples

Verified patterns from official sources and existing codebase:

### Date Parsing from AI Response
```typescript
// Source: date-fns documentation + existing codebase patterns
import { parseISO, isValid, format, parse } from "date-fns";

function parseDateFromAI(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  // Try ISO format first (requested in prompt)
  let parsed = parseISO(dateString);
  if (isValid(parsed)) return parsed;

  // Fallback formats the AI might use
  const fallbackFormats = [
    "MM/dd/yyyy",
    "M/d/yyyy",
    "MMM d, yyyy",
    "MMMM d, yyyy",
  ];

  for (const fmt of fallbackFormats) {
    parsed = parse(dateString, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }

  return null;
}
```

### Date Validation for User Input
```typescript
// Source: Zod docs + existing codebase patterns
import { z } from "zod";
import { parse, isValid, isBefore, isAfter } from "date-fns";

const dateInputSchema = z.string()
  .transform((val) => {
    // Accept MM/DD/YYYY format
    const parsed = parse(val, "MM/dd/yyyy", new Date());
    return isValid(parsed) ? parsed : null;
  })
  .refine((date) => date !== null, {
    message: "Please enter a valid date (MM/DD/YYYY)",
  })
  .refine((date) => date && isAfter(date, new Date("2020-01-01")), {
    message: "Date must be after 2020",
  })
  .refine((date) => date && isBefore(date, new Date("2030-12-31")), {
    message: "Date must be before 2031",
  });
```

### Relative + Full Date Display
```typescript
// Source: CONTEXT.md decision + existing codebase
import { formatDistanceToNow, format } from "date-fns";

function formatDateDisplay(date: Date): string {
  const relative = formatDistanceToNow(date, { addSuffix: true });
  const full = format(date, "MMM d, yyyy");
  return `${relative} (${full})`;
}

// Examples:
// "in 5 days (Feb 15, 2026)"
// "in 2 months (Apr 1, 2026)"
```

### Visual Diff After Editing
```typescript
// Source: CONTEXT.md decision
interface DateDisplayProps {
  currentDate: Date | null;
  originalDate: Date | null;
  wasEdited: boolean;
}

function DateDisplay({ currentDate, originalDate, wasEdited }: DateDisplayProps) {
  if (!currentDate) {
    return <span className="text-yellow-600">Date not found</span>;
  }

  const displayDate = format(currentDate, "MMM d, yyyy");

  if (wasEdited && originalDate) {
    const originalDisplay = format(originalDate, "MMM d, yyyy");
    return (
      <span>
        <span className="line-through text-muted-foreground mr-2">
          {originalDisplay}
        </span>
        <span>{displayDate}</span>
      </span>
    );
  }

  return <span>{displayDate}</span>;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Regex-only date extraction | LLM extraction with structured output | 2024+ | More reliable extraction from varied formats |
| Calendar pickers for all dates | Inline text input for quick editing | UX trend | Faster editing, less clicks |
| Import date as renewal | Transaction date as basis | This phase | Accurate renewal tracking |

**Deprecated/outdated:**
- Using `new Date(string)` directly: Inconsistent parsing, use date-fns instead
- Moment.js: date-fns is the modern, tree-shakeable alternative (already in codebase)

## Open Questions

Things that couldn't be fully resolved:

1. **AI Date Extraction Accuracy**
   - What we know: GPT-4o can extract dates from bank statements
   - What's unclear: Accuracy rate for different statement formats
   - Recommendation: Implement gracefully with dateFound flag; don't block on missing dates

2. **Date Input Format Localization**
   - What we know: User decided on MM/DD/YYYY format hint
   - What's unclear: Whether to support DD/MM/YYYY for international users
   - Recommendation: Start with MM/DD/YYYY, can extend later if needed

3. **Statement Date vs Transaction Date**
   - What we know: Bank statements may show statement date and individual transaction dates
   - What's unclear: Which date AI will extract for each line item
   - Recommendation: Prompt for "transaction date" specifically, validate results

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/openai/pdf-parser.ts` - current extraction patterns
- Existing codebase: `src/lib/utils/dates.ts` - date utility functions
- Existing codebase: `src/app/(dashboard)/import/page.tsx` - import UI patterns
- date-fns documentation - parsing and formatting functions

### Secondary (MEDIUM confidence)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) - JSON schema extraction patterns
- [Zod Date Validation](https://github.com/colinhacks/zod/discussions/879) - date string parsing with Zod
- [date-fns parse function](https://github.com/date-fns/date-fns/issues/501) - string to date conversion

### Tertiary (LOW confidence)
- General React inline editing patterns from web search

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using existing libraries already in codebase
- Architecture: HIGH - extending proven patterns from existing code
- Pitfalls: HIGH - based on common date handling issues and codebase analysis
- AI extraction: MEDIUM - GPT-4o capabilities verified, specific accuracy unknown

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable domain)
