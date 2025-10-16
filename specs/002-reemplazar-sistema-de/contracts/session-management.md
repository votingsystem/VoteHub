# Session Management Contract

**Feature**: Google OAuth Exclusive Authentication
**Session Duration**: 24 hours maximum
**Storage**: PostgreSQL via Prisma
**Date**: 2025-10-15

## Overview

This document defines session lifecycle, validation, and management patterns for VoteHub after Google OAuth migration. Sessions are database-backed with 24-hour hard expiration and optional 12-hour refresh window.

---

## Session Lifecycle

### State Diagram

```
┌──────────────┐
│   No Session │
│  (Anonymous) │
└───────┬──────┘
        │ OAuth Success
        │ (Step 9 from oauth-flow.md)
        ▼
┌──────────────┐
│   Created    │  expiresAt = now + 24h
│ (Active <12h)│  token stored in cookie
└───────┬──────┘
        │ User Activity
        │ (age < 12h)
        ▼
┌──────────────┐
│   Active     │  expiresAt unchanged
│ (12h-24h old)│  Still valid
└───────┬──────┘
        │ User Activity
        │ (age >= 12h)
        ▼
┌──────────────┐
│  Refreshed   │  expiresAt = now + 24h
│ (Active <12h)│  Session extended
└───────┬──────┘
        │ 24h inactive
        │ OR User sign-out
        ▼
┌──────────────┐
│   Expired /  │  Redirect to /sign-in
│  Terminated  │  Cookie cleared
└──────────────┘
```

---

## Session Creation

### Trigger

Session created after successful Google OAuth callback (Step 9 in oauth-flow.md).

### Creation Logic

```typescript
// apps/web/services/auth-service.ts
export async function createSession(userId: string, request: Request) {
  const sessionToken = generateSecureToken(); // 32-byte secure random
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  const session = await prisma.session.create({
    data: {
      userId,
      token: sessionToken,
      expiresAt,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    },
  });

  return session;
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
```

### Database Record

```sql
INSERT INTO "Session" (
  "id",
  "userId",
  "token",
  "expiresAt",
  "createdAt",
  "ipAddress",
  "userAgent"
) VALUES (
  'clx_session_1234567890',
  'clx_user_1234567890',
  'SECURE_BASE64_URL_TOKEN',
  '2025-10-16T12:00:00.000Z', -- 24 hours from now
  '2025-10-15T12:00:00.000Z', -- now
  '192.168.1.100',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'
);
```

### Cookie Setting

```typescript
// Set httpOnly cookie with session token
response.cookies.set({
  name: "session_token",
  value: session.token,
  httpOnly: true,         // Prevent JavaScript access (XSS protection)
  secure: process.env.NODE_ENV === "production", // HTTPS-only in production
  sameSite: "lax",        // CSRF protection
  maxAge: 60 * 60 * 24,   // 24 hours (seconds)
  path: "/",
});
```

**Cookie Attributes**:
- `httpOnly: true` - Prevents XSS attacks (JavaScript cannot read cookie)
- `secure: true` (prod) - HTTPS-only transmission
- `sameSite: lax` - Allows top-level navigation, blocks CSRF
- `maxAge: 86400` - 24-hour browser-side expiration (matches server)
- `path: /` - Cookie sent with all requests

---

## Session Validation

### Validation Flow

```typescript
// apps/web/services/auth-service.ts
export async function validateSession(token: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    return null; // Token not found
  }

  if (session.expiresAt < new Date()) {
    // Session expired, delete it
    await prisma.session.delete({ where: { id: session.id } });

    // Log expiration event (FR-016)
    await logAuthEvent({
      eventType: 'TOKEN_EXPIRATION',
      userId: session.userId,
      success: false,
      timestamp: new Date(),
    });

    return null;
  }

  return session;
}
```

### Middleware Integration

```typescript
// apps/web/middleware.ts
export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // Session invalid or expired
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // Session valid, allow request
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/polls/create",
    "/admin/:path*",
  ],
};
```

---

## Session Refresh

### Refresh Strategy

Sessions are automatically refreshed if:
- User makes authenticated request
- Session age >= 12 hours
- Session not yet expired (< 24 hours old)

### Refresh Logic

```typescript
// BetterAuth automatic refresh (configured in auth.ts)
session: {
  expiresIn: 60 * 60 * 24,  // 24 hours
  updateAge: 60 * 60 * 12,  // Refresh if >= 12 hours old
}
```

**How it works**:
1. User makes authenticated request with session token
2. BetterAuth checks session age: `age = now - session.createdAt`
3. If `age >= 12 hours`:
   - Update `expiresAt = now + 24 hours`
   - User stays authenticated without re-login
4. If `age < 12 hours`:
   - No refresh needed, proceed with request

**Example Timeline**:

```
Time      Action                         expiresAt
─────────────────────────────────────────────────────────────
12:00 PM  User signs in                  +24h (12:00 PM tomorrow)
1:00 PM   User votes on poll             No refresh (age = 1h)
6:00 PM   User creates poll              No refresh (age = 6h)
11:00 PM  User views dashboard           No refresh (age = 11h)
1:00 AM   User comments on poll          ✅ REFRESH (age = 13h)
                                          expiresAt = 1:00 AM + 24h
3:00 AM   User votes again               No refresh (age = 2h since refresh)
...
Next Day  User idle for 24h              Session expires
1:00 AM   User returns                   Redirect to /sign-in
```

### Disabling Refresh (if needed)

```typescript
// To disable automatic refresh (not recommended):
session: {
  expiresIn: 60 * 60 * 24,
  disableSessionRefresh: true, // Sessions expire after 24h, no extension
}
```

---

## Session Termination

### User-Initiated Sign-Out

**Action**: User clicks "Sign Out" button

**Implementation**:

```typescript
// apps/web/actions/auth-actions.ts
"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function signOutAction() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    // Log sign-out event (FR-016)
    await logAuthEvent({
      eventType: 'LOGOUT',
      userId: session.user.id,
      success: true,
      timestamp: new Date(),
    });

    // Delete session from database
    await prisma.session.delete({
      where: { token: session.token },
    });
  }

  // Clear cookie
  cookies().delete("session_token");

  redirect("/");
}
```

**Client Component**:

```typescript
// packages/ui/src/components/auth/sign-out-button.tsx
"use client";

import { signOutAction } from "@/actions/auth-actions";

export function SignOutButton() {
  return (
    <button
      onClick={async () => {
        await signOutAction();
      }}
    >
      Sign Out
    </button>
  );
}
```

### Automatic Expiration

**Trigger**: Session `expiresAt < now`

**Cleanup Job** (scheduled cron):

```typescript
// apps/web/lib/cron/cleanup-expired-sessions.ts
export async function cleanupExpiredSessions() {
  const expiredSessions = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  console.log(`Cleaned up ${expiredSessions.count} expired sessions`);
}

// Run every hour
// Deployment platform cron: 0 * * * * (every hour)
```

**Vercel Cron Configuration**:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-sessions",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Session Revocation (Current Device Only)

Per clarification Q2, signing out terminates **only the current device session**, not all user sessions.

**Implementation**:

```typescript
// Already implemented above - only deletes current session token
await prisma.session.delete({
  where: { token: currentSessionToken },
});
```

**Multi-Device Behavior**:
- User signs in on Device A (Session A created)
- User signs in on Device B (Session B created)
- User signs out on Device A → Session A deleted, Session B remains active
- Device B still authenticated

### Revoke All Sessions (Optional Feature)

**Use Case**: User clicks "Sign out everywhere" in settings

**Implementation**:

```typescript
// apps/web/actions/auth-actions.ts
export async function signOutEverywhereAction() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    // Delete ALL user sessions
    await prisma.session.deleteMany({
      where: { userId: session.user.id },
    });

    // Log event
    await logAuthEvent({
      eventType: 'LOGOUT',
      userId: session.user.id,
      success: true,
      errorMessage: 'Signed out from all devices',
      timestamp: new Date(),
    });
  }

  cookies().delete("session_token");
  redirect("/");
}
```

---

## Multi-Device Session Management

### Listing Active Sessions

**Use Case**: User wants to see all devices where they're logged in

**Implementation**:

```typescript
// apps/web/services/auth-service.ts
export async function listUserSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      ipAddress: true,
      userAgent: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

**Response**:

```json
[
  {
    "id": "clx_session_1234567890",
    "createdAt": "2025-10-15T12:00:00.000Z",
    "expiresAt": "2025-10-16T12:00:00.000Z",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
  },
  {
    "id": "clx_session_0987654321",
    "createdAt": "2025-10-14T18:00:00.000Z",
    "expiresAt": "2025-10-15T18:00:00.000Z",
    "ipAddress": "192.168.1.101",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)..."
  }
]
```

### Revoking Specific Session

**Use Case**: User sees suspicious device, revokes that session

**Implementation**:

```typescript
// apps/web/actions/auth-actions.ts
export async function revokeSessionAction(sessionId: string) {
  const currentSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!currentSession) {
    return { error: "Not authenticated" };
  }

  // Verify session belongs to current user
  const targetSession = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!targetSession || targetSession.userId !== currentSession.user.id) {
    return { error: "Session not found or unauthorized" };
  }

  await prisma.session.delete({
    where: { id: sessionId },
  });

  return { success: true };
}
```

---

## Session Security

### Token Generation

**Requirements**:
- Cryptographically secure random number generator
- Minimum 32 bytes (256 bits) of entropy
- Base64URL encoding (URL-safe, no padding)

**Implementation**:

```typescript
import crypto from "crypto";

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// Example output: "vZX-Q3k7j9L2mN8pRtYuWxAz4BcDeFgHiJkLmNoPqRs"
```

### Session Fixation Prevention

**Attack**: Attacker sets victim's session token before authentication, then hijacks session after victim logs in.

**Prevention**:
1. Always generate **new session token** after successful authentication
2. Never reuse or accept pre-existing session tokens
3. Invalidate any existing sessions before creating new one (optional)

**Implementation** (automatic via BetterAuth):
```typescript
// Old session (if any) is not reused
await prisma.session.deleteMany({
  where: { userId, token: oldToken },
});

// New session created with fresh token
const newSession = await createSession(userId, request);
```

### Session Hijacking Prevention

**Measures**:

1. **httpOnly Cookies**: Prevents XSS attacks from stealing token
2. **Secure Flag** (prod): HTTPS-only transmission
3. **SameSite=Lax**: Prevents CSRF attacks
4. **IP Address Tracking**: Detect suspicious location changes (optional alert)
5. **User Agent Tracking**: Detect device changes (optional alert)

**IP Change Detection** (optional enhancement):

```typescript
export async function validateSession(token: string, request: Request): Promise<Session | null> {
  const session = await prisma.session.findUnique({
    where: { token },
  });

  if (!session) return null;

  const currentIp = request.headers.get("x-forwarded-for");

  if (session.ipAddress !== currentIp) {
    // Log suspicious activity (FR-016)
    await logAuthEvent({
      eventType: 'FAILED_ATTEMPT',
      userId: session.userId,
      ipAddress: currentIp,
      errorMessage: `IP changed from ${session.ipAddress} to ${currentIp}`,
      success: false,
      timestamp: new Date(),
    });

    // Optional: Invalidate session and require re-authentication
    // await prisma.session.delete({ where: { id: session.id } });
    // return null;
  }

  return session;
}
```

---

## Performance Optimization

### Cookie-Based Caching

**BetterAuth Cookie Cache**:

```typescript
// apps/web/lib/auth.ts
session: {
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60, // 5 minutes
  },
}
```

**How it works**:
1. First session validation: Query database
2. Cache session data in additional cookie: `session_data_cache`
3. Subsequent validations (within 5 minutes): Read from cookie, skip DB query
4. After 5 minutes: Re-validate with database

**Benefits**:
- Reduces database load (1 query per 5 minutes instead of every request)
- Faster response times (<10ms vs. ~20ms)

**Tradeoffs**:
- Revoked sessions may take up to 5 minutes to propagate
- Slightly increased cookie size (~200 bytes)

**When to Disable**:
- High-security applications requiring instant revocation
- Compliance requirements for real-time session validation

### Database Indexes

**Required Indexes**:

```sql
-- Fast token lookup (primary validation path)
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- Fast user session queries (list all user sessions)
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- Efficient cleanup job (delete expired sessions)
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
```

**Query Performance**:
- Token lookup: O(log n) - ~20ms at 100K sessions
- User sessions: O(log n) - ~25ms at 100K sessions
- Expired cleanup: O(n) but batched off-peak

---

## Monitoring & Metrics

### Key Metrics

**Session Health**:
- Active sessions count: `SELECT COUNT(*) FROM Session WHERE expiresAt > NOW()`
- Average session duration: `AVG(EXTRACT(EPOCH FROM (COALESCE(deletedAt, expiresAt) - createdAt)))`
- Session refresh rate: Count of sessions with `updatedAt > createdAt + 12h`

**Performance**:
- Session validation latency (P50, P95, P99)
- Database query count per session validation
- Cache hit rate (if cookie caching enabled)

**Security**:
- Failed validation attempts per hour
- IP address changes per session
- User agent changes per session
- Concurrent sessions per user (detect account sharing)

### Logging (FR-016)

**Events to Log**:

1. **Session Creation** (part of LOGIN event):
```json
{
  "eventType": "LOGIN",
  "userId": "clx_user_1234567890",
  "sessionId": "clx_session_1234567890",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "success": true,
  "timestamp": "2025-10-15T12:00:00.000Z"
}
```

2. **Session Expiration**:
```json
{
  "eventType": "TOKEN_EXPIRATION",
  "userId": "clx_user_1234567890",
  "sessionId": "clx_session_1234567890",
  "success": false,
  "timestamp": "2025-10-16T12:00:00.000Z"
}
```

3. **Sign-Out**:
```json
{
  "eventType": "LOGOUT",
  "userId": "clx_user_1234567890",
  "sessionId": "clx_session_1234567890",
  "ipAddress": "192.168.1.100",
  "success": true,
  "timestamp": "2025-10-15T18:00:00.000Z"
}
```

---

## Testing Scenarios

### Happy Path

**Test**: User signs in, stays active, session refreshes automatically

1. User signs in via Google OAuth → Session created, `expiresAt = now + 24h`
2. User votes after 6 hours → No refresh (age < 12h)
3. User comments after 13 hours → Session refreshed, `expiresAt = now + 24h`
4. User creates poll after 18 hours → No refresh (age < 12h since last refresh)
5. User stays authenticated

**Expected**:
- Session valid throughout
- Only one refresh (at 13-hour mark)
- User never sees login page

### Session Expiration

**Test**: User inactive for 24 hours, session expires

1. User signs in via Google OAuth → Session created
2. **User idle for 24 hours** → Session expires (`expiresAt < now`)
3. User returns, navigates to `/dashboard` → Middleware validates session
4. Session validation fails → Redirect to `/auth/signin`
5. User sees login page

**Expected**:
- Session marked expired in database
- Cookie still present but invalid
- Middleware redirects to sign-in

### Multi-Device Sign-Out

**Test**: User signs out on one device, other devices remain authenticated

1. User signs in on Device A → Session A created
2. User signs in on Device B → Session B created
3. User signs out on Device A → Session A deleted
4. User on Device B navigates to `/dashboard` → Session B validated
5. Device B remains authenticated

**Expected**:
- Only Session A deleted
- Session B remains active
- Device B user unaffected

### Revoke All Sessions

**Test**: User clicks "Sign out everywhere", all devices logged out

1. User signed in on 3 devices (Sessions A, B, C)
2. User clicks "Sign out everywhere" on Device A → All sessions deleted
3. Device B user navigates to `/dashboard` → Session B validation fails
4. Device C user navigates to `/polls` → Session C validation fails
5. All devices redirected to sign-in

**Expected**:
- All sessions deleted from database
- All devices see login page on next request

---

## Summary

**Session Characteristics**:
- **Duration**: 24 hours hard expiration
- **Refresh**: Automatic if used after 12 hours (extends to +24h from now)
- **Storage**: PostgreSQL database via Prisma
- **Token**: 32-byte secure random, Base64URL encoded
- **Cookie**: httpOnly, Secure (prod), SameSite=Lax
- **Termination**: User sign-out (current device only) or 24h expiration
- **Security**: CSRF protection, XSS prevention, session fixation prevention
- **Logging**: All lifecycle events logged (FR-016)

**Next Steps**:
1. Implement session validation middleware
2. Create sign-out server action
3. Add session cleanup cron job
4. Write E2E tests for session lifecycle
5. Monitor session metrics in production
