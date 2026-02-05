# PostHog post-wizard report

The wizard has completed a deep integration of your project with PostHog analytics. This integration includes:

- **Client-side tracking** via `instrumentation-client.ts` for automatic page views, exception capture, and client-side events
- **Server-side tracking** via `posthog-node` for capturing events from API routes
- **User identification** synced from Clerk authentication via webhook
- **Reverse proxy configuration** in `next.config.js` to route PostHog requests through your domain (avoiding ad blockers)

## Events Implemented

| Event Name | Description | File Path |
|------------|-------------|-----------|
| `user_signed_up` | New user account created via Clerk webhook | `src/app/api/webhooks/clerk/route.ts` |
| `property_created` | Landlord successfully creates a new property listing | `src/app/api/properties/route.ts` |
| `tenancy_application_submitted` | Tenant submits an application for a rental unit | `src/app/api/units/[id]/apply/route.ts` |
| `application_reviewed` | Landlord approves or rejects a tenancy application | `src/app/api/landlord/applications/[id]/route.ts` |
| `viewing_request_submitted` | Prospective tenant requests to view a unit | `src/app/api/units/[id]/viewing-request/route.ts` |
| `maintenance_request_created` | Tenant creates a new maintenance request | `src/app/api/tenant/maintenance/route.ts` |
| `message_sent` | User sends a message to another user | `src/app/api/messages/route.ts` |
| `contact_form_submitted` | User submits contact form inquiry | `src/app/api/contact/route.ts` |
| `offboarding_completed` | Landlord completes tenant move-out process | `src/app/api/offboarding/[id]/complete/route.ts` |
| `onboarding_step_completed` | Tenant completes a step in the onboarding flow | `src/app/onboarding/page.tsx` |
| `onboarding_submitted` | Tenant submits complete onboarding application | `src/app/onboarding/page.tsx` |

## Files Created/Modified

### New Files
- `instrumentation-client.ts` - Client-side PostHog initialization
- `src/lib/posthog-server.ts` - Server-side PostHog client

### Modified Files
- `next.config.js` - Added PostHog reverse proxy rewrites
- `src/app/api/properties/route.ts` - Added property_created event
- `src/app/api/units/[id]/apply/route.ts` - Added tenancy_application_submitted event
- `src/app/api/landlord/applications/[id]/route.ts` - Added application_reviewed event
- `src/app/api/webhooks/clerk/route.ts` - Added user_signed_up event and identify
- `src/app/api/units/[id]/viewing-request/route.ts` - Added viewing_request_submitted event
- `src/app/api/tenant/maintenance/route.ts` - Added maintenance_request_created event
- `src/app/api/messages/route.ts` - Added message_sent event
- `src/app/api/contact/route.ts` - Added contact_form_submitted event
- `src/app/api/offboarding/[id]/complete/route.ts` - Added offboarding_completed event
- `src/app/onboarding/page.tsx` - Added onboarding events

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/305549/dashboard/1205425) - Core business analytics dashboard

### Insights
- [User Signups Over Time](https://us.posthog.com/project/305549/insights/5dRUONFt) - Daily user signups trend
- [Signup to Application Funnel](https://us.posthog.com/project/305549/insights/Zr63ZbBw) - Conversion funnel from signup to application
- [Property Listings Created](https://us.posthog.com/project/305549/insights/LE8pNtiu) - New properties created over time
- [Application Review Outcomes](https://us.posthog.com/project/305549/insights/ci4XN88R) - Breakdown of approval vs rejection decisions
- [Tenant Onboarding Completion](https://us.posthog.com/project/305549/insights/ZQx8rDGm) - Onboarding step completion funnel

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
