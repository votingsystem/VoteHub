# Implementation Plan: Google OAuth Exclusive Authentication

**Branch**: `002-reemplazar-sistema-de` | **Date**: 2025-10-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-reemplazar-sistema-de/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace the existing email+password authentication system with Google OAuth 2.0 as the exclusive authentication method for VoteHub. This migration will eliminate password management complexity, reduce registration friction (from 2-3 minutes to <30 seconds), and improve security by leveraging Google's authentication infrastructure. The implementation will use BetterAuth as specified, integrate with the existing Next.js 15 + React 19 architecture, and ensure seamless migration for 80% of existing users who use Gmail addresses.

## Technical Context

**Language/Version**: TypeScript 5.7+ (strict mode), Node.js 20+
**Primary Dependencies**: Next.js 15, React 19, BetterAuth (OAuth provider), Prisma ORM, Zod (validation)
**Storage**: PostgreSQL (existing database with User, Session tables)
**Testing**: Jest/Vitest for unit tests, Playwright for E2E authentication flows
**Target Platform**: Web application (Next.js App Router) deployed on Vercel/similar
**Project Type**: Monorepo web application (apps/web with packages/ui)
**Performance Goals**: <30s new user registration, <5s returning user login, <3s OAuth callback processing
**Constraints**: 99.9% authentication availability, 10 auth attempts/minute rate limit, 24-hour session duration
**Scale/Scope**: Support existing user migration, handle concurrent authentication, maintain vote data integrity during transition

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Principle Alignment

✅ **I. Clean Modular Architecture**
- Authentication service layer in `apps/web/services/auth-service.ts`
- OAuth callback handlers in `apps/web/app/api/auth/` route handlers
- Server Actions in `apps/web/actions/auth-actions.ts` for sign-in/sign-out
- No business logic in components (UI delegates to services)

✅ **II. Next.js 15 Best Practices**
- Server Components by default for authentication UI
- Client Components only for interactive OAuth button (`"use client"` for click handlers)
- Server Actions for sign-out functionality
- Route handlers for OAuth callbacks (`app/api/auth/callback/google/route.ts`)
- Streaming with Suspense for authentication state checks

✅ **III. Monorepo Organization**
- Authentication code in `apps/web/` (not shared across workspaces)
- UI components in `packages/ui/components/auth/` (sign-in button, auth provider)
- No cross-workspace violations

✅ **IV. Component Library First**
- OAuth sign-in button in `packages/ui/src/components/auth/google-sign-in-button.tsx`
- Auth provider wrapper in `packages/ui/src/components/auth/auth-provider.tsx`
- Uses shadcn Button component as base

✅ **V. Type Safety**
- TypeScript strict mode enabled
- Types for OAuth tokens, user session, Google profile data
- Zod schemas for OAuth callback validation
- No `any` types (BetterAuth provides typed APIs)

✅ **VI. Reddit-Style UX Consistency**
- OAuth button follows Reddit's "Continue with Google" pattern
- Minimal, centered authentication page design
- Consistent with existing VoteHub card-based layout

✅ **VII. Vote Integrity**
- User identity preserved during migration (email-based linking)
- Vote data remains associated with user accounts through migration
- Session management ensures authenticated voting post-migration

✅ **VIII. Progressive Enhancement**
- OAuth flow gracefully degrades (clear error messages if JavaScript disabled)
- Server-side session validation
- Keyboard-accessible authentication UI

### Gate Status: ✅ PASSED

No principle violations. Authentication follows all constitution requirements.

## Project Structure

### Documentation (this feature)

```
specs/002-reemplazar-sistema-de/
├── spec.md                        # Feature specification (complete)
├── plan.md                        # This file
├── research.md                    # Phase 0: BetterAuth + Google OAuth patterns
├── data-model.md                  # Phase 1: Session & User schema changes
├── quickstart.md                  # Phase 1: Setup guide with env vars
├── readme-auth-config.md          # User-requested: Complete auth setup documentation
└── contracts/                     # Phase 1: OAuth API contracts
    ├── oauth-flow.md              # OAuth authorization flow documentation
    └── session-management.md      # Session lifecycle contracts
```

### Source Code (repository root)

```
apps/web/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── callback/
│   │       │   └── google/
│   │       │       └── route.ts           # OAuth callback handler
│   │       ├── sign-in/
│   │       │   └── route.ts               # Initiate OAuth flow
│   │       └── sign-out/
│   │           └── route.ts               # Sign-out endpoint
│   ├── sign-in/
│   │   ├── page.tsx                       # Sign-in page (Server Component)
│   │   └── loading.tsx                    # Loading state
│   └── auth/
│       └── error/
│           └── page.tsx                   # OAuth error page
├── actions/
│   └── auth-actions.ts                    # Server Actions (sign-out, session check)
├── services/
│   ├── auth-service.ts                    # Core auth logic (OAuth flow, user creation)
│   └── migration-service.ts               # User migration logic (email matching)
├── lib/
│   ├── auth.ts                            # BetterAuth configuration
│   ├── auth-client.ts                     # Client-side auth utilities
│   └── rate-limit.ts                      # Rate limiting middleware
├── middleware.ts                          # Auth middleware (session validation)
└── prisma/
    └── schema.prisma                      # Updated User/Session schema

packages/ui/src/
├── components/
│   └── auth/
│       ├── google-sign-in-button.tsx      # OAuth button (Client Component)
│       ├── auth-provider.tsx              # Session context provider
│       └── protected-route.tsx            # Auth-required wrapper component
└── hooks/
    └── use-auth.ts                        # Auth state hook

tests/
├── e2e/
│   └── auth/
│       ├── oauth-flow.spec.ts             # Full OAuth flow test
│       ├── migration.spec.ts              # User migration scenarios
│       └── rate-limiting.spec.ts          # Rate limit enforcement
└── unit/
    ├── services/
    │   ├── auth-service.test.ts
    │   └── migration-service.test.ts
    └── middleware/
        └── auth-middleware.test.ts
```

**Structure Decision**: Monorepo web application (Option 2) with existing `apps/web` and `packages/ui`. Authentication code follows the established Next.js 15 App Router structure with route handlers in `app/api/auth/`, services in `apps/web/services/`, and shared UI components in `packages/ui/src/components/auth/`. This aligns with Principle III (Monorepo Organization) and maintains clear separation between app-specific logic (apps/web) and reusable components (packages/ui).

## Complexity Tracking

_No violations - all principles followed._

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       | N/A        | N/A                                  |

## Phase 0: Research & Technical Decisions

See [research.md](./research.md) for detailed findings.

### Research Tasks

1. **BetterAuth + Google OAuth Configuration**
   - BetterAuth setup with Google provider
   - OAuth 2.0 scopes for profile data (email, name, picture)
   - Callback URL configuration
   - Environment variable requirements

2. **Session Management Strategy**
   - BetterAuth session storage (database-backed)
   - 24-hour session expiration implementation
   - Session token validation patterns
   - Multi-device session handling

3. **User Migration Pattern**
   - Email-based account linking strategy
   - Data preservation during migration (polls, votes, comments)
   - 30-day retention for unmigrated accounts
   - Migration status tracking

4. **Rate Limiting Implementation**
   - Rate limit middleware for auth endpoints (10/minute per IP)
   - Redis/in-memory rate limit store
   - Rate limit error responses

5. **OAuth Error Handling**
   - Authorization denial scenarios
   - Network failure recovery
   - Google OAuth service downtime handling
   - User-friendly error messages

6. **Security Best Practices**
   - CSRF protection for OAuth callbacks
   - State parameter validation
   - Token storage security (httpOnly cookies)
   - Session fixation prevention

## Phase 1: Data Model & Contracts

See [data-model.md](./data-model.md) for entity definitions.
See [quickstart.md](./quickstart.md) for setup instructions.
See [readme-auth-config.md](./readme-auth-config.md) for complete authentication configuration guide.

### Key Entities

**User** (updated schema):
- Add: `googleId` (string, unique, nullable for migration period)
- Add: `googleEmail` (string, nullable)
- Add: `googleProfilePicture` (string, nullable)
- Add: `lastGoogleSync` (DateTime, nullable)
- Remove: `password` (string, hashed) - deprecated after migration
- Remove: `passwordResetToken` - no longer needed
- Preserve: `email`, `name`, `role`, `createdAt`, `updatedAt`

**Session** (BetterAuth managed):
- `id` (string, primary key)
- `userId` (foreign key to User)
- `token` (string, unique, secure random)
- `expiresAt` (DateTime, 24 hours from creation)
- `createdAt` (DateTime)
- `ipAddress` (string, for rate limiting)
- `userAgent` (string, for security auditing)

**OAuthAccount** (new table for BetterAuth):
- `id` (string, primary key)
- `userId` (foreign key to User)
- `provider` (enum: 'google')
- `providerAccountId` (string, Google's user ID)
- `accessToken` (string, encrypted)
- `tokenExpiresAt` (DateTime)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**AuthEvent** (new table for logging - FR-016):
- `id` (string, primary key)
- `userId` (foreign key to User, nullable)
- `eventType` (enum: 'login', 'logout', 'failed_attempt', 'account_creation', 'token_expiration')
- `ipAddress` (string)
- `userAgent` (string)
- `success` (boolean)
- `errorMessage` (string, nullable)
- `timestamp` (DateTime)

### API Contracts

See [contracts/oauth-flow.md](./contracts/oauth-flow.md)
See [contracts/session-management.md](./contracts/session-management.md)

## Phase 2: Task Generation

_Not created by `/speckit.plan`. Run `/speckit.tasks` to generate tasks.md with dependency-ordered implementation steps._

Expected task phases:
1. **Setup & Configuration**: BetterAuth installation, Google OAuth credentials, environment variables
2. **Schema Migration**: Database schema updates, run Prisma migrations
3. **Core Authentication**: OAuth flow implementation, callback handlers, session management
4. **UI Components**: Sign-in button, auth provider, protected routes
5. **User Migration**: Email-based linking logic, migration service, 30-day cleanup job
6. **Rate Limiting**: Middleware implementation, rate limit enforcement
7. **Logging & Monitoring**: Auth event logging, security audit trails
8. **Testing**: Unit tests, E2E OAuth flow tests, migration tests
9. **Cleanup**: Remove password-related code, update documentation
10. **Deployment**: Environment variable setup, production migration plan
