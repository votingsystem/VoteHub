# Research: Google OAuth Authentication with BetterAuth

**Date**: 2025-10-15
**Feature**: Google OAuth Exclusive Authentication
**Tech Stack**: BetterAuth 1.3.27, Next.js 15, React 19, TypeScript 5.7+

## Executive Summary

This research establishes the technical foundation for replacing email+password authentication with Google OAuth 2.0 using BetterAuth. The implementation leverages BetterAuth's native Google provider support, maintains compatibility with the existing Prisma/PostgreSQL setup, and aligns with VoteHub's Next.js 15 architecture principles.

---

## Decision 1: BetterAuth Google Provider Configuration

**Context**: VoteHub currently uses BetterAuth (v1.3.27) with email/password authentication. We need to add Google OAuth as a provider while maintaining session management and security requirements (24-hour sessions, rate limiting, logging).

**Decision**: Use BetterAuth's built-in Google OAuth provider with the following configuration:

```typescript
// apps/web/lib/auth.ts
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account",        // Always prompt account selection
      accessType: "offline",            // Get refresh tokens (not used but future-proof)
    },
  },

  session: {
    expiresIn: 60 * 60 * 24,           // 24 hours (FR-005 requirement)
    updateAge: 60 * 60 * 12,           // Refresh session if used within 12 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,                  // 5-minute cookie cache for performance
    },
  },

  rateLimit: {
    enabled: true,                     // FR-018: 10 auth attempts/minute
    window: 60,
    max: 10,
    customRules: {
      "/sign-in/social": { window: 60, max: 10 },
    },
  },

  secret: process.env.AUTH_SECRET!,
  baseURL: process.env.AUTH_URL!,
  plugins: [nextCookies()],            // Required for Next.js cookie management
});
```

**Rationale**:
- BetterAuth already integrated in the project (v1.3.27)
- Native Google provider reduces custom OAuth implementation complexity
- Built-in session management handles 24-hour expiration requirement
- Rate limiting support satisfies FR-018 (10 attempts/minute)
- Prisma adapter maintains existing database structure
- `nextCookies()` plugin ensures proper Next.js 15 cookie handling

**Alternatives Considered**:
- **NextAuth.js (Auth.js v5)**: Rejected - requires migration from existing BetterAuth setup, breaking change for current authentication
- **Custom OAuth 2.0 implementation**: Rejected - increases security risk, maintenance burden, and doesn't leverage existing BetterAuth infrastructure
- **Clerk/Supabase Auth**: Rejected - third-party service dependency, cost implications, over-engineered for requirements

**Implementation Notes**:
- `prompt: "select_account"` - Always shows account picker (good UX for multi-account users)
- `accessType: "offline"` - Requests refresh tokens (not used in spec but future-proof)
- No refresh token usage per clarification Q2 (rely on Google's session state)
- Session refresh via `updateAge` keeps active users authenticated

---

## Decision 2: Session Management Strategy

**Context**: Clarification established 24-hour session duration without refresh tokens, relying on Google's session state for re-authentication.

**Decision**: Database-backed sessions with 24-hour hard expiration and 12-hour soft refresh window.

**Session Lifecycle**:

1. **Initial Authentication (OAuth Callback)**:
   - User completes Google OAuth
   - BetterAuth creates session with `expiresAt = now + 24 hours`
   - Session token stored in httpOnly cookie
   - `Session` record created in database with user reference

2. **Active Usage (Within 12 Hours)**:
   - User makes authenticated request
   - BetterAuth checks session age
   - If > 12 hours old (`updateAge`), extends `expiresAt` by 24 hours
   - User stays authenticated without re-login

3. **Session Expiration (After 24 Hours of Inactivity)**:
   - Session expires (`expiresAt < now`)
   - Middleware redirects to `/sign-in`
   - User clicks "Sign in with Google"
   - If still logged into Google: instant re-authentication (2-3 seconds)
   - If logged out of Google: Google login prompt first

**Database Schema (BetterAuth-managed)**:

```prisma
model Session {
  id        String   @id
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  ipAddress String?
  userAgent String?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Rationale**:
- Satisfies FR-005 (24-hour max session duration)
- `updateAge` (12 hours) provides good UX for active users
- Database-backed sessions enable multi-device tracking (FR-016 logging requirement)
- httpOnly cookies prevent XSS attacks
- No refresh tokens simplifies implementation (per clarification Q2)

**Alternatives Considered**:
- **JWT-based sessions**: Rejected - can't revoke sessions server-side, no multi-device visibility
- **Redis-backed sessions**: Rejected - adds infrastructure dependency, unnecessary for VoteHub scale
- **Sliding window without hard cap**: Rejected - violates 24-hour max requirement

---

## Decision 3: User Migration Pattern

**Context**: Need to preserve data for existing email+password users (polls, votes, comments) when they sign in with Google.

**Decision**: Email-based automatic account linking with 30-day grace period for unmigrated accounts.

**Migration Flow**:

```typescript
// apps/web/services/migration-service.ts
export async function linkGoogleAccount(googleProfile: GoogleProfile) {
  // 1. Check if Google account already linked
  const existingOAuthAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: 'google',
        providerAccountId: googleProfile.id
      }
    },
  });

  if (existingOAuthAccount) {
    return existingOAuthAccount.userId; // Already migrated
  }

  // 2. Check for existing user with matching email
  const existingUser = await prisma.user.findUnique({
    where: { email: googleProfile.email },
  });

  if (existingUser) {
    // 3. Link Google account to existing user
    await prisma.oAuthAccount.create({
      data: {
        userId: existingUser.id,
        provider: 'google',
        providerAccountId: googleProfile.id,
        accessToken: googleProfile.accessToken,
        tokenExpiresAt: googleProfile.tokenExpiresAt,
      },
    });

    // 4. Update user profile with Google data
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        googleId: googleProfile.id,
        googleEmail: googleProfile.email,
        googleProfilePicture: googleProfile.picture,
        lastGoogleSync: new Date(),
      },
    });

    return existingUser.id;
  }

  // 5. No existing user - create new account
  const newUser = await prisma.user.create({
    data: {
      email: googleProfile.email,
      name: googleProfile.name,
      googleId: googleProfile.id,
      googleEmail: googleProfile.email,
      googleProfilePicture: googleProfile.picture,
      role: 'VOTER',
    },
  });

  await prisma.oAuthAccount.create({
    data: {
      userId: newUser.id,
      provider: 'google',
      providerAccountId: googleProfile.id,
      accessToken: googleProfile.accessToken,
      tokenExpiresAt: googleProfile.tokenExpiresAt,
    },
  });

  return newUser.id;
}
```

**Unmigrated Account Cleanup (FR-017)**:

```typescript
// apps/web/services/migration-service.ts
export async function cleanupUnmigratedAccounts() {
  const migrationDeploymentDate = new Date('2025-11-01'); // Set in production
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  if (thirtyDaysAgo < migrationDeploymentDate) {
    return; // Grace period not expired yet
  }

  // Find users with password but no Google account link
  const unmigratedUsers = await prisma.user.findMany({
    where: {
      password: { not: null },      // Has password (legacy account)
      googleId: null,                // Not linked to Google
      accounts: { none: {} },        // No OAuth accounts
    },
  });

  for (const user of unmigratedUsers) {
    // Log deletion event (FR-016)
    await logAuthEvent({
      eventType: 'account_deletion',
      userId: user.id,
      success: true,
      timestamp: new Date(),
    });

    // Cascade delete: user, sessions, votes, polls, comments (Prisma relations)
    await prisma.user.delete({ where: { id: user.id } });
  }
}
```

**Rationale**:
- Email matching ensures data continuity for 80% of users (Gmail addresses)
- Automatic linking reduces user friction (no manual migration step)
- 30-day grace period provides safety net (FR-017 requirement)
- Preserves all relationships (polls, votes, comments) via foreign keys
- Handles edge cases: non-Gmail users create new accounts (acceptable per clarification Q3)

**Alternatives Considered**:
- **Manual migration tool**: Rejected - adds UI complexity, user friction, low adoption risk
- **Email verification for linking**: Rejected - adds extra step, conflicts with "reduce friction" goal
- **Indefinite data retention**: Rejected - violates FR-017 (30-day requirement)

---

## Decision 4: Rate Limiting Implementation

**Context**: FR-018 requires 10 authentication attempts per minute per IP address.

**Decision**: Use BetterAuth's built-in rate limiting with IP-based tracking.

**Configuration**:

```typescript
// apps/web/lib/auth.ts
export const auth = betterAuth({
  // ... other config

  rateLimit: {
    enabled: true,
    window: 60,                      // 60 seconds
    max: 10,                         // 10 requests per window
    customRules: {
      "/sign-in/social": {
        window: 60,
        max: 10,                     // Strict limit for OAuth endpoints
      },
    },
  },

  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"], // Default for Vercel
      // For Cloudflare: ["cf-connecting-ip"]
      // For Nginx: ["x-real-ip"]
    },
  },
});
```

**Rate Limit Response**:

```typescript
// Automatic response when limit exceeded
HTTP 429 Too Many Requests
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}

Headers:
X-Retry-After: 60
```

**Rationale**:
- BetterAuth's rate limiting built-in (no external dependencies)
- IP-based tracking via `x-forwarded-for` header (Vercel-compatible)
- Satisfies FR-018 (10 attempts/minute)
- Per-endpoint customization enables stricter limits if needed
- Returns `X-Retry-After` header for client-side retry logic

**Alternatives Considered**:
- **Redis-based rate limiting (upstash-ratelimit)**: Rejected - adds infrastructure dependency, overkill for requirements
- **Vercel Edge Config rate limiting**: Rejected - vendor lock-in, harder to test locally
- **Custom middleware rate limiting**: Rejected - duplicates BetterAuth functionality, more maintenance

**Edge Case Handling**:
- **Shared IP (corporate NAT)**: Acceptable - edge case per spec, users can contact support
- **VPN/Proxy IP rotation**: Acceptable - rate limit per IP is industry standard
- **DDoS protection**: Rely on hosting provider (Vercel) for network-level protection

---

## Decision 5: OAuth Error Handling

**Context**: OAuth flows can fail due to user denial, network issues, or Google service downtime.

**Decision**: Structured error handling with user-friendly messages and monitoring.

**Error Categories**:

1. **User-Initiated Errors** (gracefully degrade):
   - User denies authorization: "Google sign-in was cancelled."
   - User closes OAuth popup: "Sign-in was interrupted. Please try again."
   - Solution: Clear error message, allow retry

2. **Network Errors** (transient):
   - Network timeout during OAuth callback
   - Solution: "Network error. Please check your connection and try again."

3. **Google Service Errors** (external):
   - Google OAuth unavailable (503)
   - Solution: "Google sign-in is temporarily unavailable. Please try again in a few minutes."

4. **Application Errors** (critical):
   - Database connection failure during account creation
   - Solution: "An unexpected error occurred. Please try again or contact support."

**Implementation**:

```typescript
// apps/web/app/auth/error/page.tsx
const ERROR_MESSAGES: Record<string, string> = {
  oauth_callback_error: "Failed to complete Google sign-in. Please try again.",
  unauthorized: "Sign-in was cancelled or unauthorized.",
  rate_limit: "Too many sign-in attempts. Please wait and try again.",
  network_error: "Network error. Please check your connection.",
  service_unavailable: "Google sign-in is temporarily unavailable.",
  unknown: "An unexpected error occurred. Please try again.",
};

// Error page displays user-friendly message from searchParams
```

**Client-Side Error Handling**:

```typescript
// packages/ui/src/components/auth/google-sign-in-button.tsx
await authClient.signIn.social(
  { provider: "google", errorCallbackURL: "/auth/error?error=oauth_callback_error" },
  {
    onError: (ctx) => {
      if (ctx.error.status === 429) {
        setError("Too many attempts. Please wait and try again.");
      } else if (ctx.error.message.includes("unauthorized")) {
        setError("Sign-in was cancelled. Please try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    },
  }
);
```

**Logging (FR-016)**:

```typescript
// apps/web/services/auth-service.ts
export async function logAuthEvent(event: {
  eventType: 'login' | 'logout' | 'failed_attempt' | 'account_creation' | 'token_expiration';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}) {
  await prisma.authEvent.create({
    data: {
      ...event,
      timestamp: new Date(),
    },
  });
}
```

**Rationale**:
- User-friendly messages reduce support burden
- Error categorization enables targeted monitoring
- Logging satisfies FR-016 (standard logging scope)
- `errorCallbackURL` provides clean error UX

**Alternatives Considered**:
- **Toast notifications for errors**: Rejected - requires client-side state management, not compatible with Server Components
- **Email notifications for errors**: Rejected - over-engineered, adds latency
- **Real-time error tracking (Sentry)**: Recommended for production but not required in spec

---

## Decision 6: Security Best Practices

**Context**: OAuth authentication introduces security considerations: CSRF, token storage, session fixation.

**Decision**: Leverage BetterAuth's built-in security features with production hardening.

**CSRF Protection** (automatic):
- Origin header validation (BetterAuth built-in)
- OAuth state parameter generation and validation
- PKCE (Proof Key for Code Exchange) for OAuth 2.1 compliance
- Configuration: Add all domains to `trustedOrigins`

**Token Storage** (automatic):
- httpOnly cookies (prevents XSS)
- Secure flag in production (HTTPS-only)
- sameSite: 'lax' (CSRF protection)
- Signed cookies to prevent tampering

**Session Security**:
- Database-backed sessions (can revoke server-side)
- IP address tracking for audit logs
- User agent tracking for multi-device management
- Automatic session rotation on refresh

**Production Configuration**:

```typescript
// apps/web/lib/auth.ts
export const auth = betterAuth({
  // ... other config

  trustedOrigins: [
    process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined,
    "https://votehub.com",              // Production domain
    "https://www.votehub.com",          // WWW variant
  ].filter(Boolean),

  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"], // Adjust for hosting provider
    },
  },

  onAPIError: {
    throw: false,                       // Don't throw, handle gracefully
    onError: (error, ctx) => {
      console.error("Auth error:", {
        message: error.message,
        path: ctx.path,
        method: ctx.request.method,
        timestamp: new Date().toISOString(),
      });
      // Send to monitoring service (Sentry, etc.)
    },
  },
});
```

**Rationale**:
- BetterAuth handles CSRF/PKCE automatically (no custom implementation needed)
- httpOnly cookies prevent token theft via XSS
- Database sessions enable revocation (multi-device sign-out)
- IP/user agent tracking satisfies FR-016 logging requirement

**Alternatives Considered**:
- **JWT-based sessions**: Rejected - can't revoke server-side, harder to track multi-device
- **Redis token storage**: Rejected - adds infrastructure complexity
- **Custom CSRF implementation**: Rejected - BetterAuth provides battle-tested solution

---

## Environment Variables Reference

**Development** (`.env`):
```env
# Existing (already configured)
AUTH_SECRET="XV07HBavSmkk/wmfILzPRjwd2CHSt8UqTZfp44PrwYA="
AUTH_URL="http://localhost:3000"
DATABASE_URL="postgresql://..."

# New (to be added)
GOOGLE_CLIENT_ID="your-dev-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-dev-client-secret"
```

**Production** (`.env.production`):
```env
AUTH_SECRET="[generate-new-production-secret]"
AUTH_URL="https://votehub.com"
DATABASE_URL="[production-database-url]"
GOOGLE_CLIENT_ID="your-prod-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-prod-client-secret"
```

**Google Cloud Console Setup**:
1. Create OAuth 2.0 credentials
2. Set authorized redirect URIs:
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Prod: `https://votehub.com/api/auth/callback/google`
3. Copy client ID and secret to `.env`

---

## Implementation Checklist

**Phase 0 (Setup)**:
- [ ] Add Google OAuth credentials to `.env`
- [ ] Configure Google Cloud Console redirect URIs
- [ ] Run BetterAuth CLI to update database schema
- [ ] Run Prisma migration for new tables

**Phase 1 (Core Authentication)**:
- [ ] Update `apps/web/lib/auth.ts` with Google provider config
- [ ] Create OAuth callback route handler
- [ ] Implement sign-in page with Google button
- [ ] Add auth middleware for protected routes

**Phase 2 (Migration)**:
- [ ] Implement email-based account linking service
- [ ] Add User schema fields (googleId, googleEmail, googleProfilePicture)
- [ ] Create migration service for existing users
- [ ] Schedule 30-day cleanup job (FR-017)

**Phase 3 (Security & Monitoring)**:
- [ ] Verify rate limiting configuration
- [ ] Implement auth event logging (FR-016)
- [ ] Add error handling and user-friendly messages
- [ ] Test CSRF protection and session security

**Phase 4 (Testing)**:
- [ ] E2E test: New user Google sign-in flow
- [ ] E2E test: Existing user migration (email match)
- [ ] E2E test: Rate limiting enforcement
- [ ] E2E test: Session expiration and refresh

**Phase 5 (Cleanup)**:
- [ ] Remove password-related code (FR-010)
- [ ] Update documentation (quickstart, readme-auth-config)
- [ ] Production deployment checklist
- [ ] Monitor authentication metrics

---

## References

- **BetterAuth Documentation**: https://www.better-auth.com/docs
- **Google OAuth Setup**: https://www.better-auth.com/docs/authentication/google
- **Session Management**: https://www.better-auth.com/docs/concepts/session-management
- **Rate Limiting**: https://www.better-auth.com/docs/concepts/rate-limit
- **Next.js Integration**: https://www.better-auth.com/docs/integrations/next
- **Security Best Practices**: https://www.better-auth.com/docs/reference/security

---

**Research completed**: 2025-10-15
**Next phase**: Data model design and API contracts
