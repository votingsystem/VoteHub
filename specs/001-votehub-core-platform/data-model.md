# Data Model: VoteHub Core Platform

**Date**: 2025-10-09
**Feature**: VoteHub Core Platform
**Branch**: `001-votehub-core-platform`

## Overview

This document defines the complete database schema for VoteHub using Prisma ORM. The model supports:

- User authentication with role-based access (Admin/Voter)
- Time-bound polls with 2-5 custom voting options
- One vote per user per poll (enforced via unique constraint)
- Nested comment threading (Reddit-style)
- Tag-based poll categorization
- Poll scheduling and automatic status transitions

---

## Entity Relationship Diagram

```
User (1) ──────< (M) Poll
User (1) ──────< (M) Vote
User (1) ──────< (M) Comment
User (1) ──────< (M) Tag (creator)

Poll (1) ──────< (M) VotingOption
Poll (1) ──────< (M) Vote
Poll (1) ──────< (M) Comment
Poll (M) ──────> (1) Tag

VotingOption (1) ──────< (M) Vote

Comment (1) ──────< (M) Comment (self-referential for replies)
```

---

## Prisma Schema

```prisma
// apps/web/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DATABASE_URL") // For migrations
}

// ============================================================================
// User & Authentication
// ============================================================================

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // Hashed via BetterAuth
  username  String   @unique
  role      UserRole @default(VOTER)

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  polls        Poll[]
  votes        Vote[]
  comments     Comment[]
  createdTags  Tag[]      @relation("TagCreator")

  // BetterAuth session tracking (managed by library)
  sessions     Session[]

  @@index([email])
  @@index([username])
}

enum UserRole {
  ADMIN  // Can create polls, manage tags, access analytics
  VOTER  // Can vote and comment
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}

// ============================================================================
// Tag System
// ============================================================================

model Tag {
  id   String @id @default(cuid())
  name String @unique // Display name: "Politics", "Technology"
  slug String @unique // URL-friendly: "politics", "technology"

  // Creator tracking
  createdBy String
  creator   User     @relation("TagCreator", fields: [createdBy], references: [id])
  createdAt DateTime @default(now())

  // Relations
  polls Poll[]

  @@index([slug]) // For filtering by tag
}

// ============================================================================
// Poll System
// ============================================================================

model Poll {
  id          String     @id @default(cuid())
  title       String     // 5-200 chars (validated in app layer)
  description String     @db.Text // Up to 5000 chars
  link        String?    // Optional external link

  // Scheduling
  startAt       DateTime
  durationHours Int      // 1-8760 hours (1 hour to 365 days)
  endAt         DateTime // Computed: startAt + durationHours
  status        PollStatus @default(SCHEDULED)

  // Author
  authorId String
  author   User   @relation(fields: [authorId], references: [id])

  // Categorization
  tagId String
  tag   Tag    @relation(fields: [tagId], references: [id])

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  options  VotingOption[]
  votes    Vote[]
  comments Comment[]

  // Indexes for performance
  @@index([status, createdAt]) // Feed queries (active polls, newest first)
  @@index([tagId, status])     // Tag filtering
  @@index([authorId])          // User's created polls
  @@index([startAt])           // Scheduled poll queries
  @@index([endAt])             // Poll expiration checks
}

enum PollStatus {
  SCHEDULED // Before startAt
  ACTIVE    // Between startAt and endAt
  CLOSED    // After endAt or manually unpublished
}

model VotingOption {
  id    String @id @default(cuid())
  label String // 1-100 chars, e.g., "Strongly Agree", "Neutral"
  order Int    // Display order (0-4 for 2-5 options)

  pollId String
  poll   Poll   @relation(fields: [pollId], references: [id], onDelete: Cascade)

  // Relations
  votes Vote[]

  @@index([pollId])
  @@unique([pollId, order]) // Ensure unique ordering within poll
}

// ============================================================================
// Voting System
// ============================================================================

model Vote {
  id String @id @default(cuid())

  // Voter
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Poll
  pollId String
  poll   Poll   @relation(fields: [pollId], references: [id], onDelete: Cascade)

  // Selected option
  optionId String
  option   VotingOption @relation(fields: [optionId], references: [id], onDelete: Cascade)

  // Timestamp
  createdAt DateTime @default(now())

  // CRITICAL: One vote per user per poll (vote integrity)
  @@unique([userId, pollId])

  // Indexes for aggregation queries
  @@index([pollId, createdAt])    // Vote trends over time
  @@index([pollId, optionId])     // Vote distribution per option
  @@index([userId])               // User's voting history
}

// ============================================================================
// Comment System
// ============================================================================

model Comment {
  id   String @id @default(cuid())
  text String @db.Text // Comment content

  // Author
  authorId String
  author   User   @relation(fields: [authorId], references: [id], onDelete: Cascade)

  // Poll
  pollId String
  poll   Poll   @relation(fields: [pollId], references: [id], onDelete: Cascade)

  // Threading (self-referential for nested replies)
  parentId String?
  parent   Comment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies  Comment[] @relation("CommentReplies")

  // Timestamp
  createdAt DateTime @default(now())

  // Indexes for threading and sorting
  @@index([pollId, createdAt]) // Poll's comments sorted by newest
  @@index([pollId, parentId])  // Top-level vs. nested comments
  @@index([authorId])          // User's comment history
  @@index([parentId])          // Fetching nested replies
}
```

---

## Entity Details

### User

**Purpose**: Represents registered users (voters and administrators).

**Key Attributes**:

- `id`: Unique identifier (CUID)
- `email`: Unique, used for login
- `username`: Unique, displayed publicly
- `role`: ADMIN or VOTER (default: VOTER)
- `password`: Hashed by BetterAuth

**Relationships**:

- One user can create many polls (author)
- One user can cast many votes (one per poll constraint enforced separately)
- One user can write many comments
- Admins can create many tags

**Business Rules**:

- Admin accounts created during system setup (per clarification)
- Regular users register as VOTER role (no UI for role promotion)
- Email and username must be unique

---

### Tag

**Purpose**: Poll categorization for filtering and organization.

**Key Attributes**:

- `id`: Unique identifier
- `name`: Display name ("Politics", "Technology")
- `slug`: URL-friendly version ("politics", "technology")
- `createdBy`: Admin who created the tag
- `createdAt`: Timestamp

**Relationships**:

- One tag can be applied to many polls
- One admin (User) can create many tags

**Business Rules**:

- Only admins can create tags (per clarification)
- Predefined tags seeded during setup
- Slug auto-generated from name (lowercase, hyphenated)
- Name and slug must be unique (prevents duplicates)

---

### Poll

**Purpose**: Represents a voting poll with time boundaries and custom options.

**Key Attributes**:

- `id`: Unique identifier
- `title`: Poll title (5-200 chars)
- `description`: Detailed description (up to 5000 chars)
- `link`: Optional external URL
- `startAt`: When voting opens
- `durationHours`: Poll duration in hours (1-8760)
- `endAt`: Computed: `startAt + durationHours`
- `status`: SCHEDULED → ACTIVE → CLOSED
- `authorId`: Admin who created the poll
- `tagId`: Single tag for categorization

**Relationships**:

- One poll has 2-5 voting options (enforced in app layer)
- One poll can receive many votes
- One poll can have many comments
- Many polls belong to one tag
- One poll has one author (admin user)

**Business Rules**:

- Only admins can create polls (FR-003)
- Start date must be now or in the future (FR-009)
- Duration: 1-8760 hours (FR-007d, per clarification)
- Status transitions:
  - `SCHEDULED` when `NOW() < startAt`
  - `ACTIVE` when `startAt <= NOW() < endAt`
  - `CLOSED` when `NOW() >= endAt` or manually unpublished
- Polls with votes cannot be deleted (FR-013a), only unpublished/closed
- Polls are immutable once voting starts (FR-013)

---

### VotingOption

**Purpose**: Represents one voting choice within a poll.

**Key Attributes**:

- `id`: Unique identifier
- `label`: Option text (1-100 chars, e.g., "Strongly Agree")
- `order`: Display order (0-4)
- `pollId`: Parent poll reference

**Relationships**:

- Many voting options belong to one poll
- One option can receive many votes

**Business Rules**:

- Minimum 2 options per poll (FR-008)
- Maximum 5 options per poll (FR-008, per spec clarification over constitution's max 4)
- Order must be unique within poll (enforced by unique constraint)
- Cascading delete: if poll deleted, options deleted

---

### Vote

**Purpose**: Records a user's vote on a poll.

**Key Attributes**:

- `id`: Unique identifier
- `userId`: Voter reference
- `pollId`: Poll reference
- `optionId`: Selected voting option
- `createdAt`: Timestamp (used for trending calculations)

**Relationships**:

- Many votes belong to one user
- Many votes belong to one poll
- Many votes belong to one voting option

**Business Rules**:

- **ONE VOTE PER USER PER POLL** (enforced by `@@unique([userId, pollId])`) - FR-015
- Votes cannot be changed after submission (FR-016, per spec clarification)
- Votes are anonymous in public results but tracked by userId (A-003)
- Cascading delete: if user/poll/option deleted, votes deleted

**Integrity Enforcement**:

```typescript
// Service layer check before insert
const existing = await prisma.vote.findUnique({
  where: { userId_pollId: { userId, pollId } },
});
if (existing) throw new Error("You have already voted on this poll");
```

---

### Comment

**Purpose**: User-generated comments on polls with nested threading.

**Key Attributes**:

- `id`: Unique identifier
- `text`: Comment content
- `authorId`: Comment author
- `pollId`: Poll reference
- `parentId`: Null for top-level, comment ID for replies
- `createdAt`: Timestamp

**Relationships**:

- Many comments belong to one user (author)
- Many comments belong to one poll
- Self-referential: one comment can have many replies (nested threading)

**Business Rules**:

- Top-level comments: `parentId = null`
- Nested replies: `parentId = parent comment ID`
- Maximum 5 levels of nesting supported (SC-008)
- Only author or admin can delete comment (FR-032)
- No voting on comments (FR-033)
- Cascading delete: if parent deleted, replies deleted

**Threading Queries**:

```typescript
// Fetch top-level comments
const topLevel = await prisma.comment.findMany({
  where: { pollId, parentId: null },
  orderBy: { createdAt: "desc" },
  include: {
    author: true,
    replies: {
      include: {
        author: true,
        replies: true, // Recursive nesting (limit depth in app layer)
      },
    },
  },
});
```

---

### Session

**Purpose**: BetterAuth session management (library-managed).

**Key Attributes**:

- `id`: Session identifier
- `userId`: User reference
- `expiresAt`: Session expiration
- `createdAt`: Session start time

**Business Rules**:

- Sessions expire after 7 days (configurable in BetterAuth)
- Refresh daily if user active
- Cascading delete: if user deleted, sessions deleted

---

## Indexes & Performance

### Feed Query Optimization

```sql
-- Most common query: active polls, newest first
SELECT * FROM "Poll"
WHERE status = 'ACTIVE'
ORDER BY "createdAt" DESC
LIMIT 20;

-- Index: @@index([status, createdAt])
```

### Tag Filtering

```sql
-- Polls by tag
SELECT * FROM "Poll"
WHERE "tagId" = ? AND status = 'ACTIVE'
ORDER BY "createdAt" DESC;

-- Index: @@index([tagId, status])
```

### Vote Aggregation

```sql
-- Vote count per option
SELECT "optionId", COUNT(*) as count
FROM "Vote"
WHERE "pollId" = ?
GROUP BY "optionId";

-- Index: @@index([pollId, optionId])
```

### Trending Algorithm

```sql
-- Time-weighted votes (votes in last N hours)
SELECT "pollId", COUNT(*) as recent_votes
FROM "Vote"
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY "pollId";

-- Index: @@index([pollId, createdAt])
```

---

## Constraints & Validation

### Database-Level Constraints

| Constraint                 | Enforced By                                 | Purpose                     |
| -------------------------- | ------------------------------------------- | --------------------------- |
| Unique email               | `@unique` on User.email                     | Prevent duplicate accounts  |
| Unique username            | `@unique` on User.username                  | Prevent duplicate usernames |
| Unique tag name/slug       | `@unique` on Tag.name, Tag.slug             | Prevent duplicate tags      |
| One vote per user per poll | `@@unique([userId, pollId])` on Vote        | Vote integrity (FR-015)     |
| Unique option order        | `@@unique([pollId, order])` on VotingOption | Consistent option display   |

### Application-Level Validation (Zod)

```typescript
// Poll creation validation
const pollCreationSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  link: z.string().url().optional().or(z.literal("")),
  tagId: z.string().cuid(),
  startAt: z.date().refine((d) => d >= new Date()),
  durationHours: z.number().int().min(1).max(8760),
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
      }),
    )
    .min(2)
    .max(5),
});

// Vote submission validation
const voteSchema = z.object({
  pollId: z.string().cuid(),
  optionId: z.string().cuid(),
});
```

---

## State Transitions

### Poll Status Lifecycle

```
SCHEDULED ──[startAt reached]──> ACTIVE ──[endAt reached]──> CLOSED
    │                                │
    └────[manually unpublish]───────┴────────────────────────> CLOSED
```

**Transition Logic** (in `poll-service.ts`):

```typescript
function computePollStatus(poll: Poll): PollStatus {
  const now = new Date();
  if (now < poll.startAt) return "SCHEDULED";
  if (now >= poll.startAt && now < poll.endAt) return "ACTIVE";
  return "CLOSED";
}

// Status updated on-demand (no background jobs in MVP)
async function getPollWithStatus(pollId: string) {
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  const status = computePollStatus(poll);
  if (status !== poll.status) {
    await prisma.poll.update({
      where: { id: pollId },
      data: { status },
    });
  }
  return { ...poll, status };
}
```

---

## Seed Data

```typescript
// apps/web/prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@votehub.com" },
    update: {},
    create: {
      email: "admin@votehub.com",
      username: "admin",
      password: await hash("admin123", 10), // Change in production!
      role: "ADMIN",
    },
  });

  // Create default tags
  const tags = [
    { name: "Politics", slug: "politics" },
    { name: "Technology", slug: "technology" },
    { name: "Science", slug: "science" },
    { name: "Entertainment", slug: "entertainment" },
    { name: "Sports", slug: "sports" },
    { name: "World News", slug: "world-news" },
    { name: "Opinion", slug: "opinion" },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: {
        ...tag,
        createdBy: adminUser.id,
      },
    });
  }

  // Create sample poll
  const techTag = await prisma.tag.findUnique({
    where: { slug: "technology" },
  });

  const poll = await prisma.poll.create({
    data: {
      title: "Should AI development be regulated?",
      description:
        "As AI technology advances rapidly, there is debate about government oversight.",
      startAt: new Date(),
      durationHours: 168, // 1 week
      endAt: new Date(Date.now() + 168 * 60 * 60 * 1000),
      status: "ACTIVE",
      authorId: adminUser.id,
      tagId: techTag.id,
      options: {
        create: [
          { label: "Strongly regulate", order: 0 },
          { label: "Light regulation", order: 1 },
          { label: "Self-regulation only", order: 2 },
          { label: "No regulation", order: 3 },
        ],
      },
    },
  });

  console.log({ adminUser, tags, poll });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Migration Strategy

### Initial Migration

```bash
# Generate Prisma client and create migration
npx prisma migrate dev --name init

# Apply to production
npx prisma migrate deploy
```

### Future Schema Changes

- **Adding optional fields**: Safe, no data migration needed
- **Adding required fields**: Requires default value or backfill
- **Removing fields**: Use `@deprecated` first, remove in next major version
- **Renaming fields**: Create new field, migrate data, remove old field

---

## Summary

This data model supports all VoteHub functional requirements:

- ✅ User roles (Admin/Voter) with authentication
- ✅ Time-bound polls with scheduling (SCHEDULED → ACTIVE → CLOSED)
- ✅ 2-5 custom voting options per poll
- ✅ One vote per user per poll (database constraint)
- ✅ Nested comment threading (self-referential)
- ✅ Tag-based categorization
- ✅ Performance indexes for feed, filtering, aggregation

**Next Phase**: Generate API contracts (REST endpoints) based on this model.
