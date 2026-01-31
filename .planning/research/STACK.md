# Technology Stack - Import Improvements

**Project:** Subscription Manager v2.0 (Import Improvements)
**Researched:** 2026-01-31
**Confidence:** HIGH

## Executive Summary

The import improvements milestone requires **minimal new dependencies**. The existing stack (OpenAI GPT-4o, pdf2json, date-fns, shadcn/ui) already provides most capabilities needed. Only **two lightweight additions** are recommended: chrono-node for natural language date parsing and a shadcn/ui combobox component for category management.

**Key decision:** Use OpenAI Structured Outputs (already in openai@6.16.0) instead of adding new libraries for confidence scoring or pattern recognition. GPT-4o can handle bank name detection, date extraction, and confidence scoring through JSON schema constraints.

## Existing Stack (No Changes Needed)

### AI/ML Layer
| Technology | Current Version | Status | Notes |
|------------|----------------|--------|-------|
| openai | 6.16.0 | **KEEP** | Supports structured outputs with JSON schema |
| GPT-4o model | gpt-4o (latest) | **KEEP** | Perfect 100% JSON schema compliance |

**Why keep:** OpenAI's structured outputs feature (introduced Aug 2024) provides confidence scoring and structured data extraction natively. No need for additional ML libraries.

### PDF Processing
| Technology | Current Version | Status | Notes |
|------------|----------------|--------|-------|
| pdf2json | 4.0.2 | **KEEP** | Text extraction works well |

**Why keep:** Current pdf2json implementation successfully extracts text from bank statements. The issue isn't extraction quality - it's the AI prompt engineering and confidence thresholds.

### Database & ORM
| Technology | Current Version | Status | Notes |
|------------|----------------|--------|-------|
| drizzle-orm | 0.45.1 | **KEEP** | Handles category CRUD well |
| postgres | 3.4.8 | **KEEP** | Connection handling works |

**Why keep:** Schema already supports categories table with proper unique constraints. No database changes needed for category management.

### UI Components
| Technology | Current Version | Status | Notes |
|------------|----------------|--------|-------|
| @radix-ui/react-popover | 1.1.15 | **KEEP** | Used for combobox |
| cmdk | 1.1.1 | **KEEP** | Command palette base |
| shadcn/ui | (components) | **ADD COMBOBOX** | Need combobox for categories |

**Why keep/add:** shadcn/ui already has Select (2.2.6) and Command (from cmdk). Adding the Combobox component (which composes Popover + Command) provides searchable category dropdown without new npm dependencies.

### Date Handling
| Technology | Current Version | Status | Notes |
|------------|----------------|--------|-------|
| date-fns | 4.1.0 | **KEEP** | Already installed |

**Why keep:** date-fns 4.1.0 has `parse()` function for structured date parsing. Covers 80% of date parsing needs.

### Validation
| Technology | Current Version | Status | Notes |
|------------|----------------|--------|-------|
| zod | 4.3.5 | **KEEP** | Runtime validation |

**Why keep:** Already validates DetectedSubscription schema. Can extend for new fields (confidence, statementSource, extractedDate).

## Recommended Additions

### 1. Natural Language Date Parsing

| Library | Version | Size (gzipped) | Why |
|---------|---------|----------------|-----|
| chrono-node | ^2.9.0 | ~50KB | Parse "next Friday", "Jan 5", "in 3 weeks" |

**Purpose:** Extract renewal dates from transaction descriptions like "Netflix renewal on Feb 15" or "Spotify - next billing 3/1".

**Why chrono-node:**
- Most mature NLP date parser (518 npm projects use it)
- TypeScript-ready with excellent type definitions
- Handles relative dates ("in 2 weeks") and absolute ("Jan 15, 2026")
- Works with partial dates (month/day without year)
- 50KB gzipped is acceptable for improved UX
- Context-aware parsing with reference dates

**Alternatives considered:**
- `timelang` - Newer, less battle-tested (fewer downloads)
- `natural-language-date-parser` - More modular but adds complexity
- `date-fns parse()` - Already installed but requires exact format string (can't handle "next Friday")

**Installation:**
```bash
npm install chrono-node
```

**Integration point:**
```typescript
// In pdf-parser.ts or new date-extraction.ts
import * as chrono from 'chrono-node';

function extractRenewalDate(rawText: string): Date | null {
  const parsed = chrono.parseDate(rawText, new Date());
  if (parsed && parsed > new Date()) {
    return parsed; // Future date, likely renewal
  }
  return null;
}
```

**When NOT to use:** For parsing ISO date strings or known formats - use date-fns `parse()` instead.

### 2. shadcn/ui Combobox Component

| Component | Dependencies | Size | Why |
|-----------|--------------|------|-----|
| Combobox | Popover + Command (already installed) | ~2KB | Searchable category dropdown |

**Purpose:** Replace basic Select dropdown with searchable combobox for category management. Handles duplicates by allowing user to search/filter.

**Why Combobox:**
- Zero new npm dependencies (uses existing Popover + Command)
- Built-in keyboard navigation (arrow keys, enter, escape)
- Supports "create new category" option inline
- Standard shadcn/ui pattern users expect
- Accessible (WAI-ARIA compliant)

**Installation:**
```bash
npx shadcn@latest add combobox
```

**Integration point:**
```typescript
// In subscription form or import confirmation UI
<Combobox
  options={categories}
  value={selectedCategory}
  onChange={setSelectedCategory}
  placeholder="Select category..."
  allowCreate={true}
  onCreate={(name) => createCategory({ name })}
/>
```

**Why NOT Select:** Current Select component doesn't support search/filter. With 15+ default categories + user-created ones, scrolling becomes painful.

**Why NOT Command alone:** Command palette doesn't work well inline in forms. Combobox provides the dropdown UX users expect.

## Rejected Additions

### Pattern Recognition Libraries

**Rejected:** string-similarity, natural, compromise-dates, fuzzyset.js

**Why rejected:**
- OpenAI GPT-4o with structured outputs already handles pattern recognition
- Adding separate NLP libraries duplicates AI capability
- Increases bundle size unnecessarily
- Harder to maintain (two sources of truth)

**Instead:** Enhance OpenAI prompt with JSON schema for bank name extraction:
```typescript
const schema = {
  type: "object",
  properties: {
    subscriptions: {
      type: "array",
      items: {
        properties: {
          name: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 100 },
          statementSource: {
            type: "string",
            description: "Bank/card issuer name (e.g., 'Chase', 'Amex')"
          },
          extractedDate: {
            type: "string",
            description: "Any date mentioned in transaction text"
          }
        }
      }
    }
  }
};
```

**Rationale:** GPT-4o scored 100% on JSON schema compliance tests. It can detect bank names, extract dates from text, and score confidence better than regex patterns.

### Bank Statement Parser Libraries

**Rejected:** bankstatementparser (Python), statement-parser

**Why rejected:**
- All mature libraries are Python-based (not Node.js)
- SaaS solutions (Klippa, Docsumo) are expensive ($99+/mo)
- Current GPT-4o approach is working - just needs tuning

**Instead:** Keep GPT-4o vision + text extraction. The user feedback isn't about parsing failure - it's about:
1. Confidence thresholds being too high (AI filtered out valid items)
2. Missing metadata (bank name, extracted date)
3. Category duplicates (UI issue, not parsing issue)

### Additional Date Libraries

**Rejected:** luxon, dayjs, moment.js

**Why rejected:**
- date-fns 4.1.0 already installed and sufficient for structured dates
- chrono-node handles NLP dates
- Adding luxon/dayjs duplicates 90% of date-fns functionality
- Moment.js is deprecated (no longer recommended)

**Coverage:**
- Structured dates (2026-01-31): date-fns `parse()`
- Natural language (next Friday): chrono-node `parseDate()`
- Formatting/display: date-fns `format()`
- Calculations (add 30 days): date-fns `addDays()`

## Updated Dependencies

### package.json Additions
```json
{
  "dependencies": {
    "chrono-node": "^2.9.0"
  }
}
```

### shadcn/ui Component Additions
```bash
# Run this to add combobox component
npx shadcn@latest add combobox
```

**Note:** Combobox doesn't add npm dependencies - it's a composition component using existing Radix UI primitives (Popover, Command).

## Integration Architecture

### Enhanced AI Pipeline

**Current flow:**
```
PDF Upload → pdf2json → Text Extraction → GPT-4o → DetectedSubscription[]
```

**Enhanced flow:**
```
PDF Upload
  → pdf2json → Text Extraction
  → GPT-4o (with Structured Outputs + JSON Schema)
    → {
        subscriptions: [{
          name, amount, currency, frequency,
          confidence,           // NEW: 0-100 score
          statementSource,      // NEW: bank/card name
          rawText,              // existing
          extractedDate         // NEW: date from text
        }]
      }
  → Post-processing:
    - chrono-node parses extractedDate → nextRenewalDate
    - Validate with Zod
  → Return to UI
```

### OpenAI Structured Outputs Implementation

**Current approach:**
```typescript
// System prompt asks for JSON
// Response parsing: content.match(/\[[\s\S]*\]/)
// Manual validation
```

**New approach (use openai@6.16.0 feature):**
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o-2024-08-06", // Required for structured outputs
  messages: [...],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "subscription_extraction",
      strict: true, // Enforces schema compliance
      schema: {
        type: "object",
        properties: {
          subscriptions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                amount: { type: "number" },
                currency: { type: "string" },
                frequency: { type: "string", enum: ["monthly", "yearly"] },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 100,
                  description: "Confidence this is recurring (0-100)"
                },
                statementSource: {
                  type: "string",
                  description: "Bank or card issuer name"
                },
                rawText: { type: "string" },
                extractedDate: {
                  type: "string",
                  description: "Any date mentioned (e.g., 'Feb 15', 'next month')"
                }
              },
              required: ["name", "amount", "currency", "frequency", "confidence"],
              additionalProperties: false
            }
          }
        },
        required: ["subscriptions"],
        additionalProperties: false
      }
    }
  }
});

// NO parsing needed - guaranteed valid JSON matching schema
const result = JSON.parse(response.choices[0].message.content);
```

**Benefits:**
- 100% JSON schema compliance (GPT-4o-2024-08-06 scored perfect on tests)
- No more regex extraction or parsing errors
- Structured confidence scoring baked into schema
- Bank name extraction via `description` field guidance
- Type safety from schema to Zod validation

### Category Management Flow

**Current (problematic):**
```
<Select>
  {categories.map(c => <option>{c.name}</option>)}
  // Duplicates show multiple times
</Select>
```

**Enhanced:**
```typescript
// Deduplicate categories before rendering
const uniqueCategories = categories.reduce((acc, cat) => {
  const key = cat.userId ? `user-${cat.slug}` : `default-${cat.slug}`;
  if (!acc.has(key)) {
    acc.set(key, cat);
  }
  return acc;
}, new Map());

<Combobox
  options={Array.from(uniqueCategories.values())}
  value={selectedCategory}
  onChange={setSelectedCategory}
  filterFn={(cat, search) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  }
  allowCreate={true}
  onCreate={async (name) => {
    const category = await createCategory({
      name,
      slug: slugify(name),
      icon: "circle", // default
      color: "#6366f1" // default indigo
    });
    setSelectedCategory(category.id);
  }}
/>
```

**Benefits:**
- Search/filter for quick selection
- Inline category creation
- Deduplication logic centralizes fixes
- Keyboard navigation (accessibility)

## Migration Path

### Phase 1: OpenAI Structured Outputs (Zero new dependencies)

1. Update `parseTextForSubscriptions()` to use `response_format: json_schema`
2. Add confidence, statementSource, extractedDate to schema
3. Update DetectedSubscription Zod schema
4. Test with existing v1.0 PDFs

**Complexity:** Low
**Risk:** Low (backward compatible - just better JSON parsing)

### Phase 2: Add chrono-node (One new dependency)

1. `npm install chrono-node`
2. Create `extractRenewalDate(extractedDate: string)` helper
3. Use in confirmation UI to suggest renewal dates
4. Fall back to manual date picker if parsing fails

**Complexity:** Low
**Risk:** Low (optional enhancement - doesn't break existing flow)

### Phase 3: Add Combobox (Zero new dependencies)

1. `npx shadcn@latest add combobox`
2. Replace Select with Combobox in category dropdowns
3. Add deduplication logic to category queries
4. Add "Create category" option

**Complexity:** Medium
**Risk:** Low (UI-only change, doesn't affect data)

## Version Compatibility

### Current Environment
- Node.js: >=18 (from Next.js 16 requirements)
- TypeScript: ^5.x
- React: 19.2.3
- Next.js: 16.1.4

### Compatibility Check

| Library | Min Node | Min TS | React Peer Dep |
|---------|----------|--------|----------------|
| chrono-node@2.9.0 | >=12 | >=4.5 | N/A (no React) |
| openai@6.16.0 | >=18 | >=4.9 | N/A |
| Combobox (shadcn) | >=18 | >=5.0 | React 19 OK |

**Verdict:** All compatible with existing environment. No conflicts.

## Bundle Size Impact

### Current Bundle (relevant parts)
- openai: ~200KB (already included)
- date-fns: ~70KB (already included)
- @radix-ui/react-popover: ~15KB (already included)
- cmdk: ~12KB (already included)

### Added Size
- chrono-node: ~50KB gzipped
- Combobox component: ~2KB (composition, no new dependencies)

**Total impact:** +52KB gzipped

**Assessment:** Acceptable. The 50KB for chrono-node is justified by:
- Eliminating user frustration with manual date entry
- Supporting date extraction from 20+ formats
- Reducing support tickets ("why can't I enter 'next month'?")

## Testing Strategy

### Unit Tests (Vitest)
```typescript
// Test chrono-node integration
describe('extractRenewalDate', () => {
  it('parses relative dates', () => {
    expect(extractRenewalDate('next Friday')).toBeInstanceOf(Date);
  });

  it('parses absolute dates', () => {
    expect(extractRenewalDate('Feb 15, 2026')).toEqual(
      new Date(2026, 1, 15)
    );
  });

  it('returns null for past dates', () => {
    expect(extractRenewalDate('last month')).toBeNull();
  });
});

// Test OpenAI structured output schema
describe('parseTextForSubscriptions with structured outputs', () => {
  it('returns valid schema', async () => {
    const result = await parseTextForSubscriptions(sampleText);
    expect(result.subscriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          confidence: expect.any(Number),
          statementSource: expect.any(String)
        })
      ])
    );
  });
});
```

### E2E Tests (Playwright)
```typescript
// Test category combobox
test('search and select category', async ({ page }) => {
  await page.click('[data-testid="category-combobox"]');
  await page.fill('[data-testid="category-search"]', 'stream');
  await page.click('text=Streaming');
  expect(await page.inputValue('[data-testid="category-combobox"]'))
    .toBe('Streaming');
});

// Test inline category creation
test('create new category inline', async ({ page }) => {
  await page.click('[data-testid="category-combobox"]');
  await page.fill('[data-testid="category-search"]', 'Custom Cat');
  await page.click('text=Create "Custom Cat"');
  expect(await page.textContent('[data-testid="selected-category"]'))
    .toBe('Custom Cat');
});
```

## Performance Considerations

### OpenAI Structured Outputs
- **Impact:** Marginal increase in token usage (~5-10%) due to schema constraints
- **Benefit:** Zero post-processing time (no regex, no validation loops)
- **Net:** ~50ms slower per request, but eliminates parsing errors

### chrono-node
- **Impact:** ~10ms per date parsing call
- **Usage:** Only when extractedDate present (optional field)
- **Net:** Negligible (runs client-side or during confirmation step, not import)

### Combobox
- **Impact:** Renders all categories, could be slow with 100+ items
- **Mitigation:** Virtual scrolling (cmdk handles this), debounced search (300ms)
- **Net:** Smooth with <500 categories (unlikely user has this many)

## Security Considerations

### chrono-node
- No security concerns (pure date parsing, no eval or dynamic code)
- No network requests
- Regularly maintained (last update 4 months ago)

### OpenAI Structured Outputs
- Uses existing OpenAI SDK (already vetted)
- Schema validation server-side prevents injection
- No new attack surface

### Combobox
- Standard React component
- No innerHTML or dangerouslySetInnerHTML
- Sanitizes user input for category creation (slug generation)

## Cost Analysis

### Development Cost
- OpenAI structured outputs: ~4 hours (update schema, test)
- chrono-node integration: ~3 hours (install, helper, test)
- Combobox component: ~6 hours (install, dedupe logic, styling, test)
- **Total:** ~13 hours

### Operational Cost
- chrono-node: $0 (no runtime cost)
- Combobox: $0 (no runtime cost)
- OpenAI structured outputs: ~5% increase in API costs (more tokens per request)
  - Current: ~$0.01 per import (10K tokens @ $0.001/1K)
  - New: ~$0.0105 per import (+$0.0005)
  - **Impact:** Negligible at <1000 imports/month

### Maintenance Cost
- chrono-node: Low (stable library, infrequent updates)
- Combobox: Low (shadcn component, copy-paste updates)
- OpenAI schema: Medium (may need schema tweaks as models improve)

## Sources

- [chrono-node npm](https://www.npmjs.com/package/chrono-node)
- [chrono GitHub](https://github.com/wanasit/chrono)
- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)
- [OpenAI Structured Outputs Announcement](https://openai.com/index/introducing-structured-outputs-in-the-api/)
- [shadcn/ui Combobox](https://ui.shadcn.com/docs/components/combobox)
- [shadcn/ui Multi-Select Patterns](https://www.shadcn.io/patterns/combobox-multi-select-1)
- [date-fns parse documentation](https://date-fns.org/v4.1.0/docs/parse)
- [GPT-4o Structured Output Blog](https://old.onl/blog/structured-outputs-gpt-4o/)

## Decision Summary

**Add:**
1. chrono-node@^2.9.0 - Natural language date parsing
2. shadcn/ui Combobox component - Searchable category dropdown

**Don't Add:**
- Pattern recognition libraries (use GPT-4o instead)
- Bank statement parsers (GPT-4o already handles this)
- Additional date libraries (date-fns + chrono-node sufficient)

**Upgrade:**
- Nothing - existing openai@6.16.0 already supports structured outputs

**Overall Philosophy:**
Leverage existing AI capabilities (GPT-4o structured outputs) before adding specialized libraries. Only add dependencies when AI can't solve the problem (NLP date parsing) or when UX demands it (searchable dropdown).
