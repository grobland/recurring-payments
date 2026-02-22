# Phase 1: Service Configuration - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure all external service integrations (OpenAI, Stripe, Resend) and deploy the app to Vercel preview environment. This is infrastructure/configuration work — getting the app deployable with working API connections. Feature verification happens in later phases.

</domain>

<decisions>
## Implementation Decisions

### Environment structure
- Claude's discretion on file organization (single .env.local locally, Vercel dashboard for preview/production)
- All API keys need to be created from scratch
- Stripe: test mode keys only (no live mode for now)
- Include links to API key creation pages in planning docs

### Verification method
- Manual quick checks for each service
- OpenAI: verify API key works with any successful API call (actual PDF import tested in Phase 2)
- Resend: send an actual test email and confirm receipt in inbox
- Stripe: confirm test mode keys are accepted
- Provide step-by-step checklist format for verification

### Deployment setup
- Create new Vercel account and project
- Connect via GitHub integration for auto-deploy on push
- Use default Vercel URL (project-name.vercel.app) — no custom domain needed
- Repo is already on GitHub, ready for integration

### Claude's Discretion
- Exact .env file organization
- Order of service configuration
- Specific verification commands/endpoints
- Vercel project settings beyond basics

</decisions>

<specifics>
## Specific Ideas

- User needs guidance — include links to each service's API key creation page
- Verification should be checklist format: "Do X, expect Y, check box"
- Stripe test mode is sufficient for this milestone

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-service-configuration*
*Context gathered: 2026-01-26*
