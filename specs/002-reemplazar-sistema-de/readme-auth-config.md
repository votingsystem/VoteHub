# Google OAuth Authentication - Complete Configuration Guide

**Project**: VoteHub
**Feature**: Google OAuth Exclusive Authentication
**Tech Stack**: Next.js 15, React 19, BetterAuth 1.3.27, TypeScript 5.7+
**Date**: 2025-10-15

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Console Setup](#google-cloud-console-setup)
3. [Environment Variables](#environment-variables)
4. [BetterAuth Configuration](#betterauth-configuration)
5. [Database Schema Migration](#database-schema-migration)
6. [Application Setup](#application-setup)
7. [Testing the Authentication Flow](#testing-the-authentication-flow)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 20+ installed
- ✅ pnpm 10.4.1+ installed
- ✅ PostgreSQL database (local or Supabase)
- ✅ VoteHub monorepo cloned and dependencies installed
- ✅ Existing BetterAuth setup (version 1.3.27)
- ✅ Google account for Google Cloud Console access

**Verify Prerequisites**:

```bash
# Check Node.js version
node --version  # Should be v20.x.x or higher

# Check pnpm version
pnpm --version  # Should be 10.4.1 or higher

# Verify database connection
cd apps/web
pnpm prisma db pull  # Should connect successfully

# Verify BetterAuth installation
pnpm list better-auth  # Should show 1.3.27
```

---

## Google Cloud Console Setup

### Step 1: Create a New Project (or Use Existing)

1. Navigate to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Enter project details:
   - **Project name**: `VoteHub` (or your preferred name)
   - **Organization**: Leave as "No organization" (or select if applicable)
4. Click **Create**
5. Wait for project creation (30-60 seconds)

### Step 2: Enable Google+ API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for **"Google+ API"**
3. Click on **Google+ API**
4. Click **Enable**

_Note: This API is required for OAuth profile access (email, name, picture)._

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **User Type**:
   - **External**: For public-facing app (choose this for VoteHub)
   - **Internal**: Only for Google Workspace organizations
3. Click **Create**
4. Fill out the OAuth consent screen:

**App Information**:
- **App name**: `VoteHub`
- **User support email**: `your-email@gmail.com`
- **App logo**: (Optional) Upload VoteHub logo (120x120px PNG)

**App Domain**:
- **Application home page**: `https://votehub.com` (or your domain)
- **Application privacy policy link**: `https://votehub.com/privacy`
- **Application terms of service link**: `https://votehub.com/terms`

**Authorized Domains**:
- Add your production domain: `votehub.com`
- Click **Add Domain**

**Developer Contact Information**:
- **Email addresses**: `your-email@gmail.com`

5. Click **Save and Continue**

**Scopes** (Step 2 of consent screen):
1. Click **Add or Remove Scopes**
2. Select these scopes:
   - ✅ `.../auth/userinfo.email` (See your primary Google Account email address)
   - ✅ `.../auth/userinfo.profile` (See your personal info, including any personal info you've made publicly available)
   - ✅ `openid` (Authenticate using OpenID Connect)
3. Click **Update**
4. Click **Save and Continue**

**Test Users** (Step 3 - for development):
1. Click **Add Users**
2. Enter your Google email addresses (one per line):
   ```
   your-email@gmail.com
   colleague@gmail.com
   ```
3. Click **Add**
4. Click **Save and Continue**

**Summary** (Step 4):
- Review all settings
- Click **Back to Dashboard**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Configure the OAuth client:

**Application Type**:
- Select **Web application**

**Name**:
- Enter: `VoteHub Web Client`

**Authorized JavaScript Origins**:
- Development: `http://localhost:3000`
- Production: `https://votehub.com`
- Click **Add URI** for each

**Authorized Redirect URIs**:
- Development: `http://localhost:3000/api/auth/callback/google`
- Production: `https://votehub.com/api/auth/callback/google`
- Click **Add URI** for each

_⚠️ Critical: Redirect URIs must match exactly (no trailing slashes)_

4. Click **Create**
5. **Save Your Credentials**:
   - A popup appears with your **Client ID** and **Client Secret**
   - Copy both immediately (you'll add them to `.env` next)
   - Client ID format: `123456789-abc123def456.apps.googleusercontent.com`
   - Client Secret format: `GOCSPX-xxxxxxxxxxxxxxxxxxxxx`

6. Click **OK** to close the popup

_💡 Tip: You can always retrieve these credentials by clicking on the OAuth client name in the credentials list._

---

## Environment Variables

### Step 1: Locate Environment Files

Navigate to your web app directory:

```bash
cd /Users/jgzornoza/PCVR/local-dev/SDD\ (Specs\ Driven\ Development)/VoteHub/apps/web
```

### Step 2: Update Development Environment (`.env`)

Open `apps/web/.env` and add these variables:

```env
# ============================================
# EXISTING VARIABLES (already configured)
# ============================================

# Database
DATABASE_URL="postgresql://..." # Your existing database URL
DIRECT_URL="postgresql://..."   # Your existing direct URL (Supabase)

# BetterAuth (existing)
AUTH_SECRET="XV07HBavSmkk/wmfILzPRjwd2CHSt8UqTZfp44PrwYA="
AUTH_URL="http://localhost:3000"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ============================================
# NEW VARIABLES (add these)
# ============================================

# Google OAuth Credentials
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-YOUR_CLIENT_SECRET"
```

**Replace placeholders**:
- `YOUR_CLIENT_ID.apps.googleusercontent.com` → Your Client ID from Step 4 above
- `GOCSPX-YOUR_CLIENT_SECRET` → Your Client Secret from Step 4 above

**Example**:
```env
GOOGLE_CLIENT_ID="123456789-abc123def456ghi789jkl012mno345pqr.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-1234567890ABCDEFGHIJKLMNOPQRSTUVWXyz"
```

### Step 3: Create Production Environment (`.env.production`)

Create a new file for production: `apps/web/.env.production`

```env
# ============================================
# PRODUCTION ENVIRONMENT VARIABLES
# ============================================

# Database (production)
DATABASE_URL="postgresql://..." # Your production database URL
DIRECT_URL="postgresql://..."   # Your production direct URL

# BetterAuth (production)
# ⚠️ IMPORTANT: Generate a NEW secret for production (never reuse development secret)
AUTH_SECRET="YOUR_PRODUCTION_SECRET_HERE"  # Generate with: openssl rand -base64 32
AUTH_URL="https://votehub.com"  # Your production domain

# Next.js (production)
NEXT_PUBLIC_APP_URL="https://votehub.com"

# Google OAuth Credentials (production)
# ⚠️ IMPORTANT: Create SEPARATE OAuth credentials for production in Google Console
GOOGLE_CLIENT_ID="YOUR_PROD_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-YOUR_PROD_CLIENT_SECRET"
```

**Generate Production `AUTH_SECRET`**:

```bash
# Run this command to generate a secure secret:
openssl rand -base64 32

# Example output:
# XV07HBavSmkk/wmfILzPRjwd2CHSt8UqTZfp44PrwYA=

# Copy this output and paste it as your AUTH_SECRET in .env.production
```

### Step 4: Update `.gitignore` (Security)

Ensure `.env` files are never committed:

```bash
# Check if .env is already ignored
cat .gitignore | grep ".env"

# If not found, add these lines to .gitignore:
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

**Verify**: Run `git status` - `.env` files should NOT appear in untracked files.

---

## BetterAuth Configuration

### Step 1: Update BetterAuth Config

Open `apps/web/lib/auth.ts` and update the configuration:

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";

export const auth = betterAuth({
  // Existing database adapter
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // ============================================
  // EXISTING CONFIGURATION (keep this)
  // ============================================

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "VOTER",
        required: true,
      },
      username: {
        type: "string",
        required: true,
      },
    },
  },

  // ============================================
  // NEW: Google OAuth Provider
  // ============================================

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Always prompt account selection (good UX for multi-account users)
      prompt: "select_account",
      // Get refresh tokens for long-term access (not used but future-proof)
      accessType: "offline",
    },
  },

  // ============================================
  // SESSION CONFIGURATION (updated)
  // ============================================

  session: {
    expiresIn: 60 * 60 * 24,         // 24 hours (86400 seconds)
    updateAge: 60 * 60 * 12,         // Refresh session if used after 12 hours
    freshAge: 60 * 60 * 24,          // Session considered "fresh" for 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,                // 5-minute cookie cache for performance
    },
  },

  // ============================================
  // RATE LIMITING (FR-018: 10 attempts/minute)
  // ============================================

  rateLimit: {
    enabled: true,                   // Enabled in all environments
    window: 60,                      // 60 seconds
    max: 10,                         // 10 requests per window per IP
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 3,                      // Stricter for email sign-in
      },
      "/sign-in/social": {
        window: 60,
        max: 10,                     // 10 Google OAuth attempts per minute
      },
    },
  },

  // ============================================
  // SECURITY CONFIGURATION
  // ============================================

  trustedOrigins: [
    process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined,
    process.env.NEXT_PUBLIC_APP_URL,
    // Add production domains:
    // "https://votehub.com",
    // "https://www.votehub.com",
  ].filter(Boolean) as string[],

  advanced: {
    ipAddress: {
      // Configure based on hosting provider:
      // Vercel/Netlify: ["x-forwarded-for"]
      // Cloudflare: ["cf-connecting-ip"]
      // Nginx: ["x-real-ip"]
      ipAddressHeaders: ["x-forwarded-for"],
    },
  },

  // ============================================
  // ERROR HANDLING
  // ============================================

  onAPIError: {
    throw: false,                    // Don't throw errors, handle gracefully
    onError: (error, ctx) => {
      console.error("BetterAuth API Error:", {
        error: error.message,
        path: ctx.path,
        method: ctx.request.method,
        timestamp: new Date().toISOString(),
      });
      // TODO: Send to error tracking service (Sentry, etc.)
    },
  },

  // ============================================
  // BASE CONFIGURATION
  // ============================================

  secret: process.env.AUTH_SECRET!,
  baseURL: process.env.AUTH_URL!,

  // ============================================
  // PLUGINS (must be last)
  // ============================================

  plugins: [
    nextCookies(), // Must be last plugin - handles Next.js cookie management
  ],
});

// Type exports for TypeScript
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
```

**Configuration Explanation**:

| Option | Value | Purpose |
|--------|-------|---------|
| `socialProviders.google` | Client ID/Secret | Google OAuth credentials |
| `prompt: "select_account"` | Always show picker | Good UX for multi-account users |
| `accessType: "offline"` | Request refresh token | Future-proof (not used in spec) |
| `expiresIn: 86400` | 24 hours | Maximum session duration (FR-005) |
| `updateAge: 43200` | 12 hours | Refresh if used after 12h |
| `rateLimit.max: 10` | 10/minute | FR-018 requirement |
| `nextCookies()` | Plugin | Required for Next.js 15 cookie handling |

### Step 2: Create Client Auth Utilities

Create or update `apps/web/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

// For TypeScript type inference
export type AuthClient = typeof authClient;
```

---

## Database Schema Migration

### Step 1: Generate BetterAuth Schema

BetterAuth CLI automatically generates the required database schema:

```bash
# Navigate to web app directory
cd apps/web

# Generate BetterAuth schema (updates prisma/schema.prisma)
npx @better-auth/cli generate
```

**Expected Output**:
```
✅ Generated BetterAuth schema
   Added tables: user, session, account, verification
   Updated: prisma/schema.prisma
```

### Step 2: Review Schema Changes

Open `apps/web/prisma/schema.prisma` and verify these tables were added/updated:

```prisma
model User {
  id                     String        @id @default(cuid())
  email                  String        @unique
  name                   String
  username               String        @unique
  role                   Role          @default(VOTER)

  // New Google OAuth fields (added by BetterAuth)
  emailVerified          Boolean       @default(false)
  image                  String?

  // Relationships
  sessions               Session[]
  accounts               Account[]     // New: OAuth accounts
  polls                  Poll[]
  votes                  Vote[]
  comments               Comment[]

  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  @@index([email])
  @@index([username])
}

model Session {
  id         String    @id @default(cuid())
  userId     String
  token      String    @unique
  expiresAt  DateTime
  createdAt  DateTime  @default(now())
  ipAddress  String?
  userAgent  String?

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@index([expiresAt])
}

model Account {
  id                 String    @id @default(cuid())
  userId             String
  accountId          String    // Google user ID
  providerId         String    // "google"
  accessToken        String?
  refreshToken       String?
  expiresAt          DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@index([userId])
}

model Verification {
  id         String    @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime  @default(now())

  @@unique([identifier, value])
}
```

### Step 3: Create Migration

Generate a Prisma migration for the schema changes:

```bash
# Create migration
npx prisma migrate dev --name add-google-oauth

# Expected output:
# Applying migration `20251015120000_add_google_oauth`
# ✅ Migration applied successfully
```

**What this does**:
- Creates SQL migration file in `prisma/migrations/`
- Applies migration to development database
- Updates Prisma Client types

### Step 4: Verify Database

Check that tables were created successfully:

```bash
# Open Prisma Studio to inspect database
npx prisma studio

# Navigate to: http://localhost:5555
# Verify these tables exist:
# - User (with new fields)
# - Session
# - Account (new)
# - Verification (new)
```

---

## Application Setup

### Step 1: Create Sign-In Page

Create `apps/web/app/sign-in/page.tsx`:

```typescript
import { Suspense } from "react";
import { GoogleSignInButton } from "@workspace/ui/components/auth/google-sign-in-button";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to VoteHub</h1>
          <p className="text-muted-foreground">
            Sign in with your Google account to continue
          </p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <GoogleSignInButton />
        </Suspense>
      </div>
    </div>
  );
}
```

### Step 2: Create Google Sign-In Button Component

Create `packages/ui/src/components/auth/google-sign-in-button.tsx`:

```typescript
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authClient.signIn.social(
        {
          provider: "google",
          callbackURL: "/dashboard",
          errorCallbackURL: "/auth/error",
        },
        {
          onRequest: () => {
            setIsLoading(true);
          },
          onSuccess: () => {
            // User will be redirected to callbackURL
            console.log("Google sign-in successful");
          },
          onError: (ctx) => {
            const errorMessage = ctx.error.message;

            if (errorMessage.includes("rate limit")) {
              setError("Too many attempts. Please try again later.");
            } else if (errorMessage.includes("unauthorized")) {
              setError("Google sign-in was cancelled or failed.");
            } else {
              setError("An unexpected error occurred. Please try again.");
            }

            setIsLoading(false);
          },
        }
      );
    } catch (err) {
      setError("Failed to sign in with Google");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        variant="outline"
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          "Signing in..."
        ) : (
          <>
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
```

### Step 3: Create Auth Middleware

Create `apps/web/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function middleware(request: NextRequest) {
  // Get session from BetterAuth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect unauthenticated users to sign-in
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Optional: Role-based access control
  const requiresAdmin = request.nextUrl.pathname.startsWith("/admin");
  if (requiresAdmin && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs", // Required for Next.js 15.2.0+
  matcher: [
    "/dashboard/:path*",
    "/polls/create",
    "/admin/:path*",
    // Add other protected routes here
  ],
};
```

### Step 4: Create Sign-Out Server Action

Create `apps/web/actions/auth-actions.ts`:

```typescript
"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function signOutAction() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    // Log sign-out event (FR-016)
    await prisma.authEvent.create({
      data: {
        userId: session.user.id,
        eventType: 'LOGOUT',
        success: true,
        timestamp: new Date(),
      },
    });

    // Sign out via BetterAuth (deletes session)
    await auth.api.signOut({
      headers: await headers(),
    });
  }

  redirect("/");
}
```

### Step 5: Create Sign-Out Button Component

Create `packages/ui/src/components/auth/sign-out-button.tsx`:

```typescript
"use client";

import { signOutAction } from "@/actions/auth-actions";
import { Button } from "@workspace/ui/components/button";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost">
        Sign Out
      </Button>
    </form>
  );
}
```

### Step 6: Create Auth Error Page

Create `apps/web/app/auth/error/page.tsx`:

```typescript
import { Suspense } from "react";
import Link from "next/link";

function ErrorContent({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams.error || "unknown";

  const errorMessages: Record<string, string> = {
    oauth_callback_error: "Failed to complete Google sign-in. Please try again.",
    unauthorized: "Sign-in was cancelled or unauthorized.",
    rate_limit: "Too many sign-in attempts. Please wait and try again.",
    network_error: "Network error. Please check your connection.",
    service_unavailable: "Google sign-in is temporarily unavailable.",
    unknown: "An unexpected error occurred during sign-in.",
  };

  const message = errorMessages[error] || errorMessages.unknown;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Sign-in Error</h1>
          <p className="text-muted-foreground">{message}</p>
        </div>

        <Link
          href="/sign-in"
          className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent searchParams={searchParams} />
    </Suspense>
  );
}
```

---

## Testing the Authentication Flow

### Step 1: Start Development Server

```bash
# From monorepo root
pnpm dev

# Or from apps/web
cd apps/web
pnpm dev
```

**Expected output**:
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
- Turbopack enabled

✓ Ready in 2.5s
```

### Step 2: Test Google Sign-In Flow

1. **Navigate to sign-in page**:
   ```
   http://localhost:3000/sign-in
   ```

2. **Click "Sign in with Google"**:
   - Should redirect to Google OAuth consent screen
   - URL starts with `https://accounts.google.com/o/oauth2/v2/auth`

3. **Select Google Account**:
   - Choose your test Google account
   - Click "Continue"

4. **Grant Permissions** (first time only):
   - VoteHub requests:
     - See your primary Google Account email address
     - See your personal info
     - View your Google profile picture
   - Click "Allow"

5. **Redirect to Dashboard**:
   - Should redirect to `http://localhost:3000/dashboard`
   - User authenticated, session created

6. **Verify Session**:
   - Open browser DevTools → Application → Cookies
   - Verify `session_token` cookie exists
   - Properties:
     - `HttpOnly`: ✅ (prevents JavaScript access)
     - `Secure`: ❌ (dev only - ✅ in production)
     - `SameSite`: Lax

7. **Verify Database**:
   ```bash
   npx prisma studio
   ```
   - Navigate to `User` table
   - Verify new user created with:
     - `email`: Your Google email
     - `name`: Your Google name
     - `image`: Your Google profile picture URL
   - Navigate to `Session` table
   - Verify session created with:
     - `expiresAt`: 24 hours from now
     - `ipAddress`: Your IP
     - `userAgent`: Your browser
   - Navigate to `Account` table
   - Verify OAuth account linked with:
     - `providerId`: "google"
     - `accountId`: Your Google user ID

### Step 3: Test Session Expiration

**Manual Test**:

1. Sign in successfully
2. Open Prisma Studio: `npx prisma studio`
3. Navigate to `Session` table
4. Edit your session's `expiresAt` field to a past date
5. Try to navigate to `/dashboard` in your browser
6. Should redirect to `/sign-in` (session expired)

**Automated Test** (optional):

```typescript
// tests/e2e/auth/session-expiration.spec.ts
import { test, expect } from '@playwright/test';

test('expired session redirects to sign-in', async ({ page }) => {
  // TODO: Implement when E2E suite is set up
});
```

### Step 4: Test Sign-Out

1. While signed in, click "Sign Out" button
2. Should redirect to homepage (`/`)
3. Cookie `session_token` should be cleared
4. Trying to navigate to `/dashboard` should redirect to `/sign-in`

### Step 5: Test Rate Limiting

**Manual Test**:

1. Click "Sign in with Google" 10 times rapidly
2. On the 11th attempt, should see error:
   ```
   Too many sign-in attempts. Please wait and try again.
   ```
3. Wait 60 seconds
4. Try again - should work

**Automated Test**:

```bash
# Using curl to test rate limit
for i in {1..15}; do
  curl -I http://localhost:3000/api/auth/sign-in/social
  echo "Request $i"
done

# Requests 11-15 should return:
# HTTP/1.1 429 Too Many Requests
# X-Retry-After: 60
```

---

## Production Deployment

### Step 1: Environment Variables

Set these environment variables in your deployment platform (Vercel, Railway, etc.):

```env
# Database
DATABASE_URL="postgresql://..." # Production database
DIRECT_URL="postgresql://..."   # Production direct URL (if using Supabase)

# BetterAuth
AUTH_SECRET="YOUR_PRODUCTION_SECRET"  # Generated with: openssl rand -base64 32
AUTH_URL="https://votehub.com"        # Your production domain

# Next.js
NEXT_PUBLIC_APP_URL="https://votehub.com"

# Google OAuth (production credentials)
GOOGLE_CLIENT_ID="YOUR_PROD_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-YOUR_PROD_CLIENT_SECRET"
```

**Vercel Deployment**:
1. Go to Project Settings → Environment Variables
2. Add each variable above
3. Set Environment: **Production**
4. Click **Save**

### Step 2: Run Database Migration

```bash
# Generate SQL migration for production
npx prisma migrate deploy

# Or if using Prisma Cloud:
# Migration runs automatically on deployment
```

### Step 3: Update Google OAuth Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Add production redirect URI:
   ```
   https://votehub.com/api/auth/callback/google
   ```
4. Click **Save**

### Step 4: Update OAuth Consent Screen

1. Go to **OAuth consent screen**
2. Update **Authorized Domains**:
   - Add: `votehub.com`
3. Update **Application home page**:
   - Change to: `https://votehub.com`
4. Click **Save**

### Step 5: Publish OAuth App (Optional)

**For Public Use**:

1. Go to **OAuth consent screen**
2. Click **Publish App**
3. Click **Confirm**

_Note: If you keep the app in "Testing" mode, only added test users can sign in. Publishing makes it available to all Google users._

### Step 6: Deploy

```bash
# Push changes to main branch
git push origin main

# Vercel auto-deploys on push
# Or manually deploy:
vercel --prod
```

### Step 7: Verify Production

1. Navigate to `https://votehub.com/sign-in`
2. Click "Sign in with Google"
3. Verify OAuth flow works in production
4. Check production database for new user/session records

---

## Troubleshooting

### Issue 1: "Redirect URI Mismatch"

**Error**: `redirect_uri_mismatch` in Google OAuth screen

**Cause**: Redirect URI in Google Console doesn't match the one sent in request

**Solution**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Verify **Authorized redirect URIs** includes:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://votehub.com/api/auth/callback/google`
4. Ensure exact match (no trailing slashes, correct protocol)
5. Click **Save**
6. Wait 5 minutes for changes to propagate

---

### Issue 2: "Access Blocked: App Not Verified"

**Error**: Google shows "This app hasn't been verified by Google"

**Cause**: OAuth app in "Testing" mode and user not added as test user

**Solution Option A** (Development):
1. Go to **OAuth consent screen** → **Test users**
2. Click **Add Users**
3. Add your Google email
4. Try signing in again

**Solution Option B** (Production):
1. Go to **OAuth consent screen**
2. Click **Publish App**
3. Click **Confirm**
4. App now available to all Google users

---

### Issue 3: Session Cookie Not Set

**Error**: User redirected to `/dashboard` but immediately redirected back to `/sign-in`

**Cause**: Session cookie not being set properly

**Debugging Steps**:

1. **Check Browser DevTools**:
   - Open DevTools → Application → Cookies
   - Look for `session_token` cookie
   - If missing, cookie is not being set

2. **Check HTTPS in Production**:
   - Cookies with `Secure` flag only work over HTTPS
   - Verify `AUTH_URL` starts with `https://` in production

3. **Check SameSite Setting**:
   - If using custom domain, ensure domain matches
   - SameSite=Lax requires same site for cookie

4. **Check BetterAuth Logs**:
   ```typescript
   // Temporarily add logging to auth.ts
   onAPIError: {
     onError: (error, ctx) => {
       console.error("Auth Error:", error, ctx);
     },
   }
   ```

---

### Issue 4: Rate Limiting Not Working

**Error**: User can make unlimited sign-in attempts

**Cause**: IP address not being detected correctly

**Solution**:

1. **Check Hosting Provider**:
   - Vercel: Use `["x-forwarded-for"]`
   - Cloudflare: Use `["cf-connecting-ip"]`
   - Nginx: Use `["x-real-ip"]`

2. **Update `auth.ts`**:
   ```typescript
   advanced: {
     ipAddress: {
       ipAddressHeaders: ["cf-connecting-ip"], // Change based on provider
     },
   }
   ```

3. **Test Rate Limit**:
   ```bash
   # Make 11 requests rapidly
   for i in {1..11}; do curl -I http://localhost:3000/api/auth/sign-in/social; done
   # Request 11 should return 429
   ```

---

### Issue 5: Environment Variables Not Loading

**Error**: `process.env.GOOGLE_CLIENT_ID is undefined`

**Cause**: Environment variables not loaded in Next.js

**Solution**:

1. **Check File Location**:
   - Ensure `.env` is in `apps/web/` directory
   - Run `ls apps/web/.env` to verify

2. **Restart Dev Server**:
   ```bash
   # Stop server (Ctrl+C)
   # Start again
   pnpm dev
   ```

3. **Check Variable Names**:
   - Ensure exact match (case-sensitive)
   - No extra spaces around `=`

4. **Verify Loading**:
   ```typescript
   // Add to apps/web/lib/auth.ts temporarily
   console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
   // Should print your client ID, not undefined
   ```

---

### Issue 6: "User Already Exists" Error

**Error**: Creating account fails with duplicate email

**Cause**: User with same email already exists (legacy email+password account)

**Expected Behavior**: During migration period, account should be **linked** not created

**Solution**:

1. **Check Migration Service** (Phase 3):
   - Ensure `migration-service.ts` checks for existing users by email
   - Should link OAuth account to existing user, not create new

2. **Temporary Workaround**:
   - Delete existing user from database
   - Or use different Google email for testing

---

### Issue 7: Session Expires Immediately

**Error**: User signs in, redirected to dashboard, but immediately logged out

**Cause**: Session `expiresAt` set incorrectly or clock skew

**Solution**:

1. **Check Database**:
   ```bash
   npx prisma studio
   ```
   - Navigate to `Session` table
   - Check `expiresAt` value
   - Should be 24 hours in the future from `createdAt`

2. **Check System Clock**:
   ```bash
   date
   # Ensure system clock is accurate
   ```

3. **Check Session Creation**:
   ```typescript
   // In auth-service.ts, add logging:
   console.log("Session created:", {
     expiresAt: session.expiresAt,
     now: new Date(),
     diff: session.expiresAt.getTime() - Date.now(),
   });
   // Diff should be ~86400000 (24 hours in ms)
   ```

---

## Summary Checklist

Use this checklist to verify your Google OAuth setup:

- [ ] Google Cloud Console project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 credentials created
- [ ] Development redirect URI added: `http://localhost:3000/api/auth/callback/google`
- [ ] Production redirect URI added: `https://votehub.com/api/auth/callback/google`
- [ ] `GOOGLE_CLIENT_ID` added to `.env`
- [ ] `GOOGLE_CLIENT_SECRET` added to `.env`
- [ ] `AUTH_SECRET` generated and added to `.env`
- [ ] `AUTH_URL` set correctly in `.env`
- [ ] BetterAuth config updated with Google provider
- [ ] Database migration applied (`npx prisma migrate dev`)
- [ ] Sign-in page created (`app/sign-in/page.tsx`)
- [ ] Google sign-in button component created
- [ ] Auth middleware created (`middleware.ts`)
- [ ] Sign-out action created
- [ ] Auth error page created
- [ ] Development server started (`pnpm dev`)
- [ ] Google sign-in flow tested successfully
- [ ] Session verified in database (Prisma Studio)
- [ ] Session expiration tested
- [ ] Sign-out tested
- [ ] Rate limiting tested
- [ ] Production environment variables configured
- [ ] Production redirect URI added to Google Console
- [ ] Production deployment successful
- [ ] Production OAuth flow tested

---

## Next Steps

After completing this guide:

1. **Implement User Migration** (Phase 5 in plan.md):
   - Create migration service for email-based account linking
   - Handle existing email+password users

2. **Remove Password Authentication** (Phase 9 in plan.md):
   - Remove password fields from database schema
   - Delete password-related code

3. **Add Auth Event Logging** (FR-016):
   - Implement `AuthEvent` table and logging service
   - Log all authentication events (login, logout, failed attempts)

4. **Create End-to-End Tests**:
   - OAuth flow test
   - Session management test
   - Rate limiting test
   - Migration test

5. **Monitor Production**:
   - Set up error tracking (Sentry, etc.)
   - Monitor authentication metrics
   - Track session creation/expiration rates

---

**Congratulations!** 🎉

You've successfully configured Google OAuth authentication for VoteHub. Users can now sign in with their Google accounts, eliminating the need for passwords and reducing registration friction.

For implementation details, refer to:
- **Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **OAuth Flow**: [contracts/oauth-flow.md](./contracts/oauth-flow.md)
- **Session Management**: [contracts/session-management.md](./contracts/session-management.md)
- **Implementation Plan**: [plan.md](./plan.md)
