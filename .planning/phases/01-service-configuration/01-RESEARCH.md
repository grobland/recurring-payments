# Phase 1: Service Configuration - Research

**Researched:** 2026-01-26
**Domain:** External service integration and deployment infrastructure
**Confidence:** HIGH

## Summary

This phase focuses on configuring four external services (OpenAI, Stripe, Resend, Vercel) and deploying the Next.js application to a preview environment. The standard approach involves creating API keys from each service provider, storing them as environment variables following Next.js conventions, and using Vercel's native GitHub integration for automated deployments.

Research confirms that all four services have straightforward API key creation processes and official Next.js/Vercel integration documentation. The main pitfalls involve environment variable security (NEXT_PUBLIC_ prefix misuse), service-specific gotchas (Stripe test mode vs live mode, Resend domain verification), and deployment configuration errors.

**Primary recommendation:** Follow the "configure locally, verify with simple test, deploy to Vercel" workflow. Use `.env.local` for local development, Vercel dashboard for preview/production environment variables, and manual verification with minimal API calls before proceeding to feature development.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library/Service | Version | Purpose | Why Standard |
|-----------------|---------|---------|--------------|
| Vercel | Current | Deployment platform | Official Next.js deployment platform, seamless GitHub integration, automatic preview URLs |
| Next.js env vars | Built-in | Environment variable management | Native Next.js feature, supports build-time and runtime variables, NEXT_PUBLIC_ prefix for client exposure |
| openai | 6.16.0 (installed) | OpenAI API client | Official Node.js library from OpenAI, handles authentication and API calls |
| stripe | 20.2.0 (installed) | Stripe payments API client | Official Stripe Node.js library, required for server-side payment operations |
| resend | 6.8.0 (installed) | Email delivery API client | Official Resend Node.js library, modern email API designed for developers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vercel CLI | Latest | Local deployment testing, env pulling | When testing deployment configuration locally or pulling environment variables |
| dotenv | 17.2.3 (installed) | Load .env files | Already in package.json as dev dependency, useful for non-Next.js scripts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel | Netlify, Render, Railway | Vercel has deepest Next.js integration (same company), automatic optimizations |
| Resend | SendGrid, Mailgun, AWS SES | Resend has simpler API, better developer experience, but smaller market share |
| GitHub integration | Manual deployments | Auto-deploy provides instant previews for every push, critical for iteration speed |

**Installation:**
All required libraries already installed via package.json. No additional packages needed for this phase.

## Architecture Patterns

### Recommended Environment Variable Structure

**Local Development (.env.local):**
```bash
# Service API Keys (Server-only, NO NEXT_PUBLIC_ prefix)
OPENAI_API_KEY="sk-proj-..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
RESEND_API_KEY="re_..."

# Configuration (Client-accessible, NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Vercel Dashboard Configuration:**
- Production environment: Live API keys (when ready)
- Preview environment: Same test API keys as local development
- Development environment: For `vercel dev` command (same as Preview)

### Pattern 1: Environment Variable Loading Flow

**What:** Next.js automatically loads environment variables from .env files in priority order
**When to use:** All phases, this is the standard Next.js behavior

**Priority Order (highest to lowest):**
```
1. process.env (system environment variables)
2. .env.$(NODE_ENV).local (.env.development.local, .env.production.local, etc.)
3. .env.local (loaded for all environments except test)
4. .env.$(NODE_ENV) (.env.development, .env.production, .env.test)
5. .env
```

**Example:**
```typescript
// src/lib/openai.ts
// Source: https://nextjs.org/docs/pages/guides/environment-variables

// Server-only - NO NEXT_PUBLIC_ prefix
const apiKey = process.env.OPENAI_API_KEY; // ✅ Only available on server

// Client-accessible - REQUIRES NEXT_PUBLIC_ prefix
const appUrl = process.env.NEXT_PUBLIC_APP_URL; // ✅ Available on client and server
```

### Pattern 2: Service Client Initialization

**What:** Initialize service clients once and export for reuse
**When to use:** For all external service integrations

**Example:**
```typescript
// src/lib/stripe.ts
// Source: Stripe best practices - https://docs.stripe.com/keys

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia', // Pin API version
  typescript: true,
});
```

### Pattern 3: Vercel GitHub Integration (Auto-Deploy)

**What:** Vercel automatically deploys every push to GitHub
**When to use:** Standard workflow for all Vercel projects

**Behavior:**
- Push to `main` branch → Production deployment
- Push to any other branch → Preview deployment (unique URL)
- Pull request → Preview deployment + comment with URL
- Auto-cancellation: Latest commit cancels previous queued builds on same branch

**Source:** https://vercel.com/docs/git/vercel-for-github

### Pattern 4: Environment Variable Verification Checklist

**What:** Systematic verification of each service before feature development
**When to use:** At the end of this phase, before Phase 2

**Checklist Format:**
```markdown
## OpenAI API Key Verification
- [ ] API key created at https://platform.openai.com/api-keys
- [ ] OPENAI_API_KEY set in .env.local
- [ ] Test command runs successfully: curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
- [ ] Returns JSON response with model list (not error)
```

### Anti-Patterns to Avoid

- **Hardcoding API keys in source code:** NEVER commit actual API keys to git, even in examples
- **Using NEXT_PUBLIC_ for secrets:** Client-exposed variables are embedded in JavaScript bundle, visible to anyone
- **Dynamic env lookups:** `process.env[varName]` won't work, Next.js inlines at build time
- **Committing .env.local:** Already in .gitignore, but double-check before commits
- **Missing error handling:** Always check for undefined environment variables before using them

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Environment variable loading | Custom .env parser | Next.js built-in env support | Next.js automatically loads .env files, handles precedence, supports NEXT_PUBLIC_ |
| API key validation | Custom curl scripts | Service-specific test endpoints | Each service has official test endpoints designed for verification |
| Deployment automation | Custom GitHub Actions | Vercel GitHub integration | Native integration handles build detection, environment variables, preview URLs automatically |
| Environment variable type safety | Runtime checks everywhere | TypeScript + validation at app startup | Centralize validation in one place, fail fast on missing vars |
| Email deliverability | Custom SMTP configuration | Resend's managed infrastructure | Resend handles DKIM, SPF, DMARC, deliverability optimization |

**Key insight:** This phase is entirely infrastructure/configuration work. There's no need to build custom tooling—every problem has a standard solution from the service providers or Next.js itself.

## Common Pitfalls

### Pitfall 1: NEXT_PUBLIC_ Prefix Misuse

**What goes wrong:** Developers add NEXT_PUBLIC_ to API keys thinking it makes them "available everywhere," exposing secrets to client-side code visible in browser DevTools.

**Why it happens:** The prefix name is misleading—"public" sounds like it means "available in the codebase" rather than "embedded in public JavaScript bundle."

**How to avoid:**
- Rule: NEVER use NEXT_PUBLIC_ for API keys, secrets, or credentials
- Only use NEXT_PUBLIC_ for truly public values: app URLs, feature flags, analytics IDs
- Verify after build: Check `.next/static/chunks` for exposed secrets

**Warning signs:**
- Environment variable works locally but not in Vercel → likely needs to be re-added to Vercel dashboard
- API calls fail with "undefined API key" on client components → trying to access server-only var

**Source:** https://nextjs.org/docs/app/guides/data-security

### Pitfall 2: Stripe Test vs. Live Mode Confusion

**What goes wrong:** Developers accidentally use live mode keys during development, creating real charges or using test mode keys in production where they fail.

**Why it happens:** Stripe provides both test and live keys in the same dashboard, differentiated only by prefix (sk_test_ vs sk_live_).

**How to avoid:**
- Phase 1 scope: ONLY test mode keys (sk_test_, pk_test_)
- Verify key prefix before adding to environment variables
- For this milestone (v1.0), no live mode keys are needed
- Test mode indicator: Stripe dashboard shows "Test Mode" badge when viewing test keys

**Warning signs:**
- Stripe API calls return errors mentioning "test mode" or "live mode"
- Unable to see test transactions in Stripe dashboard → using live key in test mode dashboard

**Source:** https://docs.stripe.com/keys

### Pitfall 3: Resend Domain Verification Required for Production

**What goes wrong:** Test emails work locally using Resend's default domain, but production emails fail or land in spam because custom domain isn't verified.

**Why it happens:** Resend allows sending from default domain (@resend.dev) without verification, but deliverability is limited.

**How to avoid:**
- Phase 1 scope: Use Resend test email addresses (delivered@resend.dev)
- For production (later): Verify custom domain with DNS records (DKIM, SPF, DMARC)
- Test emails with Resend test addresses don't require domain verification
- Note: Domain verification is OUT OF SCOPE for Phase 1 (just testing API key works)

**Warning signs:**
- Emails sending successfully but not arriving in inbox → check spam, verify domain
- Resend API returns domain verification errors → need to add DNS records

**Source:** https://resend.com/docs/dashboard/emails/send-test-emails

### Pitfall 4: Vercel Environment Variable Updates Don't Apply Retroactively

**What goes wrong:** Developer adds environment variable in Vercel dashboard, expects existing deployment to use it immediately, but it continues failing.

**Why it happens:** Environment variables are frozen at build time for each deployment. Changes only apply to NEW deployments.

**How to avoid:**
- After adding/changing env vars in Vercel dashboard: Trigger new deployment (push commit or manual redeploy)
- Use Vercel's "Redeploy" button to rebuild existing commit with new env vars
- For NEXT_PUBLIC_ vars: Always require rebuild (embedded at build time)

**Warning signs:**
- "I added the env var but it's still undefined" → need to redeploy
- Different behavior between preview and production → env vars out of sync

**Source:** https://vercel.com/docs/environment-variables

### Pitfall 5: OpenAI API Quota/Rate Limits

**What goes wrong:** API key works initially but starts failing with quota errors after a few test requests.

**Why it happens:** New OpenAI accounts have low initial rate limits and may require payment method for higher usage.

**How to avoid:**
- Verify OpenAI account has payment method added (required for production use)
- Check usage limits at https://platform.openai.com/account/limits
- For Phase 1: One simple test call is sufficient (don't spam the API)
- Actual PDF processing happens in Phase 2 (separate verification)

**Warning signs:**
- API returns "insufficient_quota" error → no credits remaining
- API returns 429 rate limit errors → too many requests too quickly

**Source:** https://platform.openai.com/docs/guides/rate-limits

### Pitfall 6: Missing .gitignore for Environment Files

**What goes wrong:** Developer commits .env.local with actual API keys to git, exposing secrets publicly if repo is public or to all team members.

**Why it happens:** Forgetting to add .env files to .gitignore, or using different file names.

**How to avoid:**
- Project ALREADY has .gitignore with `.env*` pattern (verified)
- Still verify before commits: `git status` should NOT show .env.local
- Use pre-commit hooks (future enhancement) to block env file commits
- For this project: .gitignore already correct, no changes needed

**Warning signs:**
- Git showing .env.local as modified/untracked → check .gitignore
- Secrets leaked in git history → rotate all API keys immediately

**Source:** https://nextjs.org/docs/pages/guides/environment-variables

## Code Examples

Verified patterns from official sources:

### Example 1: Environment Variable Validation at Startup

```typescript
// src/lib/env.ts
// Pattern: Validate all required env vars at app startup, fail fast
// Source: Next.js security best practices

const requiredEnvVars = [
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'RESEND_API_KEY',
] as const;

export function validateEnvVars() {
  const missing = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file.`
    );
  }
}

// Call in layout.tsx or middleware to validate on server startup
```

### Example 2: Simple OpenAI API Test (Minimal Cost)

```bash
# Test 1: List models (free, no usage)
# Source: https://platform.openai.com/docs/api-reference/models
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Expected response: JSON array of models
# Success indicator: Status 200, contains "data": [...]
# Failure: 401 Unauthorized (invalid key) or 429 (rate limit)
```

### Example 3: Resend Test Email

```bash
# Test: Send to Resend test address (no domain verification needed)
# Source: https://resend.com/docs/dashboard/emails/send-test-emails
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "delivered@resend.dev",
    "subject": "Test Email from Subscription Manager",
    "text": "If you receive this, Resend API key is working!"
  }'

# Expected response: {"id": "...", "from": "...", "to": [...]}
# Success indicator: Status 200, returns email ID
# Check: delivered@resend.dev is a test address that always succeeds
```

### Example 4: Stripe API Key Verification

```bash
# Test: Retrieve Stripe account details (confirms authentication)
# Source: https://docs.stripe.com/api/account
curl https://api.stripe.com/v1/account \
  -u $STRIPE_SECRET_KEY:

# Expected response: JSON with account details, "livemode": false for test keys
# Success indicator: Status 200, "object": "account"
# Verify: "livemode": false confirms test mode key
```

### Example 5: Vercel Environment Variable Setup (CLI)

```bash
# Pull development environment variables from Vercel to local .env
# Source: https://vercel.com/docs/cli/env
vercel env pull .env.local

# This creates/updates .env.local with all variables from Vercel's Development environment
# Only needed if using vercel dev or want to sync with team's env vars
# For Phase 1: Manual .env.local creation is simpler (no Vercel CLI needed yet)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Vercel CLI deploys | GitHub integration auto-deploy | Vercel v2 (2020) | Preview URLs on every push, no manual deployment steps |
| .env committed to git | .env.local gitignored | Next.js 9.4 (2020) | Prevents accidental secret exposure |
| Multiple env management tools | Next.js built-in .env support | Next.js 9.4 (2020) | No need for dotenv package in Next.js code |
| Vercel environment variables via CLI only | Dashboard + CLI + vercel env pull | Vercel platform (2021) | Easier team sync, less manual copying |
| Stripe Checkout (redirect) | Stripe Elements (embedded) | Stripe 2019+ | Better UX, but not relevant for Phase 1 (configuration only) |

**Deprecated/outdated:**
- `next.config.js env: {}` object: Previously exposed all env vars to client, now deprecated in favor of NEXT_PUBLIC_ prefix
- Vercel's `now` CLI: Replaced with `vercel` CLI (renamed ~2020)
- `@next/env` for runtime env loading: Only needed for non-Next.js contexts (ORM config, test runners)

## Open Questions

Things that couldn't be fully resolved:

1. **OpenAI API rate limits for new accounts**
   - What we know: Rate limits vary by account tier, payment method required for production
   - What's unclear: Exact limits for free tier in 2026 (documentation not version-specific)
   - Recommendation: Verify during Phase 1 with test call, document actual limits encountered

2. **Resend email deliverability without custom domain**
   - What we know: Test addresses (delivered@resend.dev) work without verification
   - What's unclear: Whether production emails from resend.dev domain will be reliable
   - Recommendation: Use test addresses for Phase 1-4, add custom domain verification in future milestone

3. **Vercel preview environment naming convention**
   - What we know: Each preview deployment gets unique URL based on branch name
   - What's unclear: Exact URL format for branch names with special characters
   - Recommendation: Document actual preview URL received after first deployment

## Sources

### Primary (HIGH confidence)
- [Next.js Environment Variables Guide](https://nextjs.org/docs/pages/guides/environment-variables) - Official Next.js documentation
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables) - Official Vercel documentation
- [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github) - Official GitHub integration docs
- [Stripe API Keys Documentation](https://docs.stripe.com/keys) - Official Stripe documentation
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security) - Official security best practices

### Secondary (MEDIUM confidence)
- [LogRocket: Next.js Environment Variables](https://blog.logrocket.com/configure-environment-variables-next-js/) - Verified with official docs
- [Medium: Common Deployment Mistakes (Jan 2026)](https://meetpan1048.medium.com/how-to-deploy-a-next-js-app-with-environment-variables-common-mistakes-explained-59e52aadd7e0) - Recent real-world issues
- [Resend API Documentation](https://resend.com/docs/api-reference/api-keys/create-api-key) - Official API reference
- [Vercel Troubleshooting Build Errors](https://vercel.com/docs/deployments/troubleshoot-a-build) - Official troubleshooting guide

### Tertiary (LOW confidence)
- WebSearch results for OpenAI curl verification commands - Common community patterns but not from official OpenAI docs (API reference was 403)
- API key tester tools (trevorfox.com, apicheckers.com) - Third-party validators, useful for testing but not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json, official documentation verified
- Architecture: HIGH - Next.js and Vercel patterns are well-documented and stable
- Pitfalls: HIGH - Based on official documentation security guides and recent community issues
- Verification commands: MEDIUM - Curl examples verified with secondary sources, OpenAI official docs returned 403

**Research date:** 2026-01-26
**Valid until:** ~2026-03-26 (60 days) - Infrastructure configuration patterns are stable, but API versions and Vercel features may update. Service API key creation UIs change infrequently.

**Notes:**
- All required libraries already installed in package.json
- Project already has correct .gitignore configuration
- .env.example already has all required variables listed
- No code changes needed in this phase, only configuration and verification
