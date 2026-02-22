---
phase: 21
plan: 01
type: summary
subsystem: tags
tags: [database, api, hooks, tanstack-query]

dependency-graph:
  requires: [phase-19, phase-20]
  provides: [tags-schema, tags-api, tags-hooks]
  affects: [phase-21-02, phase-21-03, phase-21-04]

tech-stack:
  added: []
  patterns:
    - many-to-many junction table
    - user-scoped unique constraint
    - cascade delete for relationships

file-tracking:
  created:
    - src/lib/validations/tag.ts
    - src/app/api/tags/route.ts
    - src/app/api/tags/[id]/route.ts
    - src/lib/hooks/use-tags.ts
    - src/lib/db/migrations/0006_typical_captain_stacy.sql
  modified:
    - src/lib/db/schema.ts

decisions:
  - name: user-scoped unique names
    choice: uniqueIndex on (userId, name)
    why: Different users can have same tag name, but one user cannot have duplicates

metrics:
  duration: ~5 min
  completed: 2026-02-09
---

# Phase 21 Plan 01: Tags Schema & CRUD Foundation Summary

**One-liner:** Tags and transactionTags tables with full CRUD API and TanStack Query hooks.

## What Was Built

### Database Schema

Added two new tables to the schema:

1. **tags** table:
   - `id`: UUID primary key with random default
   - `userId`: UUID NOT NULL, references users.id with cascade delete
   - `name`: varchar(50) NOT NULL
   - `color`: varchar(7) NOT NULL (hex color like "#3B82F6")
   - `createdAt`: timestamp with timezone
   - Unique index on (userId, name) to prevent duplicate tag names per user

2. **transactionTags** junction table:
   - `transactionId`: UUID NOT NULL, references transactions.id with cascade delete
   - `tagId`: UUID NOT NULL, references tags.id with cascade delete
   - `createdAt`: timestamp with timezone
   - Composite primary key on (transactionId, tagId)
   - Indexes on transactionId and tagId for fast lookups

### Relations Added

- users -> many tags
- tags -> one user
- tags -> many transactionTags
- transactions -> many transactionTags
- transactionTags -> one transaction, one tag

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/tags | GET | List user's tags sorted by name |
| /api/tags | POST | Create new tag with name and color |
| /api/tags/[id] | GET | Get single tag by ID |
| /api/tags/[id] | PATCH | Update tag name or color |
| /api/tags/[id] | DELETE | Delete tag (cascades to transactionTags) |

All endpoints:
- Require authentication (401 if not logged in)
- Check user ownership for security (can only access own tags)
- Validate trial/billing status for mutations (403 if expired)
- Validate input with Zod schemas (400 for validation errors)

### React Query Hooks

| Hook | Description |
|------|-------------|
| useTags | Fetch all user's tags with 5min cache |
| useTag | Fetch single tag by ID |
| useCreateTag | Create tag with optimistic updates |
| useUpdateTag | Update tag with cache updates |
| useDeleteTag | Delete tag with transaction cache invalidation |
| useTagOptions | Transform tags for select/dropdown components |

## Decisions Made

1. **User-scoped uniqueness:** Tags are unique per user (userId, name), not globally. This allows different users to have tags with the same name.

2. **Cascade deletes:** When a tag is deleted, all transactionTags linking to it are automatically deleted. When a user is deleted, all their tags are deleted.

3. **No slug field:** Unlike categories, tags don't need slugs since they're not used in URLs.

4. **Simple structure:** Tags only have name and color - no icon, sortOrder, or isDefault like categories.

## Commits

| Hash | Message |
|------|---------|
| e0dbe3e | feat(21-01): add tags and transactionTags tables to schema |
| 2ac9f61 | feat(21-01): add tag validation schemas and API routes |
| d7ccf28 | feat(21-01): add TanStack Query hooks for tags |

## Deviations from Plan

None - plan executed exactly as written.

## Migration Generated

File: `src/lib/db/migrations/0006_typical_captain_stacy.sql`

Creates:
- tags table with user foreign key and unique index
- transaction_tags junction table with composite primary key
- Foreign key constraints with cascade delete
- Indexes for efficient lookups

Run with: `npm run db:push` or `npm run db:migrate`

## Next Phase Readiness

Phase 21-02 (Tag Management UI) can proceed:
- Tags table exists with CRUD operations ready
- useTags hook available for fetching tags in UI
- useCreateTag, useDeleteTag ready for management components
- useTagOptions ready for dropdown/select components
