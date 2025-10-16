# Data Model: Google OAuth Authentication

**Feature**: Google OAuth Exclusive Authentication
**Database**: PostgreSQL via Prisma ORM
**Date**: 2025-10-15

## Overview

This document defines the database schema changes required to support Google OAuth authentication while preserving existing user data (polls, votes, comments). The model supports account migration, session management with 24-hour expiration, OAuth token storage, and authentication event logging.

---

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    User     │1      ∞ │ OAuthAccount │         │  AuthEvent  │
│             │─────────│              │         │             │
│  - id       │         │  - userId    │         │  - userId?  │
│  - email    │         │  - provider  │         │  - eventType│
│  - googleId │         │  - googleId  │         │  - success  │
│  - name     │         │  - token     │         │  - timestamp│
└─────────────┘         └──────────────┘         └─────────────┘
       │1                                                │
       │                                                 │
       │                                                 │
       │∞                                               │∞
┌─────────────┐                                  ┌─────────────┐
│   Session   │                                  │   (Logging) │
│             │                                  │             │
│  - id       │                                  │  - ipAddress│
│  - userId   │                                  │  - userAgent│
│  - token    │                                  └─────────────┘
│  - expiresAt│
│  - ipAddress│
└─────────────┘
       │1
       │
       │∞
┌─────────────┐
│  Existing   │
│  Relations  │
│  (Poll,     │
│   Vote,     │
│   Comment)  │
└─────────────┘
```

---

## Entities

### User (Updated)

Represents a VoteHub user. Modified to support Google OAuth while maintaining backward compatibility during migration period.

**Fields**:

| Field                    | Type      | Constraints              | Description                                            |
| ------------------------ | --------- | ------------------------ | ------------------------------------------------------ |
| `id`                     | String    | Primary Key              | User unique identifier                                 |
| `email`                  | String    | Unique, Required         | User email (from Google or email/password signup)      |
| `name`                   | String    | Required                 | Display name (from Google profile or user input)       |
| `username`               | String    | Unique, Required         | Unique username (generated from email if Google)       |
| `role`                   | Enum      | Required, Default=VOTER  | User role: ADMIN or VOTER                              |
| `googleId`               | String?   | Unique, Nullable         | Google account ID (null during migration period)       |
| `googleEmail`            | String?   | Nullable                 | Email from Google profile (may differ from primary)    |
| `googleProfilePicture`   | String?   | Nullable                 | URL to Google profile picture                          |
| `lastGoogleSync`         | DateTime? | Nullable                 | Last time profile was synced from Google               |
| `password`               | String?   | Nullable                 | Hashed password (deprecated, removed in Phase 9)       |
| `passwordResetToken`     | String?   | Nullable                 | Password reset token (deprecated, removed in Phase 9)  |
| `createdAt`              | DateTime  | Required, Default=now()  | Account creation timestamp                             |
| `updatedAt`              | DateTime  | Required, Auto-update    | Last update timestamp                                  |

**Relationships**:
- `sessions` → One-to-Many with `Session`
- `oauthAccounts` → One-to-Many with `OAuthAccount`
- `authEvents` → One-to-Many with `AuthEvent`
- `polls` → One-to-Many with `Poll` (existing)
- `votes` → One-to-Many with `Vote` (existing)
- `comments` → One-to-Many with `Comment` (existing)

**Indexes**:
- `email` (unique)
- `googleId` (unique, sparse - only when not null)
- `username` (unique)

**Validation Rules**:
- `email` must be valid email format
- `googleId` must be unique across all users (enforced at DB level)
- `role` must be 'ADMIN' or 'VOTER'
- During migration: either `password` OR `googleId` must be present
- Post-migration: `googleId` required, `password` must be null

**State Transitions**:
1. **Legacy User** → **Migrated User**:
   - User signs in with Google (email matches existing account)
   - `googleId`, `googleEmail`, `googleProfilePicture` fields populated
   - `password` retained temporarily (removed in cleanup phase)

2. **New User** → **Active User**:
   - User signs up with Google
   - All fields populated from Google profile
   - `password` always null

3. **Unmigrated User** → **Deleted**:
   - After 30-day grace period (FR-017)
   - User has `password` but no `googleId`
   - Account and all related data deleted (cascade)

**Prisma Schema**:

```prisma
model User {
  id                     String        @id @default(cuid())
  email                  String        @unique
  name                   String
  username               String        @unique
  role                   Role          @default(VOTER)

  // Google OAuth fields (new)
  googleId               String?       @unique
  googleEmail            String?
  googleProfilePicture   String?
  lastGoogleSync         DateTime?

  // Legacy authentication (deprecated, removed in Phase 9)
  password               String?
  passwordResetToken     String?

  // Timestamps
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  // Relationships
  sessions               Session[]
  oauthAccounts          OAuthAccount[]
  authEvents             AuthEvent[]
  polls                  Poll[]
  votes                  Vote[]
  comments               Comment[]

  @@index([email])
  @@index([googleId])
  @@index([username])
}

enum Role {
  ADMIN
  VOTER
}
```

---

### Session (BetterAuth-managed)

Represents an active user session. Managed by BetterAuth with 24-hour expiration.

**Fields**:

| Field          | Type      | Constraints             | Description                                     |
| -------------- | --------- | ----------------------- | ----------------------------------------------- |
| `id`           | String    | Primary Key             | Session unique identifier                       |
| `userId`       | String    | Foreign Key → User      | Associated user                                 |
| `token`        | String    | Unique, Required        | Session token (secure random, signed)           |
| `expiresAt`    | DateTime  | Required                | Session expiration (24 hours from creation)     |
| `createdAt`    | DateTime  | Required, Default=now() | Session creation timestamp                      |
| `ipAddress`    | String?   | Nullable                | Client IP address (for rate limiting & logging) |
| `userAgent`    | String?   | Nullable                | Client user agent (for security auditing)       |

**Relationships**:
- `user` → Many-to-One with `User`

**Indexes**:
- `token` (unique)
- `userId` (for lookup)
- `expiresAt` (for cleanup queries)

**Lifecycle**:
1. **Creation**: New session created on successful Google OAuth callback
2. **Refresh**: If `createdAt + 12 hours < now`, extend `expiresAt` by 24 hours
3. **Expiration**: If `expiresAt < now`, session invalid, redirect to sign-in
4. **Revocation**: User signs out, session deleted immediately

**Prisma Schema**:

```prisma
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
```

---

### OAuthAccount (New)

Links a user to their Google OAuth account. Stores OAuth provider details and access token.

**Fields**:

| Field               | Type      | Constraints                              | Description                                  |
| ------------------- | --------- | ---------------------------------------- | -------------------------------------------- |
| `id`                | String    | Primary Key                              | OAuth account unique identifier              |
| `userId`            | String    | Foreign Key → User                       | Associated user                              |
| `provider`          | Enum      | Required (always 'google')               | OAuth provider name                          |
| `providerAccountId` | String    | Required                                 | Google's unique user ID                      |
| `accessToken`       | String    | Required                                 | Google OAuth access token (encrypted at rest)|
| `tokenExpiresAt`    | DateTime? | Nullable                                 | Access token expiration timestamp            |
| `createdAt`         | DateTime  | Required, Default=now()                  | Account link creation timestamp              |
| `updatedAt`         | DateTime  | Required, Auto-update                    | Last update timestamp                        |

**Relationships**:
- `user` → Many-to-One with `User`

**Indexes**:
- `provider + providerAccountId` (composite unique)
- `userId` (for user lookup)

**Validation Rules**:
- `provider` must be 'google' (only supported provider per spec)
- `providerAccountId` must be unique for given provider
- `accessToken` stored encrypted (BetterAuth handles automatically)

**Prisma Schema**:

```prisma
model OAuthAccount {
  id                 String    @id @default(cuid())
  userId             String
  provider           Provider  @default(GOOGLE)
  providerAccountId  String
  accessToken        String    // Encrypted by BetterAuth
  tokenExpiresAt     DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

enum Provider {
  GOOGLE
}
```

---

### AuthEvent (New)

Logs authentication events for security monitoring and operational debugging (FR-016).

**Fields**:

| Field          | Type      | Constraints             | Description                                                |
| -------------- | --------- | ----------------------- | ---------------------------------------------------------- |
| `id`           | String    | Primary Key             | Event unique identifier                                    |
| `userId`       | String?   | Foreign Key → User      | Associated user (null for failed attempts without user ID) |
| `eventType`    | Enum      | Required                | Event type (login, logout, failed_attempt, etc.)           |
| `ipAddress`    | String?   | Nullable                | Client IP address                                          |
| `userAgent`    | String?   | Nullable                | Client user agent                                          |
| `success`      | Boolean   | Required                | Whether event succeeded                                    |
| `errorMessage` | String?   | Nullable                | Error message if `success = false`                         |
| `timestamp`    | DateTime  | Required, Default=now() | Event timestamp                                            |

**Relationships**:
- `user` → Many-to-One with `User` (optional)

**Event Types**:
- `login`: Successful authentication (Google OAuth or email/password)
- `logout`: User-initiated sign-out
- `failed_attempt`: Authentication attempt failed (wrong credentials, OAuth denial)
- `account_creation`: New user account created
- `token_expiration`: Session expired

**Indexes**:
- `userId` (for user-specific queries)
- `eventType` (for event type filtering)
- `timestamp` (for time-range queries)
- `ipAddress` (for IP-based analysis)

**Retention Policy**:
- Events retained for 90 days (operational debugging)
- Older events archived or purged (not in scope for this feature)

**Prisma Schema**:

```prisma
model AuthEvent {
  id           String       @id @default(cuid())
  userId       String?
  eventType    AuthEventType
  ipAddress    String?
  userAgent    String?
  success      Boolean
  errorMessage String?
  timestamp    DateTime     @default(now())

  user         User?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([eventType])
  @@index([timestamp])
  @@index([ipAddress])
}

enum AuthEventType {
  LOGIN
  LOGOUT
  FAILED_ATTEMPT
  ACCOUNT_CREATION
  TOKEN_EXPIRATION
}
```

---

## Migration Strategy

### Phase 1: Additive Schema Changes

Add new fields and tables without breaking existing functionality:

```sql
-- Add Google OAuth fields to User (nullable for migration period)
ALTER TABLE "User" ADD COLUMN "googleId" TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN "googleEmail" TEXT;
ALTER TABLE "User" ADD COLUMN "googleProfilePicture" TEXT;
ALTER TABLE "User" ADD COLUMN "lastGoogleSync" TIMESTAMP;

-- Create OAuthAccount table
CREATE TABLE "OAuthAccount" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'GOOGLE',
  "providerAccountId" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "tokenExpiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE("provider", "providerAccountId")
);

CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- Create AuthEvent table
CREATE TABLE "AuthEvent" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "eventType" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "success" BOOLEAN NOT NULL,
  "errorMessage" TEXT,
  "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "AuthEvent_userId_idx" ON "AuthEvent"("userId");
CREATE INDEX "AuthEvent_eventType_idx" ON "AuthEvent"("eventType");
CREATE INDEX "AuthEvent_timestamp_idx" ON "AuthEvent"("timestamp");
CREATE INDEX "AuthEvent_ipAddress_idx" ON "AuthEvent"("ipAddress");

-- Update Session table (if not already BetterAuth-managed)
ALTER TABLE "Session" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "Session" ADD COLUMN "userAgent" TEXT;
```

**Prisma Migration Command**:

```bash
npx @better-auth/cli generate  # Generates BetterAuth schema
npx prisma migrate dev --name add-google-oauth
```

### Phase 2: Data Migration

Existing users retain email/password authentication. New users and migrating users use Google OAuth.

**No data migration required initially** - additive changes only.

### Phase 3: Cleanup (30 days post-deployment)

Remove unmigrated accounts and deprecated fields:

```sql
-- Delete unmigrated accounts (30 days after OAuth deployment)
DELETE FROM "User"
WHERE "password" IS NOT NULL
  AND "googleId" IS NULL
  AND "createdAt" < (CURRENT_TIMESTAMP - INTERVAL '30 days');

-- After all users migrated, remove password fields (separate migration)
ALTER TABLE "User" DROP COLUMN "password";
ALTER TABLE "User" DROP COLUMN "passwordResetToken";

-- Make googleId required (after cleanup)
ALTER TABLE "User" ALTER COLUMN "googleId" SET NOT NULL;
```

---

## Data Volume Estimates

**Current State** (from existing VoteHub):
- Users: ~1,000 (assumed)
- Polls: ~5,000
- Votes: ~20,000
- Comments: ~10,000

**Post-Migration Additions**:
- OAuthAccount: 1 per user = ~1,000 rows
- AuthEvent: ~100 events/day × 90 days retention = ~9,000 rows
- Session: ~100 active sessions concurrently

**Storage Impact**:
- OAuthAccount: ~1,000 rows × 500 bytes = ~500 KB
- AuthEvent: ~9,000 rows × 300 bytes = ~2.7 MB
- Session: ~100 rows × 400 bytes = ~40 KB

**Total additional storage**: <5 MB (negligible)

---

## Performance Considerations

**Indexes**:
- `User.email` (unique) - Fast email lookup for migration
- `User.googleId` (unique, sparse) - Fast Google account lookup
- `Session.token` (unique) - Fast session validation
- `AuthEvent.timestamp` - Efficient log queries

**Query Patterns**:

1. **Authentication** (hot path):
```sql
-- Lookup user by Google ID (O(log n) with index)
SELECT * FROM "User" WHERE "googleId" = ?;

-- Validate session (O(log n) with index)
SELECT * FROM "Session" WHERE "token" = ? AND "expiresAt" > NOW();
```

2. **Migration** (one-time):
```sql
-- Check for existing user by email (O(log n) with index)
SELECT * FROM "User" WHERE "email" = ?;

-- Link OAuth account (O(1) insert)
INSERT INTO "OAuthAccount" (...) VALUES (...);
```

3. **Cleanup** (scheduled job):
```sql
-- Find unmigrated accounts (O(n) scan, run off-peak)
SELECT * FROM "User"
WHERE "password" IS NOT NULL
  AND "googleId" IS NULL
  AND "createdAt" < (CURRENT_TIMESTAMP - INTERVAL '30 days');
```

**Connection Pooling**:
- Existing Prisma connection pool configuration sufficient
- BetterAuth uses Prisma client (shares connection pool)

---

## Data Integrity Constraints

**Foreign Keys**:
- `Session.userId` → `User.id` (CASCADE delete)
- `OAuthAccount.userId` → `User.id` (CASCADE delete)
- `AuthEvent.userId` → `User.id` (SET NULL on delete - preserve logs)

**Unique Constraints**:
- `User.email` (prevent duplicate emails)
- `User.googleId` (prevent duplicate Google accounts)
- `User.username` (prevent duplicate usernames)
- `OAuthAccount.provider + providerAccountId` (prevent duplicate OAuth links)
- `Session.token` (prevent session token collisions)

**Check Constraints** (application-level via Zod):
- Email format validation
- Role must be 'ADMIN' or 'VOTER'
- At least one authentication method (password OR googleId) during migration
- Only googleId after migration complete

---

## Testing Data Scenarios

**Test Cases**:

1. **New Google User**:
   - Create user with only `googleId`, `googleEmail`, `googleProfilePicture`
   - Verify `password` is null
   - Create linked `OAuthAccount` record
   - Verify session created with 24-hour expiration

2. **Existing User Migration (Email Match)**:
   - Existing user: `email = "user@gmail.com"`, `password = "hashed"`
   - Google sign-in with same email
   - Verify `googleId` populated, `password` retained (temporarily)
   - Verify `OAuthAccount` created
   - Verify vote/poll/comment relationships preserved

3. **Existing User Migration (No Email Match)**:
   - Existing user: `email = "user@yahoo.com"`, `password = "hashed"`
   - Google sign-in with `email = "user@gmail.com"`
   - Verify new user created (no migration)
   - Verify old user marked for 30-day cleanup

4. **Session Expiration**:
   - Create session with `expiresAt = now + 24 hours`
   - Wait or manually set `expiresAt` to past
   - Verify session validation fails
   - Verify user redirected to sign-in

5. **Auth Event Logging**:
   - Successful Google login → `AuthEvent` with `eventType = LOGIN`, `success = true`
   - Failed login (rate limit) → `AuthEvent` with `eventType = FAILED_ATTEMPT`, `success = false`
   - Sign-out → `AuthEvent` with `eventType = LOGOUT`, `success = true`

6. **30-Day Cleanup**:
   - Create user with `password`, no `googleId`, `createdAt = 31 days ago`
   - Run cleanup job
   - Verify user deleted (cascade: sessions, votes, polls, comments)

---

## Rollback Plan

**Rollback Strategy**:

1. **Phase 1 Rollback** (before migration):
   - Revert database migration
   - Drop new tables: `OAuthAccount`, `AuthEvent`
   - Remove new columns from `User`: `googleId`, `googleEmail`, `googleProfilePicture`, `lastGoogleSync`
   - Resume email/password authentication

2. **Phase 2 Rollback** (during migration):
   - Disable Google OAuth in BetterAuth config
   - Existing users continue with email/password
   - Migrated users can still use Google (don't break existing sessions)
   - No data loss (both auth methods coexist)

3. **Phase 3 Rollback** (post-cleanup):
   - **NOT POSSIBLE** - password data deleted
   - Users must re-register or contact support
   - Communicate plan clearly before cleanup phase

---

## Summary

**Schema Changes**:
- User: Add 4 Google OAuth fields (nullable during migration)
- OAuthAccount: New table (1 row per user)
- AuthEvent: New table (log entries, ~9K rows with 90-day retention)
- Session: Add `ipAddress` and `userAgent` fields

**Data Migration**:
- Additive only (no breaking changes)
- Email-based automatic linking
- 30-day grace period before cleanup

**Performance**:
- All hot paths indexed (O(log n) lookups)
- Minimal storage impact (<5 MB)
- Existing connection pool sufficient

**Next Steps**:
1. Generate Prisma migration from schema changes
2. Create seed data for testing
3. Implement migration service (email-based linking)
4. Create API contracts for OAuth flow
