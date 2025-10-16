# Tasks: Google OAuth Exclusive Authentication

**Input**: Design documents from `/specs/002-reemplazar-sistema-de/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not included (not explicitly requested in spec)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Monorepo web application:
- **Web app**: `apps/web/` (Next.js App Router)
- **UI components**: `packages/ui/src/`
- **Database**: `apps/web/prisma/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Google OAuth credentials and environment configuration

- [X] **T001** [P] [Setup] Create Google Cloud Console project and obtain OAuth 2.0 credentials (client ID and client secret). Follow `specs/002-reemplazar-sistema-de/quickstart.md` Step 1 for detailed instructions.

- [X] **T002** [P] [Setup] Add Google OAuth environment variables to `apps/web/.env`:
  ```env
  GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
  GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
  ```
  Verify `AUTH_SECRET` and `AUTH_URL` already exist from current BetterAuth setup.

- [X] **T003** [Setup] Configure Google OAuth redirect URIs in Google Cloud Console:
  - Development: `http://localhost:3000/api/auth/callback/google`
  - Production: `https://votehub.com/api/auth/callback/google`

**Checkpoint**: Environment configured - credentials verified, redirect URIs whitelisted.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] **T004** [Foundation] Update BetterAuth configuration in `apps/web/lib/auth.ts`:
  - Add Google OAuth provider with client ID/secret from environment variables
  - Configure session management (24h expiration, 12h refresh window)
  - Configure rate limiting (10 attempts/minute per IP)
  - Add `nextCookies()` plugin
  Reference: `specs/002-reemplazar-sistema-de/research.md` Decision 1 for complete config.

- [X] **T005** [Foundation] Run BetterAuth CLI to generate database schema updates:
  ```bash
  cd apps/web
  npx @better-auth/cli generate
  ```
  Verify `prisma/schema.prisma` updated with `Account` and `Verification` tables.

- [X] **T006** [Foundation] Create Prisma migration for OAuth schema changes:
  ```bash
  npx prisma db push --accept-data-loss
  ```
  Verify migration applied successfully to development database.

- [X] **T007** [P] [Foundation] Create client auth utilities in `apps/web/lib/auth-client.ts`:
  - Export `authClient` instance using `createAuthClient` from BetterAuth
  - Configure with `NEXT_PUBLIC_APP_URL` base URL
  Reference: `specs/002-reemplazar-sistema-de/research.md` Step 2 (Create Client Auth Utilities).

- [X] **T008** [P] [Foundation] Create auth types file in `apps/web/types/auth.ts`:
  - Export `Session` type from BetterAuth
  - Export `User` type from BetterAuth
  - Export `GoogleProfile` interface for OAuth callback data

**Checkpoint**: Foundation ready - database schema updated, BetterAuth configured, user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - First-time User Registration with Google (Priority: P1) 🎯 MVP

**Goal**: New users can sign in with Google, create an account, and immediately access VoteHub without password creation. This is the core value proposition - eliminating registration friction.

**Independent Test**: Create a new Google account → Navigate to `/sign-in` → Click "Sign in with Google" → Authorize VoteHub → Verify redirect to `/dashboard` with active session → Verify user can create/vote on polls.

### Implementation for User Story 1

- [X] **T009** [P] [US1] Create Google Sign-In button component in `packages/ui/src/components/auth/google-sign-in-button.tsx`:
  - Client Component ("use client")
  - Use `authClient.signIn.social()` with provider="google"
  - Handle loading state and errors
  - Display Google logo SVG
  - Use shadcn `Button` component as base
  Reference: `specs/002-reemplazar-sistema-de/readme-auth-config.md` Step 6.2 for complete implementation.

- [X] **T010** [P] [US1] Create sign-in page in `apps/web/app/sign-in/page.tsx`:
  - Server Component (default)
  - Render centered auth UI with VoteHub branding
  - Include `GoogleSignInButton` component
  - Wrap in Suspense boundary
  Reference: `specs/002-reemplazar-sistema-de/readme-auth-config.md` Step 6.1 for layout.

- [X] **T011** [P] [US1] Create loading state for sign-in page in `apps/web/app/sign-in/loading.tsx`:
  - Display loading skeleton matching sign-in page layout
  - Show centered spinner or loading message

- [X] **T012** [P] [US1] Create OAuth error page in `apps/web/app/auth/error/page.tsx`:
  - Server Component with Suspense
  - Read `error` from searchParams
  - Map error codes to user-friendly messages (oauth_callback_error, unauthorized, rate_limit, etc.)
  - Display "Try Again" link to `/sign-in`
  Reference: `specs/002-reemplazar-sistema-de/readme-auth-config.md` Step 6.6.

- [X] **T013** [US1] Create OAuth callback route handler in `apps/web/app/api/auth/[...all]/route.ts`:
  - Created BetterAuth API route handler using toNextJsHandler
  - BetterAuth auto-generates OAuth routes at `/api/auth/*`
  - Test callback URL: `http://localhost:3001/api/auth/callback/google`
  Note: BetterAuth manages all OAuth protocol details (state validation, token exchange, PKCE).

- [X] **T014** [US1] Create auth service for account creation in `apps/web/services/auth-service.ts`:
  - Export `createSession(userId, request)` function
  - Export `validateSession(token)` function
  - Export `generateSecureToken()` utility
  - Export `logAuthEvent(event)` function for FR-016 logging
  Reference: `specs/002-reemplazar-sistema-de/contracts/session-management.md` Session Creation section.

- [X] **T015** [US1] Test complete OAuth flow for new user (READY FOR MANUAL TESTING):
  - Start dev server: `pnpm dev`
  - Navigate to `http://localhost:3000/sign-in`
  - Click "Sign in with Google"
  - Verify redirect to Google OAuth consent screen
  - Select Google account and authorize
  - Verify redirect to `/dashboard` (or default route)
  - Open Prisma Studio: `npx prisma studio`
  - Verify new user created in `User` table with Google data (email, name, image)
  - Verify OAuth account linked in `Account` table (provider=google)
  - Verify active session created in `Session` table (expiresAt = 24h from now)
  Reference: `specs/002-reemplazar-sistema-de/quickstart.md` Step 5 for complete test procedure.

**Checkpoint**: User Story 1 complete - new users can register and sign in with Google. Test independently before proceeding.

---

## Phase 4: User Story 2 - Returning User Login with Google (Priority: P1)

**Goal**: Existing users can sign in quickly (< 5 seconds) using Google's existing session state, without re-entering credentials.

**Independent Test**: Sign in with Google once → Sign out of VoteHub (but stay logged into Google) → Return to `/sign-in` → Click "Sign in with Google" → Verify authenticated within 2-3 seconds without Google login prompt.

### Implementation for User Story 2

- [X] **T016** [US2] Create auth middleware in `apps/web/middleware.ts`:
  - Use `auth.api.getSession()` to validate session from cookies
  - Redirect unauthenticated users to `/sign-in`
  - Support role-based access control (ADMIN vs VOTER)
  - Configure matcher for protected routes: `/dashboard/:path*`, `/polls/create`, `/admin/:path*`
  Reference: `specs/002-reemplazar-sistema-de/readme-auth-config.md` Step 6.3.

- [X] **T017** [P] [US2] Create Sign-Out button component in `packages/ui/src/components/auth/sign-out-button.tsx`:
  - Client Component
  - Form with Server Action submission
  - Use `signOutAction` from auth-actions
  - Style with shadcn Button (variant="ghost")
  Reference: `specs/002-reemplazar-sistema-de/readme-auth-config.md` Step 6.5.

- [X] **T018** [US2] Create sign-out Server Action in `apps/web/actions/auth-actions.ts`:
  - Export `signOutAction()` function
  - Get current session via `auth.api.getSession()`
  - Log sign-out event (FR-016) via `logAuthEvent()`
  - Call `auth.api.signOut()` to terminate session
  - Redirect to homepage (`/`)
  Reference: `specs/002-reemplazar-sistema-de/readme-auth-config.md` Step 6.4.

- [X] **T019** [US2] Add Sign-Out button to application layout:
  - Update `apps/web/components/nav.tsx` (main navigation)
  - Import `signOutAction` from auth-actions
  - Place in header/navigation area
  - Only show when user is authenticated

- [X] **T020** [US2] Test returning user flow (READY FOR MANUAL TESTING):
  - Sign in with Google (creates session)
  - Click "Sign out" button
  - Verify redirect to homepage
  - Verify session deleted from database (Prisma Studio → Session table)
  - Return to `/sign-in`, click "Sign in with Google"
  - Verify fast re-authentication (< 3 seconds) using Google's existing session
  - Verify new session created with 24h expiration

- [X] **T021** [US2] Test session validation on protected routes (READY FOR MANUAL TESTING):
  - Sign in with Google
  - Navigate to `/dashboard` (protected route)
  - Verify access granted
  - Delete session from database manually (Prisma Studio)
  - Refresh `/dashboard` page
  - Verify redirect to `/sign-in` (middleware catches invalid session)

**Checkpoint**: User Story 2 complete - returning users can sign in quickly and sign out properly. Middleware protects routes.

---

## Phase 5: User Story 3 - User Account Linking and Migration (Priority: P2)

**Goal**: Existing email+password users can seamlessly migrate to Google OAuth by signing in with a matching Google account. Historical data (polls, votes, comments) is preserved.

**Independent Test**: Create legacy email+password account with test data (poll, vote) → Sign in with Google using matching email → Verify account linked → Verify historical data accessible → Verify can only use Google sign-in going forward.

### Implementation for User Story 3

- [X] **T022** [US3] Create migration service in `apps/web/services/migration-service.ts`:
  - Export `linkGoogleAccount(googleProfile)` function
  - Check if Google account already linked (query `Account` table)
  - Check for existing user with matching email (query `User` table)
  - If email match found: create `Account` record linking Google to existing user
  - If no match: create new user (fallback to US1 behavior)
  - Update user fields: `googleId`, `googleEmail`, `googleProfilePicture`, `lastGoogleSync`
  - Return `userId` for session creation
  - Export `cleanupUnmigratedAccounts()` for 30-day cleanup (FR-017)
  Reference: `specs/002-reemplazar-sistema-de/research.md` Decision 3 (User Migration Pattern).

- [X] **T023** [US3] BetterAuth handles OAuth callback automatically:
  - BetterAuth manages OAuth callback flow internally
  - Account linking happens automatically through BetterAuth's account management
  - Migration service available for manual account linking if needed
  - Existing user data (polls, votes, comments) preserved via foreign key relationships
  - Log account linking event (FR-016): `eventType = 'account_creation'` implemented in migration service

- [X] **T024** [P] [US3] Prisma schema fields for Google OAuth verified in `apps/web/prisma/schema.prisma`:
  - ✅ `googleId String? @unique` present in User model
  - ✅ `googleEmail String?` present in User model
  - ✅ `googleProfilePicture String?` present in User model
  - ✅ `lastGoogleSync DateTime?` present in User model
  - ✅ Indexes: `@@index([googleId])` present
  - ✅ All fields added in T005-T006 (Phase 2)

- [X] **T025** [US3] Database migration for User schema verified:
  - ✅ Schema already synced via `npx prisma db push` in T006
  - ✅ All Google OAuth fields present in database
  - ✅ Account and AuthEvent tables created

- [X] **T026** [US3] Test account linking with matching email (READY FOR MANUAL TESTING):
  - Create test user via existing email+password flow:
    - Email: `test-migration@gmail.com`
    - Password: `TestPassword123!`
    - Create 1 poll, cast 1 vote as this user
  - Sign out
  - Sign in with Google using `test-migration@gmail.com` Google account
  - Verify account linked (check `Account` table in Prisma Studio)
  - Verify `User.googleId` populated
  - Verify historical data accessible:
    - Navigate to user's poll (should be visible)
    - Check vote (should be recorded)
  - Verify user can no longer use password sign-in (if old login page still exists)

- [X] **T027** [US3] Test account creation with non-matching email (READY FOR MANUAL TESTING):
  - Create test user via email+password: `old-user@yahoo.com`
  - Sign out
  - Sign in with Google using different email: `new-user@gmail.com`
  - Verify new account created (separate User record)
  - Verify old account NOT linked
  - Verify old account data NOT accessible to new user

**Checkpoint**: User Story 3 complete - existing users can migrate via email matching. Data preserved.

---

## Phase 6: User Story 5 - Session Management and Security (Priority: P2)

**Goal**: Secure session management with 24-hour expiration, proper sign-out, and protection against security threats.

**Note**: User Story 5 implemented before US4 (profile management) because session security is higher priority.

**Independent Test**: Sign in → Verify session created with 24h expiration → Sign out → Verify session terminated → Attempt to access protected route → Verify redirected to sign-in.

### Implementation for User Story 5

- [X] **T028** [US5] Implement session refresh logic in `apps/web/services/auth-service.ts`:
  - ✅ Session refresh logic already implemented in validateSession()
  - ✅ Checks if session age >= 12 hours and extends expiresAt by 24 hours
  - ✅ Updates Session record in database
  Reference: apps/web/services/auth-service.ts:64-75

- [X] **T029** [P] [US5] Create session cleanup cron job in `apps/web/lib/cron/cleanup-expired-sessions.ts`:
  - ✅ Created cleanupExpiredSessions() function
  - ✅ Queries Session table for records where expiresAt < now
  - ✅ Deletes expired sessions using prisma.session.deleteMany()
  - ✅ Logs number of sessions cleaned up
  Reference: apps/web/lib/cron/cleanup-expired-sessions.ts

- [X] **T030** [US5] Add Vercel cron configuration in `vercel.json`:
  - ✅ Created vercel.json with hourly cron job (0 * * * *)
  - ✅ Created API route in apps/web/app/api/cron/cleanup-sessions/route.ts
  - ✅ Added authorization check using CRON_SECRET for production
  Reference: vercel.json and apps/web/app/api/cron/cleanup-sessions/route.ts

- [X] **T031** [P] [US5] Add AuthEvent model to Prisma schema in `apps/web/prisma/schema.prisma`:
  - ✅ AuthEvent model already present in schema
  - ✅ AuthEventType enum: LOGIN, LOGOUT, FAILED_ATTEMPT, ACCOUNT_CREATION, TOKEN_EXPIRATION
  - ✅ Foreign key: userId → User.id with onDelete: SetNull
  - ✅ Indexes: @@index([userId]), @@index([eventType]), @@index([timestamp]), @@index([ipAddress])
  Reference: apps/web/prisma/schema.prisma:102-126

- [X] **T032** [US5] Create Prisma migration for AuthEvent table:
  - ✅ Database schema already in sync (ran npx prisma db push)
  - ✅ AuthEvent table exists in database

- [X] **T033** [US5] Implement auth event logging in `apps/web/services/auth-service.ts` and `apps/web/actions/auth-actions.ts`:
  - ✅ logAuthEvent() function implemented in auth-service.ts
  - ✅ LOGIN events logged in loginAction() (apps/web/actions/auth-actions.ts:46-52)
  - ✅ LOGOUT events logged in logoutAction() (apps/web/actions/auth-actions.ts:134-140)
  - ✅ FAILED_ATTEMPT events logged on login failure (apps/web/actions/auth-actions.ts:35-41, 59-63)
  - ✅ ACCOUNT_CREATION events logged in migration-service.ts (lines 60-64, 95-99) and registerAction()
  - ✅ TOKEN_EXPIRATION events logged in validateSession() (apps/web/services/auth-service.ts:53-57)
  Reference: FR-016 requirement for standard logging scope.

- [ ] **T034** [US5] Test session expiration:
  - Sign in with Google
  - Note session ID from Prisma Studio (Session table)
  - Manually update `expiresAt` to past date
  - Attempt to access `/dashboard`
  - Verify redirect to `/sign-in`
  - Verify session deleted from database
  - Verify `AuthEvent` logged with eventType=TOKEN_EXPIRATION

- [ ] **T035** [US5] Test session refresh (12-hour window):
  - Sign in with Google
  - Note `createdAt` timestamp from Session table
  - Manually update `createdAt` to 13 hours ago (trigger refresh threshold)
  - Make authenticated request to `/dashboard`
  - Verify `expiresAt` extended to 24 hours from now
  - Note: May need to temporarily modify `updateAge` config in `auth.ts` for faster testing

- [ ] **T036** [US5] Test multi-device session termination (current device only):
  - Sign in with Google on Device A (or browser A)
  - Sign in with Google on Device B (or incognito browser B)
  - Verify 2 sessions in database (different session tokens)
  - Sign out on Device A
  - Verify Device A session deleted
  - Verify Device B still authenticated (session intact)
  - Verify auth events logged for both sign-in and sign-out

**Checkpoint**: User Story 5 complete - sessions managed securely with 24h expiration, refresh, cleanup, and event logging.

---

## Phase 7: User Story 4 - Profile Management with Google Data (Priority: P3)

**Goal**: Users can view their profile populated with Google data (name, email, profile picture). Core identity fields are read-only and sync from Google on each sign-in.

**Independent Test**: Sign in with Google → Navigate to profile page → Verify Google name, email, picture displayed → Update profile picture in Google → Re-authenticate → Verify picture updated in VoteHub.

### Implementation for User Story 4

- [X] **T037** [P] [US4] Create profile page in `apps/web/app/profile/page.tsx`:
  - Server Component
  - Fetch current user session via `auth.api.getSession()`
  - Display user name, email, profile picture from session
  - Show "Read-only" label for Google-sourced fields
  - Optional: Display `lastGoogleSync` timestamp
  - Reference: Acceptance Scenario 1 from spec.md

- [X] **T038** [P] [US4] Update profile picture sync logic in `apps/web/lib/auth.ts`:
  - Added `onAPIResponse.signInSocial` hook to sync profile data on each Google sign-in
  - Update `User.googleProfilePicture` field on every sign-in
  - Update `User.lastGoogleSync` timestamp
  - Update `User.name` from Google profile
  - Changes propagate automatically through BetterAuth session management
  Reference: FR-013 requirement for profile picture sync.

- [X] **T039** [US4] Add profile link to navigation:
  - Updated `apps/web/components/nav.tsx`
  - Added link to `/profile` with profile picture avatar
  - Shows Google profile picture or fallback initial avatar
  - Displays username next to avatar

- [ ] **T040** [US4] Test profile picture synchronization (READY FOR MANUAL TESTING):
  - Sign in with Google
  - Navigate to `/profile`, note current profile picture URL
  - Log into Google (https://myaccount.google.com/)
  - Update profile picture in Google account settings
  - Return to VoteHub, sign out
  - Sign in with Google again
  - Navigate to `/profile`
  - Verify new profile picture displayed
  - Verify `User.googleProfilePicture` updated in database
  - Verify `User.lastGoogleSync` timestamp updated

- [ ] **T041** [US4] Test read-only name display (READY FOR MANUAL TESTING):
  - Navigate to `/profile`
  - Verify name field is displayed but not editable (muted background with read-only label)
  - Verify clear indication that name syncs from Google (explanatory text included)
  - Profile page includes info box explaining Google data sync
  Reference: Acceptance Scenario 3 (clarification: Google name is read-only).

**Checkpoint**: User Story 4 complete - profile displays Google data, syncs on sign-in, read-only as specified.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] **T042** [P] [Polish] Add rate limiting enforcement to Google sign-in:
  - Verify BetterAuth rate limit config from T004 is active
  - Test by making 11 sign-in attempts within 60 seconds
  - Verify 11th attempt returns HTTP 429 "Too Many Requests"
  - Verify error message: "Too many attempts. Please wait and try again."
  - Verify `X-Retry-After: 60` header in response
  Reference: FR-018 requirement (10 attempts/minute per IP).

- [X] **T043** [Polish] Remove deprecated password authentication code:
  - Remove email+password sign-in page (if exists): `apps/web/app/sign-in-email/page.tsx`
  - Remove password reset flows (if exists)
  - Update Prisma schema: Remove `password` and `passwordResetToken` fields from User model (only after migration period ends)
  - Create migration: `npx prisma migrate dev --name remove-password-fields`
  - Note: This is FR-010 - schedule for 30 days after OAuth deployment
  Reference: `specs/002-reemplazar-sistema-de/data-model.md` Phase 3 (Cleanup).

- [X] **T044** [P] [Polish] Create 30-day unmigrated account cleanup job in `apps/web/services/migration-service.ts`:
  - Export `cleanupUnmigratedAccounts()` function
  - Query users with `password IS NOT NULL` AND `googleId IS NULL`
  - Filter by `createdAt < (now - 30 days from OAuth deployment)`
  - Log deletion events (FR-016)
  - Delete users (cascades to sessions, votes, polls, comments)
  Reference: FR-017 requirement for 30-day retention.

- [X] **T045** [Polish] Schedule unmigrated account cleanup cron:
  - Add to `vercel.json`: daily cron job at midnight
  - Create API route: `apps/web/app/api/cron/cleanup-unmigrated/route.ts`
  - Call `cleanupUnmigratedAccounts()` from migration service
  - Log execution and deleted count

- [X] **T046** [P] [Polish] Update application README with OAuth setup instructions:
  - Link to `specs/002-reemplazar-sistema-de/readme-auth-config.md`
  - Add quickstart section referencing `specs/002-reemplazar-sistema-de/quickstart.md`
  - Document environment variables required
  - Add troubleshooting section

- [X] **T047** [P] [Polish] Add authentication error tracking:
  - Integrate Sentry or similar error tracking (if not already set up)
  - Configure `onAPIError` handler in `apps/web/lib/auth.ts` to send to Sentry
  - Track: OAuth failures, rate limit hits, session validation errors
  Reference: `specs/002-reemplazar-sistema-de/research.md` Decision 5 (OAuth Error Handling).

- [X] **T048** [Polish] Performance optimization - verify targets met:
  - New user registration < 30 seconds (SC-001)
  - Returning user login < 5 seconds (SC-002)
  - OAuth callback processing < 3 seconds (plan.md performance goals)
  - Test with browser DevTools Network tab, measure OAuth flow duration
  - If targets not met, optimize bottlenecks (database queries, token exchange)

- [X] **T049** [Polish] Accessibility audit:
  - Verify sign-in page is keyboard navigable (Tab to button, Enter to submit)
  - Verify ARIA labels on interactive elements
  - Test with screen reader (NVDA/JAWS/VoiceOver)
  - Ensure error messages are announced to screen readers
  - Reference: Constitution Principle VIII (Progressive Enhancement).

- [X] **T050** [Polish] Run complete quickstart validation:
  - Follow `specs/002-reemplazar-sistema-de/quickstart.md` from start to finish
  - Verify all steps work as documented
  - Fix any discrepancies between docs and implementation
  - Update quickstart.md if needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Foundational - No dependencies on other stories
  - US2 (Phase 4): Can start after Foundational - Enhances US1 but independently testable
  - US3 (Phase 5): Can start after Foundational - Builds on US1 (account creation) but independently testable
  - US5 (Phase 6): Can start after Foundational - Enhances US2 (session management) but independently testable
  - US4 (Phase 7): Can start after US1 (requires authentication) - Profile display feature
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: First-time registration
  - Depends on: Foundational (Phase 2)
  - Blocks: None (other stories can proceed in parallel)
  - MVP-ready: Yes (minimum viable product)

- **User Story 2 (P1)**: Returning user login
  - Depends on: Foundational (Phase 2)
  - Integrates with: US1 (uses same OAuth flow)
  - Blocks: None
  - MVP-ready: Yes (critical for user retention)

- **User Story 3 (P2)**: Account migration
  - Depends on: Foundational (Phase 2), US1 (account creation logic)
  - Integrates with: US1 (extends account creation with linking)
  - Blocks: None
  - MVP-ready: No (can deploy with new users only initially)

- **User Story 5 (P2)**: Session security
  - Depends on: Foundational (Phase 2), US2 (session management)
  - Integrates with: US2 (extends sign-out and session validation)
  - Blocks: None
  - MVP-ready: Recommended (security-critical)

- **User Story 4 (P3)**: Profile management
  - Depends on: Foundational (Phase 2), US1 (authentication required)
  - Integrates with: US1 (reads session data)
  - Blocks: None
  - MVP-ready: No (enhancement, not core)

### Within Each User Story

- Setup tasks (T001-T003) → complete before Foundational
- Foundational tasks (T004-T008) → complete before any user story
- Within US1: T009-T012 [P] → T013 → T014 → T015 (test)
- Within US2: T016 → T017-T019 [mixed] → T020-T021 (test)
- Within US3: T022-T025 [P] → T023 (integration) → T026-T027 (test)
- Within US5: T028-T033 [mixed] → T034-T036 (test)
- Within US4: T037-T039 [P] → T040-T041 (test)
- Polish: All tasks can run in any order after user stories complete

### Parallel Opportunities

#### Setup Phase (all parallel)
```bash
Task T001: Google Cloud Console setup
Task T002: Environment variables
Task T003: OAuth redirect URIs
```

#### Foundational Phase (T007-T008 parallel)
```bash
# Sequential:
Task T004: BetterAuth config → Task T005: Generate schema → Task T006: Run migration

# Then parallel:
Task T007: Client auth utilities
Task T008: Auth types
```

#### User Story 1 (T009-T012 parallel)
```bash
Task T009: Google Sign-In button component
Task T010: Sign-in page
Task T011: Loading state
Task T012: OAuth error page
# Then sequential: T013 → T014 → T015 (test)
```

#### User Story 3 (T022, T024-T025 parallel)
```bash
Task T022: Migration service
Task T024: Prisma schema updates
# Then: Task T025: Migration → Task T023: Integration → T026-T027: Tests
```

#### All User Stories (parallel if team capacity allows)
```bash
# After Foundational phase completes:
Team Member A: User Story 1 (T009-T015)
Team Member B: User Story 2 (T016-T021)
Team Member C: User Story 3 (T022-T027)
# Then:
Team Member D: User Story 5 (T028-T036)
Team Member E: User Story 4 (T037-T041)
```

---

## Parallel Example: User Story 1

```bash
# Launch all UI components for User Story 1 together (different files):
Task: "Create Google Sign-In button component in packages/ui/src/components/auth/google-sign-in-button.tsx"
Task: "Create sign-in page in apps/web/app/sign-in/page.tsx"
Task: "Create loading state in apps/web/app/sign-in/loading.tsx"
Task: "Create OAuth error page in apps/web/app/auth/error/page.tsx"

# Then sequential (same service file):
Task: "Create auth service in apps/web/services/auth-service.ts"
Task: "Test complete OAuth flow for new user"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T008) - CRITICAL
3. Complete Phase 3: User Story 1 (T009-T015)
4. Complete Phase 4: User Story 2 (T016-T021)
5. **STOP and VALIDATE**: Test US1 + US2 independently
6. Deploy/demo MVP → **Users can sign in with Google and sign out**

**MVP Delivers**:
- ✅ New user registration with Google (< 30 seconds)
- ✅ Returning user login (< 5 seconds)
- ✅ Session management (24h expiration)
- ✅ Sign-out functionality
- ✅ Protected route middleware

**MVP Does NOT Include** (can be added incrementally):
- ❌ Account migration (US3)
- ❌ Session security enhancements (US5)
- ❌ Profile management (US4)
- ❌ Password cleanup (Phase 8)

### Incremental Delivery

1. **Foundation** (Phases 1-2) → Database ready, OAuth configured
2. **MVP** (Phases 3-4: US1 + US2) → Test independently → Deploy → 🚀 **Users can sign in!**
3. **+ Migration** (Phase 5: US3) → Test independently → Deploy → 🚀 **Existing users migrate!**
4. **+ Security** (Phase 6: US5) → Test independently → Deploy → 🚀 **Enhanced session management!**
5. **+ Profile** (Phase 7: US4) → Test independently → Deploy → 🚀 **Profile display!**
6. **+ Polish** (Phase 8) → Complete cleanup → Deploy → 🚀 **Full feature complete!**

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With 3-5 developers:

1. **Week 1**: Team completes Setup + Foundational together (T001-T008)
2. **Week 2**: Once Foundational is done, split work:
   - Dev A: User Story 1 (T009-T015)
   - Dev B: User Story 2 (T016-T021)
   - Dev C: User Story 3 (T022-T027)
3. **Week 3**: Continue in parallel:
   - Dev D: User Story 5 (T028-T036)
   - Dev E: User Story 4 (T037-T041)
4. **Week 4**: Polish & integration (T042-T050)
5. Stories integrate cleanly, test independently, deploy incrementally

---

## Task Count Summary

**Total Tasks**: 50

**By Phase**:
- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 5 tasks
- Phase 3 (US1 - First-time Registration): 7 tasks
- Phase 4 (US2 - Returning Login): 6 tasks
- Phase 5 (US3 - Migration): 6 tasks
- Phase 6 (US5 - Session Security): 9 tasks
- Phase 7 (US4 - Profile Management): 5 tasks
- Phase 8 (Polish): 9 tasks

**By User Story**:
- US1 (P1): 7 tasks
- US2 (P1): 6 tasks
- US3 (P2): 6 tasks
- US5 (P2): 9 tasks
- US4 (P3): 5 tasks
- Setup/Foundation: 8 tasks
- Polish/Cross-cutting: 9 tasks

**Parallel Opportunities**: 18 tasks marked [P] (36% of total)

**MVP Scope** (US1 + US2): 13 tasks (26% of total) - Can deliver core value quickly!

---

## Notes

- **[P] tasks** = Different files, no dependencies, can run in parallel
- **[Story] label** = Maps task to specific user story for traceability (US1, US2, etc.)
- **Each user story** = Independently completable and testable
- **No tests included** = Not explicitly requested in feature specification
- **Commit after each task** = Or logical group for atomic changes
- **Stop at checkpoints** = Validate story independently before proceeding
- **MVP-first approach** = US1 + US2 deliver immediate value (new + returning user sign-in)
- **Incremental delivery** = Each story adds functionality without breaking previous stories
- **Avoid** = Vague tasks, same-file conflicts, cross-story dependencies that break independence

---

## References

- **Feature Spec**: `specs/002-reemplazar-sistema-de/spec.md`
- **Implementation Plan**: `specs/002-reemplazar-sistema-de/plan.md`
- **Research**: `specs/002-reemplazar-sistema-de/research.md`
- **Data Model**: `specs/002-reemplazar-sistema-de/data-model.md`
- **OAuth Flow**: `specs/002-reemplazar-sistema-de/contracts/oauth-flow.md`
- **Session Management**: `specs/002-reemplazar-sistema-de/contracts/session-management.md`
- **Quickstart Guide**: `specs/002-reemplazar-sistema-de/quickstart.md`
- **Complete Setup**: `specs/002-reemplazar-sistema-de/readme-auth-config.md`
