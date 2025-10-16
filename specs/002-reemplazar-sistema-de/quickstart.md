# Quickstart: Google OAuth Authentication

**Time to complete**: ~15 minutes
**Prerequisites**: Google account, VoteHub dev environment running

## Overview

This quickstart guide gets Google OAuth authentication working in your local VoteHub development environment in 5 steps.

---

## Step 1: Google Cloud Setup (5 minutes)

### 1.1 Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Select **Web application**
4. Name: `VoteHub Dev`
5. Add redirect URI:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
6. Click **Create**
7. **Copy** Client ID and Client Secret (you'll need these in Step 2)

### 1.2 Configure Consent Screen (Optional - for first OAuth setup)

If prompted, configure OAuth consent screen:
1. Go to **OAuth consent screen**
2. Select **External**
3. Fill required fields:
   - App name: `VoteHub`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue** through all steps

---

## Step 2: Environment Variables (2 minutes)

### 2.1 Update `.env`

Add these to `apps/web/.env`:

```env
# Add these lines (keep existing variables):
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-YOUR_CLIENT_SECRET"
```

**Replace**:
- `YOUR_CLIENT_ID` → Your Client ID from Step 1.1
- `YOUR_CLIENT_SECRET` → Your Client Secret from Step 1.1

---

## Step 3: Update BetterAuth Config (3 minutes)

### 3.1 Edit `apps/web/lib/auth.ts`

Add Google provider to existing config:

```typescript
export const auth = betterAuth({
  // ... existing config ...

  // ADD THIS:
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account",
      accessType: "offline",
    },
  },

  // ... rest of config ...
});
```

---

## Step 4: Database Migration (2 minutes)

### 4.1 Generate & Apply Migration

```bash
cd apps/web

# Generate BetterAuth schema
npx @better-auth/cli generate

# Apply migration to database
npx prisma migrate dev --name add-google-oauth
```

**Expected output**:
```
✅ Generated BetterAuth schema
✅ Migration applied successfully
```

---

## Step 5: Test OAuth Flow (3 minutes)

### 5.1 Start Dev Server

```bash
# From monorepo root
pnpm dev
```

### 5.2 Test Sign-In

1. Navigate to: `http://localhost:3000/sign-in`
2. Click "Sign in with Google"
3. Select your Google account
4. Click "Continue" to authorize
5. Verify redirect to dashboard

### 5.3 Verify Database

```bash
npx prisma studio
```

Check these tables:
- ✅ `User` - New user created with your Google email
- ✅ `Session` - Active session with 24h expiration
- ✅ `Account` - OAuth link to Google

---

## ✅ You're Done!

Google OAuth is now working in your local environment.

**Next Steps**:
- **Full Configuration**: See [readme-auth-config.md](./readme-auth-config.md)
- **Implementation Details**: See [plan.md](./plan.md)
- **Data Model**: See [data-model.md](./data-model.md)

---

## Troubleshooting

### "Redirect URI Mismatch"

**Fix**: Verify redirect URI in Google Console exactly matches:
```
http://localhost:3000/api/auth/callback/google
```

### Environment Variables Not Loading

**Fix**: Restart dev server after adding variables:
```bash
# Stop server (Ctrl+C)
pnpm dev
```

### Migration Fails

**Fix**: Check database connection:
```bash
npx prisma db pull
```

---

## Configuration Reference

**Environment Variables**:
```env
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
AUTH_SECRET="your-existing-secret"
AUTH_URL="http://localhost:3000"
```

**Google OAuth Settings**:
- Redirect URI: `http://localhost:3000/api/auth/callback/google`
- Scopes: `openid`, `email`, `profile`
- Session Duration: 24 hours

**Rate Limiting**:
- 10 authentication attempts per minute per IP
- Configurable in `auth.ts` → `rateLimit` section

---

## Support

For detailed setup instructions, see [readme-auth-config.md](./readme-auth-config.md).

For implementation questions, refer to:
- Research: [research.md](./research.md)
- OAuth Flow: [contracts/oauth-flow.md](./contracts/oauth-flow.md)
- Session Management: [contracts/session-management.md](./contracts/session-management.md)
