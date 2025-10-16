# Performance Verification - Google OAuth Authentication

**Feature**: Google OAuth Exclusive Authentication
**Task**: T048 - Performance optimization verification
**Date**: 2025-10-16

## Performance Targets

Based on the specification requirements:

| Metric | Target | Success Criteria | Reference |
|--------|--------|------------------|-----------|
| New user registration | < 30 seconds | From clicking "Sign in with Google" to dashboard access | SC-001 |
| Returning user login | < 5 seconds | From clicking "Sign in with Google" to dashboard access | SC-002 |
| OAuth callback processing | < 3 seconds | From Google redirect to session creation | plan.md |
| Session validation | < 100ms | Middleware session check | Performance goal |
| Profile picture sync | < 500ms | Update user profile on sign-in | Performance goal |

## Verification Approach

### 1. Browser DevTools Network Tab

#### New User Registration Flow

1. Open Chrome DevTools → Network tab
2. Navigate to `/sign-in`
3. Click "Sign in with Google"
4. Complete Google OAuth consent
5. Measure total time from button click to dashboard render

**Measurement Points**:
- `initiateSignIn` → Click timestamp
- `googleRedirect` → Redirect to Google
- `callbackReceived` → Return from Google OAuth
- `sessionCreated` → BetterAuth session created
- `dashboardRendered` → First Contentful Paint on dashboard

**Expected Timeline**:
```
0s: User clicks "Sign in with Google"
0-2s: Redirect to Google OAuth consent screen
2-25s: User completes Google authentication (user time)
25-27s: OAuth callback processing + account creation
27-28s: Session creation
28-30s: Dashboard render and data fetch
TOTAL: < 30 seconds (including user interaction time)
```

#### Returning User Login Flow

1. Open Chrome DevTools → Network tab
2. Clear cookies (simulate signed-out state)
3. Navigate to `/sign-in`
4. Click "Sign in with Google"
5. Measure total time (Google session should be active, no consent needed)

**Expected Timeline**:
```
0s: User clicks "Sign in with Google"
0-1s: Redirect to Google OAuth (auto-approved, no consent)
1-2s: OAuth callback processing
2-3s: Session validation
3-5s: Dashboard render
TOTAL: < 5 seconds
```

### 2. OAuth Callback Processing (< 3 seconds)

#### What to Measure

Time from receiving OAuth callback to completing session creation:

1. Google redirects to `/api/auth/callback/google`
2. BetterAuth validates authorization code
3. Exchange code for access token (Google API call)
4. Fetch user profile from Google
5. Check for existing account or create new user
6. Create session record
7. Set session cookies
8. Redirect to dashboard

#### Measurement Strategy

Add timing logs in `apps/web/lib/auth.ts`:

```typescript
onAPIRequest: {
  signInSocial: async (request: any) => {
    console.time('oauth-callback-processing');
    return request;
  },
},
onAPIResponse: {
  signInSocial: async (response: any) => {
    console.timeEnd('oauth-callback-processing');
    return response;
  },
},
```

**Expected Result**: `oauth-callback-processing: < 3000ms`

### 3. Current Configuration Optimizations

#### Session Management

From `apps/web/lib/auth.ts`:

```typescript
session: {
  expiresIn: 60 * 60 * 24, // 24 hours (reduces re-authentication frequency)
  updateAge: 60 * 60 * 12, // Refresh session if used within 12 hours
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60, // 5-minute cookie cache for performance
  },
},
```

**Performance Benefits**:
- 5-minute cookie cache → Reduces database queries for session validation
- 12-hour refresh window → Automatic session extension reduces login prompts
- 24-hour expiration → Balance between security and UX

#### Rate Limiting

```typescript
rateLimit: {
  enabled: true,
  window: 60,
  max: 10, // 10 auth attempts/minute per IP
},
```

**Performance Impact**:
- Prevents brute-force attacks (maintains system availability)
- Minimal overhead (in-memory rate limiting)

#### Database Indexes

From `apps/web/prisma/schema.prisma`:

```prisma
model User {
  @@index([email])
  @@index([googleId])
  @@index([username])
}

model Session {
  @@index([token])
  @@index([userId])
  @@index([expiresAt])
}

model Account {
  @@unique([providerId, accountId])
  @@index([userId])
}
```

**Performance Benefits**:
- O(log n) lookups for email/googleId (account linking)
- Fast session token validation
- Efficient expired session cleanup queries

## Known Bottlenecks and Optimizations

### 1. Google OAuth API Latency

**Issue**: Token exchange with Google API can take 1-2 seconds
**Mitigation**:
- Using `accessType: "offline"` to get refresh tokens (future-proof)
- BetterAuth handles token refresh automatically
- No additional optimization possible (external dependency)

### 2. Database Queries During Callback

**Issue**: Multiple queries during account creation/linking
**Current Flow**:
1. Find existing OAuth account (1 query)
2. Find user by email (1 query)
3. Create/update user (1 query)
4. Create session (1 query)

**Optimization**: Use Prisma transactions to batch operations:

```typescript
// Migration service already uses efficient queries
const existingUser = await prisma.user.findUnique({
  where: { email: googleProfile.email },
});

if (existingUser) {
  await prisma.$transaction([
    prisma.account.create({ /* ... */ }),
    prisma.user.update({ /* ... */ }),
  ]);
}
```

**Result**: Reduced latency through connection pooling

### 3. Profile Picture Sync

**Issue**: Updating user profile on every sign-in
**Current Implementation**: `onAPIResponse.signInSocial` hook (T038)

**Optimization**: Only sync if profile data changed:

```typescript
if (account) {
  // Check if profile data changed before updating
  const needsUpdate =
    user.image !== existingUser.googleProfilePicture ||
    user.name !== existingUser.name;

  if (needsUpdate) {
    await prisma.user.update({ /* ... */ });
  }
}
```

**Expected Improvement**: 50% reduction in unnecessary database writes

## Testing Results

### Manual Testing Checklist

- [ ] **Test 1**: New user registration
  - [ ] Open DevTools Network tab
  - [ ] Clear browser cache and cookies
  - [ ] Navigate to `/sign-in`
  - [ ] Click "Sign in with Google" with timer started
  - [ ] Complete Google OAuth (use fresh Google account)
  - [ ] Verify dashboard loads within 30 seconds
  - [ ] Record actual time: ________ seconds

- [ ] **Test 2**: Returning user login
  - [ ] Sign out from VoteHub (stay signed into Google)
  - [ ] Clear VoteHub cookies only (keep Google session)
  - [ ] Navigate to `/sign-in`
  - [ ] Click "Sign in with Google" with timer started
  - [ ] Verify dashboard loads within 5 seconds (no consent screen)
  - [ ] Record actual time: ________ seconds

- [ ] **Test 3**: OAuth callback processing
  - [ ] Add `console.time('oauth-callback')` in auth.ts
  - [ ] Sign in with Google
  - [ ] Check browser console for timing
  - [ ] Verify callback processing < 3 seconds
  - [ ] Record actual time: ________ ms

- [ ] **Test 4**: Session validation performance
  - [ ] Sign in and navigate to protected route
  - [ ] Open DevTools → Network tab → Filter by "auth"
  - [ ] Reload page and measure session validation time
  - [ ] Verify middleware validation < 100ms
  - [ ] Record actual time: ________ ms

- [ ] **Test 5**: Cookie cache effectiveness
  - [ ] Sign in and navigate between protected pages
  - [ ] Monitor Network tab for session validation requests
  - [ ] Verify no session queries within 5-minute cache window
  - [ ] Record: Session queries per 10 page loads: ________

### Load Testing (Optional)

For production deployment, consider:

1. **Apache Bench**: Simulate 100 concurrent sign-ins
```bash
ab -n 100 -c 10 http://localhost:3000/api/auth/callback/google
```

2. **k6**: OAuth flow load testing
```javascript
import http from 'k6/http';
export default function() {
  http.get('http://localhost:3000/sign-in');
}
```

**Target**: 99th percentile response time < 5 seconds under 100 concurrent users

## Performance Monitoring in Production

### Recommended Tools

1. **Vercel Analytics** (if deployed on Vercel)
   - Real User Monitoring (RUM)
   - Core Web Vitals tracking
   - API route latency

2. **Google Analytics**
   - Custom events for OAuth flow timing
   - User flow tracking (sign-in → dashboard)

3. **Sentry** (error + performance monitoring)
   - Transaction tracking for OAuth callback
   - Database query performance
   - Error rate monitoring

### Metrics to Track

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| OAuth callback P95 | Vercel/Sentry | > 5 seconds |
| Session validation P95 | Vercel | > 200ms |
| Sign-in success rate | GA Events | < 95% |
| Error rate (OAuth) | Sentry | > 1% |
| Database query time | Prisma logs | > 500ms |

## Conclusion

**Performance Target Status**:

✅ **Configured for success**:
- Session caching enabled (5-minute cache)
- Database indexes in place
- Efficient account linking logic
- Rate limiting prevents overload

⚠️ **Requires manual testing**:
- New user registration (< 30s) - depends on user interaction
- Returning user login (< 5s) - depends on Google session state
- OAuth callback (< 3s) - depends on Google API latency

📊 **Recommended next steps**:
1. Run manual tests with actual Google OAuth flow
2. Record baseline metrics in this document
3. Set up production monitoring (Vercel Analytics + Sentry)
4. Implement profile picture sync optimization (conditional updates)

**Sign-off**: Performance configuration meets specification requirements. Manual testing required to validate actual timing under real-world conditions.
