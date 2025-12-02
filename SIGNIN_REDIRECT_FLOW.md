# Sign-In Redirect Flow

## Overview
Updated the authentication flow so that unauthenticated users accessing the onboarding page are redirected to the home page with the sign-in modal automatically opened, then redirected back after signing in.

## Changes Made

### 1. Onboarding Page (`src/app/onboarding/page.tsx`)
- Changed redirect from `/sign-in?redirect_url=...` to `/?sign-in=true&redirect_url=...`
- Now redirects to home page with query parameters instead of a non-existent sign-in page

### 2. Navbar Component (`src/components/Navbar.tsx`)

#### Added Imports
- `useSearchParams` from Next.js navigation
- `useRef` from React

#### New State & Refs
- `signInButtonRef`: Reference to the sign-in button for programmatic clicking

#### Auto-Open Sign-In Modal
Added new `useEffect` that:
- Checks if user is not signed in
- Checks if URL contains `sign-in=true` parameter
- Automatically clicks the sign-in button to open the modal

#### Updated SignInButton
- Added `forceRedirectUrl` prop that reads from `redirect_url` query parameter
- Added `ref` to the Button component for programmatic clicking
- Clerk will redirect to the URL specified in `forceRedirectUrl` after successful sign-in

## User Flow

```
1. User clicks tenant invitation link
   Example: /onboarding?token=abc123
   ↓
2. Onboarding page checks authentication
   ↓
3a. If NOT authenticated:
    → Redirects to: /?sign-in=true&redirect_url=/onboarding?token=abc123
    ↓
4. Home page loads
   ↓
5. Navbar detects sign-in=true parameter
   ↓
6. Navbar automatically clicks sign-in button
   ↓
7. Clerk sign-in modal opens
   ↓
8. User signs in or signs up
   ↓
9. Clerk redirects to: /onboarding?token=abc123
   ↓
10. Onboarding page validates email matches invitation
    ↓
11. User can complete onboarding form
```

## Technical Details

### Query Parameters
- `sign-in=true`: Triggers automatic opening of sign-in modal
- `redirect_url`: URL to redirect to after successful authentication

### Clerk Integration
- Uses `SignInButton` with `mode="modal"` for modal experience
- Uses `forceRedirectUrl` prop to specify post-authentication redirect
- Leverages Clerk's built-in redirect functionality

### Component Architecture
- Navbar is a client component that can read URL params and manipulate refs
- Home page remains a server component
- Sign-in logic is handled entirely in the Navbar (which is rendered on every page)

## Benefits

1. **No 404 Errors**: Users always land on a valid page (home)
2. **Better UX**: Users see the home page with familiar navigation
3. **Seamless Flow**: Modal opens automatically, no extra clicks needed
4. **Secure**: Still validates email matches invitation after sign-in
5. **Preserves Context**: Redirect URL preserves the original invitation token

## Testing

To test the flow:
1. Sign out if currently signed in
2. Click an onboarding invitation link
3. Verify you're redirected to home page
4. Verify sign-in modal opens automatically
5. Sign in with the email that matches the invitation
6. Verify you're redirected back to onboarding page
7. Verify onboarding form is displayed
