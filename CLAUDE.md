# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Principles

Always use the DRY (Don't Repeat Yourself) principle when working in this codebase. Extract shared logic into reusable functions, constants, and components.

## Build & Development Commands

```bash
npm run dev          # Start dev server with Turbo
npm run build        # Production build
npm run lint         # Run ESLint
npm run db:push      # Push schema changes to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio for database management
npm run db:generate  # Generate migration files
```

### E2E Testing (Cypress)

```bash
npm run test:e2e       # Run all e2e tests (starts server automatically)
npm run test:e2e:open  # Open Cypress test runner interactively
npm run cy:open        # Open Cypress (requires running dev server)
npm run cy:run         # Run Cypress headless (requires running dev server)
npm run cy:clean       # Clean up test data
```

Run a single test file:
```bash
npx cypress run --spec "cypress/e2e/auth/login.cy.ts"
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL via Vercel Postgres with Drizzle ORM
- **Authentication**: Clerk (handles user sessions, protected routes)
- **File Uploads**: UploadThing
- **Search**: Algolia (property/unit search with geo capabilities)
- **Email**: Resend
- **Styling**: Tailwind CSS with shadcn/ui components

### Path Alias
Use `~/` to import from `src/` (e.g., `import { db } from "~/server/db"`)

### Database Schema (`src/server/db/schema.ts`)
Tables are prefixed with `t3test_` via `createTable()`. Core entities:
- `user` - Users with roles stored as JSON string (user/tenant/landlord)
- `properties` - Rental properties owned by landlords
- `units` - Individual units within properties
- `leases` - Lease agreements linking tenants to units
- `payments` - Payment records (always linked to a lease)
- `maintenanceRequests` - Maintenance tickets
- `tenantInvitations` / `tenantOnboardingProgress` - Tenant onboarding flow
- `tenantProfiles` / `employmentInfo` / `rentalHistory` / `references` / `emergencyContacts` / `tenantDocuments` - Extended tenant profile data
- `notifications` / `messages` - User communications

### User Roles (`src/lib/roles.ts`)
Roles are stored as JSON arrays in the `user.roles` text field. Three role types:
- `user` - Default role for all users
- `tenant` - Users renting units
- `landlord` - Property owners/managers

Use `parseRoles()`, `serializeRoles()`, `hasRole()`, `addRole()` helpers for role management.

### Protected Routes (`src/middleware.ts`)
Clerk middleware protects `/dashboard`, `/my-properties`, and `/messages` routes.

### API Routes (`src/app/api/`)
- `/api/properties/` - CRUD for properties and units
- `/api/tenant/` - Tenant profile, documents, maintenance requests
- `/api/onboarding/` - User onboarding flow
- `/api/webhooks/clerk/` - Clerk webhook handler
- `/api/uploadthing/` - File upload endpoints
- `/api/search/` - Algolia search proxy

### Environment Variables
Validated via `@t3-oss/env-nextjs` in `src/env.js`. Required:
- `POSTGRES_URL` - Database connection
- `RESEND_API_KEY` - Email service
- `ENCRYPTION_KEY` - 64 hex chars for AES-256-GCM (SSN encryption)
- `ALGOLIA_ADMIN_API_KEY` / `NEXT_PUBLIC_ALGOLIA_*` - Search
- Clerk keys (via ClerkProvider)
- UploadThing keys

### Cypress Testing
- Test fixtures in `cypress/fixtures/`
- Custom `cy.clerkLogin()` command for authentication via Clerk modal
- Test images available in `cypress/fixtures/images/`
