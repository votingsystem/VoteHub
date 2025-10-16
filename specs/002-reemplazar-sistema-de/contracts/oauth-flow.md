# OAuth Flow Contract: Google Authentication

**Feature**: Google OAuth Exclusive Authentication
**Protocol**: OAuth 2.0 with PKCE
**Provider**: Google
**Date**: 2025-10-15

## Overview

This document defines the OAuth 2.0 authorization flow for Google authentication in VoteHub. The implementation uses BetterAuth which handles the OAuth protocol automatically, but this contract documents the expected behavior and API interactions for testing and integration purposes.

---

## Flow Diagram

```
┌─────────┐                                    ┌──────────┐                                   ┌────────────┐
│ Browser │                                    │ VoteHub  │                                   │   Google   │
│         │                                    │  Server  │                                   │   OAuth    │
└────┬────┘                                    └────┬─────┘                                   └──────┬─────┘
     │                                              │                                                │
     │ 1. Click "Sign in with Google"               │                                                │
     ├─────────────────────────────────────────────>│                                                │
     │                                              │                                                │
     │ 2. Redirect to Google OAuth                  │                                                │
     │<─────────────────────────────────────────────┤                                                │
     │   GET /api/auth/sign-in/social?provider=google                                                │
     │   with state + PKCE code_challenge           │                                                │
     │                                              │                                                │
     │ 3. Authorize VoteHub                         │                                                │
     ├──────────────────────────────────────────────┼───────────────────────────────────────────────>│
     │   (User selects Google account & grants)     │                                                │
     │                                              │                                                │
     │ 4. Redirect back with authorization code     │                                                │
     │<─────────────────────────────────────────────┼────────────────────────────────────────────────┤
     │   GET /api/auth/callback/google?code=xxx&state=xxx                                            │
     │                                              │                                                │
     │ 5. Forward callback to VoteHub               │                                                │
     ├─────────────────────────────────────────────>│                                                │
     │                                              │                                                │
     │                                              │ 6. Exchange code for tokens                    │
     │                                              ├───────────────────────────────────────────────>│
     │                                              │   POST /token with code + code_verifier        │
     │                                              │                                                │
     │                                              │ 7. Return access token + user info             │
     │                                              │<───────────────────────────────────────────────┤
     │                                              │   {access_token, id_token, user_info}          │
     │                                              │                                                │
     │                                              │ 8. Create/link user account                    │
     │                                              │    Create session (24h expiration)             │
     │                                              │    Log auth event                              │
     │                                              │                                                │
     │ 9. Redirect to callbackURL with session      │                                                │
     │<─────────────────────────────────────────────┤                                                │
     │   Set-Cookie: session_token (httpOnly)       │                                                │
     │                                              │                                                │
     │ 10. User lands on dashboard (authenticated)  │                                                │
     │                                              │                                                │
```

---

## Step 1: Initiate OAuth Flow

**User Action**: Clicks "Sign in with Google" button

**Client Request**:
```typescript
// User clicks button, client calls BetterAuth API
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/dashboard",
  errorCallbackURL: "/auth/error",
});
```

**Backend Processing**:
1. BetterAuth generates OAuth state parameter (CSRF protection)
2. Generates PKCE `code_verifier` and `code_challenge`
3. Stores state in session storage (database)
4. Constructs Google authorization URL

**Response**:
```http
HTTP/1.1 302 Found
Location: https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID.apps.googleusercontent.com&
  redirect_uri=http://localhost:3000/api/auth/callback/google&
  response_type=code&
  scope=openid%20email%20profile&
  state=RANDOM_STATE_TOKEN&
  code_challenge=BASE64_URL_CHALLENGE&
  code_challenge_method=S256&
  prompt=select_account&
  access_type=offline
```

**Query Parameters**:
- `client_id`: Google OAuth client ID from environment variable
- `redirect_uri`: OAuth callback URL (must match Google Console config)
- `response_type`: Always `code` (authorization code flow)
- `scope`: `openid email profile` (FR-002: essential scopes only)
- `state`: Random CSRF token (validated on callback)
- `code_challenge`: SHA256 hash of `code_verifier` (PKCE)
- `code_challenge_method`: Always `S256` (SHA-256)
- `prompt`: `select_account` (always show account picker)
- `access_type`: `offline` (request refresh token, not used but future-proof)

---

## Step 2: User Authorizes on Google

**User Action**: Selects Google account and clicks "Continue" to authorize VoteHub

**Google Consent Screen Shows**:
- App name: "VoteHub"
- Requested permissions:
  - See your primary Google Account email address
  - See your personal info, including any personal info you've made publicly available
  - View your Google profile picture

**Possible Outcomes**:
1. **User grants authorization** → Proceed to Step 3
2. **User denies authorization** → Redirect to `errorCallbackURL` with error code
3. **User closes popup/tab** → No callback (session timeout)

---

## Step 3: Google Redirects with Authorization Code

**Google Response** (if authorized):
```http
HTTP/1.1 302 Found
Location: http://localhost:3000/api/auth/callback/google?
  code=AUTHORIZATION_CODE&
  state=RANDOM_STATE_TOKEN&
  scope=openid%20email%20profile
```

**Query Parameters**:
- `code`: One-time authorization code (expires in 10 minutes)
- `state`: Same state token sent in Step 1 (CSRF validation)
- `scope`: Granted scopes (should match requested scopes)

**Error Response** (if denied):
```http
HTTP/1.1 302 Found
Location: http://localhost:3000/api/auth/callback/google?
  error=access_denied&
  error_description=The+user+denied+access&
  state=RANDOM_STATE_TOKEN
```

---

## Step 4: VoteHub Callback Handler

**Endpoint**: `GET /api/auth/callback/google`

**Request** (from Google):
```http
GET /api/auth/callback/google?code=AUTHORIZATION_CODE&state=RANDOM_STATE_TOKEN HTTP/1.1
Host: localhost:3000
```

**Backend Processing**:

1. **Validate State Parameter** (CSRF protection):
```typescript
const storedState = await getStateFromSession(request);
if (state !== storedState) {
  return redirect("/auth/error?error=invalid_state");
}
```

2. **Exchange Authorization Code for Tokens**:
```http
POST https://oauth2.googleapis.com/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
client_id=YOUR_CLIENT_ID.apps.googleusercontent.com&
client_secret=YOUR_CLIENT_SECRET&
redirect_uri=http://localhost:3000/api/auth/callback/google&
code_verifier=ORIGINAL_CODE_VERIFIER
```

**Google Token Response**:
```json
{
  "access_token": "ya29.a0AfH6SMBx...",
  "expires_in": 3599,
  "token_type": "Bearer",
  "scope": "openid email profile",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE...",
  "refresh_token": "1//0gK..." // Optional, only on first consent
}
```

3. **Decode ID Token** (JWT with user info):
```json
{
  "iss": "https://accounts.google.com",
  "sub": "1234567890",  // Google user ID (use as googleId)
  "email": "user@gmail.com",
  "email_verified": true,
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/a/default-user=s96-c",
  "given_name": "John",
  "family_name": "Doe",
  "locale": "en"
}
```

4. **Create or Link User Account**:
```typescript
const googleProfile = {
  id: idToken.sub,
  email: idToken.email,
  name: idToken.name,
  picture: idToken.picture,
  accessToken: tokenResponse.access_token,
  tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
};

const userId = await migrationService.linkGoogleAccount(googleProfile);
// See data-model.md for migration logic
```

5. **Create Session** (24-hour expiration):
```typescript
const session = await prisma.session.create({
  data: {
    userId,
    token: generateSecureToken(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  },
});
```

6. **Log Authentication Event** (FR-016):
```typescript
await prisma.authEvent.create({
  data: {
    userId,
    eventType: 'LOGIN',
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
    success: true,
    timestamp: new Date(),
  },
});
```

7. **Set Session Cookie and Redirect**:
```http
HTTP/1.1 302 Found
Location: /dashboard
Set-Cookie: session_token=SECURE_TOKEN; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400
```

---

## Step 5: Authenticated Request Flow

**User Action**: Navigates to protected page (e.g., `/polls/create`)

**Client Request**:
```http
GET /polls/create HTTP/1.1
Host: localhost:3000
Cookie: session_token=SECURE_TOKEN
```

**Middleware Processing**:
```typescript
// apps/web/middleware.ts
const session = await auth.api.getSession({ headers: await headers() });

if (!session) {
  return NextResponse.redirect(new URL("/auth/signin", request.url));
}

// Session valid, allow request to proceed
return NextResponse.next();
```

**Session Validation**:
1. Extract `session_token` from cookie
2. Query database: `SELECT * FROM Session WHERE token = ? AND expiresAt > NOW()`
3. If found: Allow request, optionally refresh session if > 12 hours old
4. If not found or expired: Redirect to `/auth/signin`

---

## API Endpoints

### POST /api/auth/sign-in/social

**Purpose**: Initiate Google OAuth flow

**Request**:
```http
POST /api/auth/sign-in/social HTTP/1.1
Content-Type: application/json

{
  "provider": "google",
  "callbackURL": "/dashboard",
  "errorCallbackURL": "/auth/error"
}
```

**Response** (success):
```http
HTTP/1.1 302 Found
Location: https://accounts.google.com/o/oauth2/v2/auth?client_id=...
```

**Response** (rate limited):
```http
HTTP/1.1 429 Too Many Requests
X-Retry-After: 60
Content-Type: application/json

{
  "error": "rate_limit_exceeded",
  "message": "Too many sign-in attempts. Please try again in 60 seconds."
}
```

---

### GET /api/auth/callback/google

**Purpose**: Handle OAuth callback from Google

**Request**:
```http
GET /api/auth/callback/google?code=AUTH_CODE&state=STATE_TOKEN HTTP/1.1
```

**Response** (success):
```http
HTTP/1.1 302 Found
Location: /dashboard
Set-Cookie: session_token=...; HttpOnly; Secure; SameSite=Lax; Max-Age=86400
```

**Response** (error):
```http
HTTP/1.1 302 Found
Location: /auth/error?error=oauth_callback_error&message=Invalid+authorization+code
```

---

### POST /api/auth/sign-out

**Purpose**: Terminate user session

**Request**:
```http
POST /api/auth/sign-out HTTP/1.1
Cookie: session_token=SECURE_TOKEN
```

**Backend Processing**:
1. Extract session token from cookie
2. Delete session from database: `DELETE FROM Session WHERE token = ?`
3. Log sign-out event (FR-016)
4. Clear session cookie

**Response**:
```http
HTTP/1.1 302 Found
Location: /
Set-Cookie: session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

---

### GET /api/auth/get-session

**Purpose**: Check authentication status (used by middleware and client)

**Request**:
```http
GET /api/auth/get-session HTTP/1.1
Cookie: session_token=SECURE_TOKEN
```

**Response** (authenticated):
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "user": {
    "id": "clx1234567890",
    "email": "user@gmail.com",
    "name": "John Doe",
    "role": "VOTER",
    "googleProfilePicture": "https://lh3.googleusercontent.com/a/default-user=s96-c"
  },
  "session": {
    "expiresAt": "2025-10-16T12:00:00.000Z",
    "createdAt": "2025-10-15T12:00:00.000Z"
  }
}
```

**Response** (unauthenticated):
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "unauthorized",
  "message": "No active session found"
}
```

---

## Error Handling

### OAuth Errors

**User Denies Authorization**:
```http
GET /api/auth/callback/google?error=access_denied&state=STATE HTTP/1.1
→ Redirect to /auth/error?error=unauthorized
```

**Invalid State (CSRF Attack)**:
```http
GET /api/auth/callback/google?code=AUTH_CODE&state=INVALID_STATE HTTP/1.1
→ Redirect to /auth/error?error=invalid_state
```

**Authorization Code Expired**:
```http
POST https://oauth2.googleapis.com/token
← 400 Bad Request: {"error": "invalid_grant"}
→ Redirect to /auth/error?error=oauth_callback_error
```

**Rate Limit Exceeded**:
```http
POST /api/auth/sign-in/social
→ 429 Too Many Requests
→ Redirect to /auth/error?error=rate_limit
```

### Application Errors

**Database Connection Failure** (during account creation):
```typescript
try {
  await migrationService.linkGoogleAccount(googleProfile);
} catch (error) {
  await logAuthEvent({
    eventType: 'FAILED_ATTEMPT',
    success: false,
    errorMessage: error.message,
  });
  return redirect("/auth/error?error=unknown");
}
```

**Network Timeout** (during token exchange):
```typescript
try {
  const tokens = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: tokenRequestBody,
    signal: AbortSignal.timeout(10000), // 10-second timeout
  });
} catch (error) {
  return redirect("/auth/error?error=network_error");
}
```

---

## Security Measures

### CSRF Protection

**State Parameter**:
- Generated: Secure random 32-byte value
- Stored: Database-backed session store
- Validated: On callback, must match stored value
- Single-use: Deleted after validation

**Implementation** (automatic via BetterAuth):
```typescript
// State generation (automatic)
const state = crypto.randomBytes(32).toString('base64url');
await stateStore.set(state, { expiresAt: Date.now() + 600000 }); // 10 min

// State validation (automatic)
const storedState = await stateStore.get(state);
if (!storedState || storedState.expiresAt < Date.now()) {
  throw new Error("Invalid or expired state");
}
await stateStore.delete(state); // Single-use
```

### PKCE (Proof Key for Code Exchange)

**Flow**:
1. Generate `code_verifier`: Random 128-byte value
2. Compute `code_challenge`: Base64URL(SHA256(code_verifier))
3. Send `code_challenge` in authorization request
4. Send `code_verifier` in token exchange
5. Google validates: SHA256(code_verifier) === code_challenge

**Implementation** (automatic via BetterAuth):
```typescript
// PKCE generation (automatic)
const codeVerifier = crypto.randomBytes(128).toString('base64url');
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

// Store code_verifier for token exchange
await pkceStore.set(state, codeVerifier);
```

### Token Storage

**Access Token**:
- Stored: Database (`OAuthAccount.accessToken`)
- Encrypted: At rest (BetterAuth automatic encryption)
- Not exposed: Never sent to client

**Session Token**:
- Stored: httpOnly cookie (XSS protection)
- Secure: HTTPS-only in production
- SameSite: Lax (CSRF protection)
- Signed: Prevents tampering

---

## Performance Considerations

### Latency Targets

**OAuth Flow** (Steps 1-9):
- Target: <3 seconds total (Google redirect + callback processing)
- Breakdown:
  - Step 1-2 (redirect to Google): <200ms
  - Step 3-4 (Google authorization): 1-2s (user-dependent)
  - Step 5-9 (callback processing): <800ms

**Session Validation** (Step 5):
- Target: <50ms
- Database query: <20ms (indexed lookup)
- Cookie parsing: <5ms

### Caching Strategy

**Session Validation**:
```typescript
session: {
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60, // 5-minute cache
  },
}
```

**Benefits**:
- Reduces database queries for repeated session checks
- Session cached in memory for 5 minutes
- Tradeoff: Revoked sessions may take up to 5 minutes to propagate

---

## Testing Scenarios

### Happy Path
1. User clicks "Sign in with Google"
2. Redirected to Google, selects account
3. Grants authorization
4. Redirected back to VoteHub dashboard
5. Session created, user authenticated

### Error Scenarios

**User Denies Authorization**:
1. User clicks "Sign in with Google"
2. Redirected to Google, selects account
3. **Clicks "Cancel"**
4. Redirected to `/auth/error?error=unauthorized`
5. Clear error message displayed

**Rate Limit Exceeded**:
1. User makes 10 sign-in attempts in 60 seconds
2. **11th attempt blocked**
3. Returns 429 Too Many Requests
4. Error message: "Too many attempts. Please wait 60 seconds."

**Session Expiration**:
1. User signs in successfully
2. Session created with 24-hour expiration
3. **Wait 24 hours (or manually set expiresAt to past)**
4. User navigates to protected page
5. Middleware detects expired session
6. Redirected to `/auth/signin`

**Network Failure During Token Exchange**:
1. User authorizes on Google
2. Google redirects to callback URL
3. **Network timeout during token exchange**
4. Error caught, logged
5. Redirected to `/auth/error?error=network_error`

---

## Monitoring & Logging

### Metrics to Track

**Success Metrics**:
- OAuth flow completion rate (Step 1 → Step 9)
- Average OAuth flow duration
- Session creation success rate

**Error Metrics**:
- Authorization denial rate (Step 3)
- Callback processing errors (Step 4-9)
- Rate limit hits (Step 1)
- Token exchange failures (Step 6)

### Log Events (FR-016)

**Successful Login**:
```json
{
  "eventType": "LOGIN",
  "userId": "clx1234567890",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "success": true,
  "timestamp": "2025-10-15T12:00:00.000Z"
}
```

**Failed Attempt (Rate Limited)**:
```json
{
  "eventType": "FAILED_ATTEMPT",
  "userId": null,
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "success": false,
  "errorMessage": "Rate limit exceeded",
  "timestamp": "2025-10-15T12:05:00.000Z"
}
```

---

## Summary

**Key Characteristics**:
- Protocol: OAuth 2.0 with PKCE
- Security: CSRF protection via state parameter, httpOnly cookies, HTTPS
- Session: 24-hour expiration, database-backed
- Rate Limiting: 10 attempts/minute per IP
- Error Handling: Graceful degradation, user-friendly messages
- Logging: All authentication events logged (FR-016)

**Next Steps**:
1. Implement callback handler (`apps/web/app/api/auth/callback/google/route.ts`)
2. Create sign-in page with Google button (`apps/web/app/sign-in/page.tsx`)
3. Add middleware for session validation (`apps/web/middleware.ts`)
4. Write E2E tests for OAuth flow
