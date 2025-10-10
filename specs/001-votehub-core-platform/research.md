# Research: VoteHub Core Platform Technology Decisions

**Date**: 2025-10-09
**Feature**: VoteHub Core Platform
**Branch**: `001-votehub-core-platform`

## Overview

This document consolidates research findings for technology choices, architecture patterns, and implementation strategies for VoteHub. All decisions support the constitution principles (modular architecture, Next.js 15 best practices, type safety) and spec requirements (voting integrity, Reddit-style UX, progressive enhancement).

---

## 1. BetterAuth Setup

### Decision
Use **Better-Auth** for authentication with email/password provider and session-based auth.

### Rationale
- **Modern & Type-Safe**: Built for TypeScript, auto-generates types for user/session
- **Session Management**: Native support for server-side sessions (compatible with Server Actions)
- **Role-Based Access Control**: Easy to extend User model with `role` field (admin/voter)
- **Next.js 15 Compatible**: Works seamlessly with App Router and Server Components
- **Email/Password + Future OAuth**: Supports email/password now, easy to add Google/GitHub later (post-MVP)

### Implementation Notes
```typescript
// apps/web/lib/auth.ts
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  database: prisma,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false // MVP: skip email verification
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "voter", // All registrations default to voter
        required: true
      }
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // Refresh daily
  }
})

// Admin check helper
export async function requireAdmin(session: Session) {
  if (session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }
}
```

**Admin Account Creation**:
- Admins created via Prisma seed script (`prisma/seed.ts`)
- No UI for role promotion (per clarification: admins created during system setup)
- Seed script creates initial admin accounts with known credentials

### Alternatives Considered
- **NextAuth.js**: More mature but heavier, not as type-safe, v5 still in beta
- **Clerk**: SaaS solution, overkill for MVP, vendor lock-in
- **Custom Auth**: Too much engineering effort, security risks

---

## 2. Prisma Schema Design

### Decision
Use **Prisma ORM** with PostgreSQL for type-safe database access and schema management.

### Rationale
- **Type Safety**: Auto-generates TypeScript types from schema
- **Migration Management**: Declarative schema with version-controlled migrations
- **Relationship Modeling**: Natural representation of polls, votes, comments, users
- **Query Performance**: Supports indexes, unique constraints, complex joins
- **Supabase Compatible**: Works with Supabase-hosted PostgreSQL

### Key Schema Patterns

#### Poll Scheduling (Start/End Times)
```prisma
model Poll {
  id          String   @id @default(cuid())
  title       String
  description String
  link        String?

  startAt     DateTime
  durationHours Int    // 1-8760 (per spec clarification)
  endAt       DateTime // Calculated: startAt + durationHours

  status      PollStatus @default(SCHEDULED)

  authorId    String
  author      User     @relation(fields: [authorId], references: [id])

  tagId       String
  tag         Tag      @relation(fields: [tagId], references: [id])

  options     VotingOption[]
  votes       Vote[]
  comments    Comment[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status, startAt]) // For finding active/scheduled polls
  @@index([tagId, status]) // For tag filtering
}

enum PollStatus {
  SCHEDULED // Before startAt
  ACTIVE    // Between startAt and endAt
  CLOSED    // After endAt or manually closed
}
```

**Automatic Status Updates**:
- Use database triggers or cron job to transition polls:
  - `SCHEDULED` → `ACTIVE` when `NOW() >= startAt`
  - `ACTIVE` → `CLOSED` when `NOW() >= endAt`
- Implement in service layer: `poll-service.ts` checks status on each fetch

#### Unique Vote Constraint
```prisma
model Vote {
  id        String   @id @default(cuid())

  userId    String
  user      User     @relation(fields: [userId], references: [id])

  pollId    String
  poll      Poll     @relation(fields: [pollId], references: [id])

  optionId  String
  option    VotingOption @relation(fields: [optionId], references: [id])

  createdAt DateTime @default(now())

  @@unique([userId, pollId]) // ONE VOTE PER USER PER POLL (enforces vote integrity)
  @@index([pollId]) // For aggregating votes
}
```

**Vote Integrity Enforcement**:
- Database-level unique constraint prevents duplicate votes
- Service layer validates before insert:
  ```typescript
  const existingVote = await prisma.vote.findUnique({
    where: { userId_pollId: { userId, pollId } }
  })
  if (existingVote) throw new Error("You have already voted on this poll")
  ```

#### Comment Threading (Self-Referential FK)
```prisma
model Comment {
  id        String   @id @default(cuid())
  text      String

  authorId  String
  author    User     @relation(fields: [authorId], references: [id])

  pollId    String
  poll      Poll     @relation(fields: [pollId], references: [id])

  parentId  String?  // Null for top-level, comment ID for replies
  parent    Comment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies   Comment[] @relation("CommentReplies")

  createdAt DateTime @default(now())

  @@index([pollId, createdAt]) // For sorting comments
  @@index([parentId]) // For fetching nested replies
}
```

**Threading Queries**:
- Fetch top-level comments: `where: { pollId, parentId: null }`
- Fetch nested replies: Include `replies` relation recursively (limit depth to 5 per spec SC-008)
- Sort by "Newest": `orderBy: { createdAt: 'desc' }`
- Sort by "Most Active": Join on latest reply timestamp

### Alternatives Considered
- **TypeORM**: Less mature TypeScript support, more verbose
- **Drizzle ORM**: Newer, smaller ecosystem, less documentation
- **Raw SQL**: No type safety, manual migration management

---

## 3. Server Actions Best Practices

### Decision
Use **Next.js 15 Server Actions** for all mutations (voting, commenting, poll creation).

### Rationale
- **Progressive Enhancement**: Forms work without JavaScript (native POST submission)
- **Type Safety**: End-to-end TypeScript from client to server
- **No API Routes Needed**: Direct function calls from components
- **Optimistic UI**: Built-in support via `useOptimistic` hook
- **Automatic Revalidation**: `revalidatePath()` updates cached data

### Patterns

#### Optimistic UI for Voting
```typescript
// apps/web/actions/vote-actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { voteService } from "@/services/vote-service"
import { auth } from "@/lib/auth"

const voteSchema = z.object({
  pollId: z.string().cuid(),
  optionId: z.string().cuid()
})

export async function submitVote(formData: FormData) {
  // 1. Authenticate
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return { error: "You must be logged in to vote" }
  }

  // 2. Validate input
  const parsed = voteSchema.safeParse({
    pollId: formData.get("pollId"),
    optionId: formData.get("optionId")
  })
  if (!parsed.success) {
    return { error: "Invalid vote data" }
  }

  // 3. Submit vote (service handles business logic)
  try {
    const vote = await voteService.submitVote({
      userId: session.user.id,
      pollId: parsed.data.pollId,
      optionId: parsed.data.optionId
    })

    // 4. Revalidate poll page to show updated results
    revalidatePath(`/poll/${parsed.data.pollId}`)

    return { success: true, vote }
  } catch (error) {
    return { error: error.message }
  }
}
```

**Client-Side Optimistic Update**:
```typescript
// packages/ui/components/voting/vote-options.tsx
"use client"

import { useOptimistic } from "react"
import { submitVote } from "@/actions/vote-actions"

export function VoteOptions({ poll, userVote }) {
  const [optimisticVote, setOptimisticVote] = useOptimistic(
    userVote,
    (state, newVote) => newVote
  )

  async function handleVote(optionId: string) {
    // Immediately update UI
    setOptimisticVote({ optionId })

    // Submit to server
    const result = await submitVote(new FormData({
      pollId: poll.id,
      optionId
    }))

    // If error, optimistic update will be rolled back automatically
    if (result.error) {
      alert(result.error)
    }
  }

  return (
    <form action={handleVote}>
      {poll.options.map(option => (
        <button
          name="optionId"
          value={option.id}
          disabled={!!optimisticVote}
        >
          {option.label}
        </button>
      ))}
    </form>
  )
}
```

#### Error Handling
- Use `try/catch` in Server Actions
- Return `{ success: boolean, error?: string, data?: T }` pattern
- Client handles errors via returned object (no throwing across boundary)

#### Revalidation Strategies
- **Path-based**: `revalidatePath("/poll/[id]")` after vote submission
- **Tag-based**: `revalidateTag("polls")` after creating new poll (updates feed)
- **On-demand**: `revalidatePath("/")` for homepage feed

### Alternatives Considered
- **API Routes**: Requires separate endpoint definitions, no progressive enhancement
- **tRPC**: Adds complexity, overkill for REST-like operations

---

## 4. Zod Validation Patterns

### Decision
Use **Zod** for runtime validation of all user inputs and API payloads.

### Rationale
- **Type Inference**: Zod schemas automatically generate TypeScript types
- **Composable**: Share schemas between client/server validation
- **Error Messages**: Human-readable validation errors for forms
- **Integration**: Works seamlessly with React Hook Form, Server Actions

### Implementation

#### Vote Submission Schema
```typescript
// apps/web/lib/validations.ts
import { z } from "zod"

export const voteSubmissionSchema = z.object({
  pollId: z.string().cuid("Invalid poll ID"),
  optionId: z.string().cuid("Invalid option ID")
})

export type VoteSubmission = z.infer<typeof voteSubmissionSchema>
```

#### Poll Creation Schema
```typescript
export const pollCreationSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(10).max(5000),
  link: z.string().url().optional().or(z.literal("")),
  tagId: z.string().cuid(),
  startAt: z.date().refine(date => date >= new Date(), {
    message: "Start date must be in the future or now"
  }),
  durationHours: z.number().int().min(1).max(8760, "Maximum duration is 365 days"),
  options: z.array(
    z.object({
      label: z.string().min(1).max(100)
    })
  ).min(2, "Minimum 2 voting options required")
    .max(5, "Maximum 5 voting options allowed")
})

export type PollCreation = z.infer<typeof pollCreationSchema>
```

#### Duration Constraints (1-8760 hours)
Per clarification: polls must be 1-8760 hours duration
- Zod enforces: `.min(1).max(8760)`
- UI provides preset options: 24h (1 day), 168h (1 week), 720h (30 days), 8760h (1 year)
- Custom input allowed within range

### Alternatives Considered
- **Yup**: Less TypeScript-native, heavier bundle
- **Joi**: Server-only, no client-side validation
- **Manual validation**: Error-prone, no type inference

---

## 5. Poll Scheduling

### Decision
Use **database-computed status** with service-layer checks (no background jobs for MVP).

### Rationale
- **Simplicity**: No additional infrastructure (no cron jobs, no workers)
- **Accuracy**: Status computed on-demand based on current time vs. start/end dates
- **Scalability**: Move to background jobs post-MVP if needed (Vercel Cron, BullMQ, etc.)

### Implementation
```typescript
// apps/web/services/poll-service.ts
export class PollService {
  async getPollWithStatus(pollId: string) {
    const poll = await prisma.poll.findUnique({ where: { id: pollId } })
    if (!poll) throw new Error("Poll not found")

    // Compute current status
    const now = new Date()
    let status: PollStatus

    if (now < poll.startAt) {
      status = "SCHEDULED"
    } else if (now >= poll.startAt && now < poll.endAt) {
      status = "ACTIVE"
    } else {
      status = "CLOSED"
    }

    // Update if changed
    if (status !== poll.status) {
      await prisma.poll.update({
        where: { id: pollId },
        data: { status }
      })
    }

    return { ...poll, status }
  }

  async getActivePolls() {
    const now = new Date()
    return prisma.poll.findMany({
      where: {
        startAt: { lte: now },
        endAt: { gte: now }
      },
      orderBy: { createdAt: 'desc' }
    })
  }
}
```

**Future Enhancement** (post-MVP):
- Use Vercel Cron (free tier: hourly cron jobs)
- Create `/api/cron/update-poll-status` route
- Run every hour to batch-update poll statuses

### Alternatives Considered
- **Vercel Cron**: Good for production, but adds deployment complexity for MVP
- **Database Triggers**: PostgreSQL triggers to auto-update status (harder to debug, less portable)
- **BullMQ/Redis**: Overkill for MVP, requires additional infrastructure

---

## 6. Real-Time Vote Updates

### Decision
Use **optimistic UI + server-side caching** with periodic refetching (no Server-Sent Events for MVP).

### Rationale
- **Simplicity**: No additional protocols or connections
- **Good UX**: Optimistic UI makes voting feel instant
- **Caching**: Next.js caching + revalidation keeps data fresh
- **Progressive Enhancement**: Works without JavaScript via form submission

### Implementation
```typescript
// Client-side: Optimistic update + fetch on focus
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function VoteResults({ pollId, initialResults }) {
  const router = useRouter()

  // Refetch when user returns to tab
  useEffect(() => {
    function handleFocus() {
      router.refresh() // Triggers server re-render with latest data
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [router])

  return <VoteResultsChart results={initialResults} />
}
```

**Server-Side Caching**:
- Poll results cached for 30 seconds: `fetch(..., { next: { revalidate: 30 } })`
- After vote submission: `revalidatePath()` invalidates cache immediately
- Other users see updated results within 30 seconds or on page navigation

**Future Enhancement** (post-MVP):
- Add Server-Sent Events for live updates (when poll is "hot")
- Implement via `/api/polls/[id]/stream` route with `EventSource`

### Alternatives Considered
- **WebSockets**: Overkill, requires persistent connections, out of spec scope
- **Server-Sent Events**: Good for real-time, but adds complexity for MVP
- **Polling**: Similar to our approach, but uses interval rather than on-focus refetch

---

## 7. Analytics Aggregation

### Decision
Use **Prisma aggregation queries** with database indexes for performance.

### Rationale
- **Simple**: No external analytics tools needed
- **Type-Safe**: Prisma's aggregate API is fully typed
- **Efficient**: PostgreSQL handles aggregation natively
- **Real-Time**: No data pipeline lag

### Implementation

#### Total Votes Per Poll
```typescript
// apps/web/services/analytics-service.ts
export class AnalyticsService {
  async getPollStats(pollId: string) {
    const [poll, voteCount, votesByOption] = await Promise.all([
      prisma.poll.findUnique({ where: { id: pollId } }),
      prisma.vote.count({ where: { pollId } }),
      prisma.vote.groupBy({
        by: ['optionId'],
        where: { pollId },
        _count: { id: true }
      })
    ])

    return {
      poll,
      totalVotes: voteCount,
      distribution: votesByOption.map(({ optionId, _count }) => ({
        optionId,
        count: _count.id,
        percentage: ((_count.id / voteCount) * 100).toFixed(1)
      }))
    }
  }
}
```

#### Time-Weighted Trending Algorithm
```typescript
async getTrendingPolls(limit: number = 10) {
  const hoursSinceEpoch = Date.now() / (1000 * 60 * 60)

  // Fetch polls with vote counts
  const polls = await prisma.poll.findMany({
    where: { status: 'ACTIVE' },
    include: {
      _count: { select: { votes: true } }
    }
  })

  // Calculate trending score: votes / age_in_hours^1.5 (Reddit algorithm)
  const scored = polls.map(poll => {
    const ageHours = (Date.now() - poll.createdAt.getTime()) / (1000 * 60 * 60)
    const score = poll._count.votes / Math.pow(ageHours + 2, 1.5)
    return { ...poll, trendingScore: score }
  })

  return scored.sort((a, b) => b.trendingScore - a.trendingScore).slice(0, limit)
}
```

#### Participation Rate
```typescript
async getParticipationRate(pollId: string) {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      _count: { select: { votes: true } }
    }
  })

  // Note: "views" tracking not in MVP scope
  // For now, use total users as denominator (or implement view tracking post-MVP)
  const totalUsers = await prisma.user.count({ where: { role: 'voter' } })
  const participationRate = (poll._count.votes / totalUsers) * 100

  return { pollId, votes: poll._count.votes, totalUsers, participationRate }
}
```

**Indexes for Performance**:
```prisma
model Vote {
  @@index([pollId, createdAt]) // For time-series queries
  @@index([userId]) // For user vote history
}

model Poll {
  @@index([status, createdAt]) // For feed queries (active polls, newest first)
  @@index([tagId, status]) // For tag filtering
}
```

### Alternatives Considered
- **Materialized Views**: PostgreSQL materialized views for pre-computed aggregates (good for scale, overkill for MVP)
- **Redis Caching**: Cache aggregated results in Redis (adds infrastructure, not needed for 10K users)

---

## 8. Reddit-Style UI Patterns

### Decision
Implement **card-based feed** with compact/expanded modes, infinite scroll, and Reddit-inspired color scheme.

### Rationale
- **Familiar**: Users know Reddit's UX patterns
- **Efficient**: Compact view shows more content per screen
- **Mobile-First**: Cards stack naturally on small screens
- **Accessible**: Easy to navigate with keyboard (Tab, Enter)

### Implementation

#### Card Layout
```tsx
// packages/ui/components/voting/poll-card.tsx
export function PollCard({ poll, variant = "compact" }) {
  return (
    <Card className={cn(
      "p-4 hover:shadow-lg transition-shadow",
      variant === "compact" ? "cursor-pointer" : ""
    )}>
      {/* Left sidebar: vote count + icon */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center text-sm text-muted-foreground">
          <ArrowUpIcon className="w-5 h-5" />
          <span className="font-bold">{poll._count.votes}</span>
          <span className="text-xs">votes</span>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{poll.title}</h3>
              <p className="text-sm text-muted-foreground">
                Posted by {poll.author.username} • {formatDistanceToNow(poll.createdAt)} ago
                {poll.tag && <Badge variant="secondary">{poll.tag.name}</Badge>}
              </p>
            </div>
            {variant === "compact" && <ChevronRightIcon />}
          </div>

          {variant === "expanded" && (
            <>
              <p className="mt-2 text-sm">{poll.description}</p>
              <VoteOptions poll={poll} />
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
```

#### Color Scheme
- **Primary (Orange)**: Vote buttons, CTAs - `hsl(25, 95%, 53%)` (Reddit orange)
- **Accent (Blue)**: Links, secondary actions - `hsl(210, 100%, 50%)`
- **Background**: Dark mode default - `hsl(240, 10%, 3.9%)`
- **Card**: Slightly lighter - `hsl(240, 10%, 10%)`

#### Infinite Scroll vs. Pagination
**Decision**: Use **cursor-based pagination** for feed (not infinite scroll in MVP).

**Rationale**:
- Simpler implementation (no intersection observer, no skeleton loaders)
- Better for accessibility (keyboard users can reach footer)
- Easier to cache (each page is a stable URL)
- Infinite scroll can be added post-MVP if user testing shows need

**Implementation**:
```typescript
// apps/web/app/(main)/page.tsx
export default async function HomePage({ searchParams }) {
  const cursor = searchParams.cursor || null
  const limit = 20

  const polls = await prisma.poll.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0
  })

  const hasMore = polls.length > limit
  const items = hasMore ? polls.slice(0, limit) : polls
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return (
    <div>
      {items.map(poll => <PollCard key={poll.id} poll={poll} />)}
      {nextCursor && (
        <Link href={`/?cursor=${nextCursor}`}>Load More</Link>
      )}
    </div>
  )
}
```

### Alternatives Considered
- **Infinite Scroll**: Better for engagement, but harder to implement accessibly
- **Grid Layout**: Less information-dense than vertical card list
- **List View**: No visual hierarchy, less scannable

---

## 9. Supabase Integration

### Decision
Use **Supabase** for managed PostgreSQL hosting with connection pooling.

### Rationale
- **Managed**: No database administration overhead
- **Prisma Compatible**: Direct PostgreSQL connection via connection string
- **Connection Pooling**: Built-in pgBouncer for serverless environments (Vercel)
- **Scalability**: Easy to upgrade from free tier to pro as traffic grows
- **Developer Experience**: Web UI for database inspection, SQL editor, logs

### Setup

#### Environment Variables
```bash
# apps/web/.env
# Direct connection (for migrations and dev)
DATABASE_URL="postgresql://user:password@db.supabase.co:5432/postgres"

# Pooled connection (for production/serverless)
DATABASE_URL_POOLED="postgresql://user:password@db.supabase.co:6543/postgres?pgbouncer=true"
```

#### Prisma Configuration
```prisma
// apps/web/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DATABASE_URL") // Use direct for migrations
}
```

#### Connection Pooling
```typescript
// apps/web/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.NODE_ENV === 'production'
        ? process.env.DATABASE_URL_POOLED
        : process.env.DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

#### Row-Level Security (RLS)
**Decision**: Not using RLS for MVP (Prisma + service layer handles authorization).

**Rationale**:
- Prisma doesn't support RLS policies natively
- Authorization logic in service layer is explicit and testable
- RLS adds complexity with marginal security benefit for this use case (admin-only operations already gated in Server Actions)

**Post-MVP**: Consider RLS if exposing direct Supabase REST API to mobile clients.

#### Backup Strategy
- **Supabase Free Tier**: Daily automated backups (7-day retention)
- **Upgrade to Pro**: Point-in-time recovery (PITR) for production
- **Manual Backups**: `pg_dump` before major migrations

### Alternatives Considered
- **Vercel Postgres**: Good integration with Vercel, but more expensive at scale
- **PlanetScale**: MySQL-based, Prisma migration workflow is less smooth
- **Self-Hosted PostgreSQL**: Too much operational overhead for MVP

---

## 10. Tag Management

### Decision
**Admin-only tag creation** via dedicated admin panel route.

### Rationale
- Per clarification: predefined tags at setup + admin can add new tags
- No free-form tag entry by users (prevents tag spam/duplication)
- Controlled taxonomy ensures clean filtering UX

### Implementation

#### Tag Model
```prisma
model Tag {
  id        String   @id @default(cuid())
  name      String   @unique // e.g., "Politics", "Technology"
  slug      String   @unique // URL-friendly: "politics", "technology"
  createdBy String
  creator   User     @relation(fields: [createdBy], references: [id])
  polls     Poll[]
  createdAt DateTime @default(now())
}
```

#### Tag Slug Generation
```typescript
// apps/web/lib/utils.ts
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

// Usage
const tagSlug = slugify("Politics & News") // => "politics-news"
```

#### Admin Tag Creation
```typescript
// apps/web/actions/tag-actions.ts
"use server"

export async function createTag(formData: FormData) {
  const session = await auth.api.getSession()
  if (!session || session.user.role !== 'admin') {
    return { error: "Unauthorized: Admin access required" }
  }

  const name = formData.get("name") as string
  const slug = slugify(name)

  // Check for duplicate
  const existing = await prisma.tag.findUnique({ where: { slug } })
  if (existing) {
    return { error: "A tag with this name already exists" }
  }

  const tag = await prisma.tag.create({
    data: {
      name,
      slug,
      createdBy: session.user.id
    }
  })

  revalidateTag("tags")
  return { success: true, tag }
}
```

#### Seed Tags
```typescript
// apps/web/prisma/seed.ts
const defaultTags = [
  { name: "Politics", slug: "politics" },
  { name: "Technology", slug: "technology" },
  { name: "Science", slug: "science" },
  { name: "Entertainment", slug: "entertainment" },
  { name: "Sports", slug: "sports" },
  { name: "World News", slug: "world-news" },
  { name: "Opinion", slug: "opinion" }
]

await prisma.tag.createMany({
  data: defaultTags.map(tag => ({
    ...tag,
    createdBy: adminUser.id
  }))
})
```

#### Tag Filtering Performance
**Index**: `@@index([tagId, status])` on Poll model ensures fast filtering.

**Query**:
```typescript
const pollsByTag = await prisma.poll.findMany({
  where: {
    tagId,
    status: 'ACTIVE'
  },
  orderBy: { createdAt: 'desc' }
})
```

**Future Enhancement**: Tag search/autocomplete for poll creation form.

### Alternatives Considered
- **User-Generated Tags**: Causes tag spam, inconsistent naming (e.g., "Tech" vs "Technology")
- **Fixed Enum**: Not flexible, requires code deploy to add tags

---

## Summary of Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| **Authentication** | BetterAuth (email/password + sessions) | Type-safe, Next.js 15 compatible, role-based auth |
| **Database** | Prisma + PostgreSQL (Supabase) | Type-safe ORM, managed hosting, migration tooling |
| **Mutations** | Next.js 15 Server Actions | Progressive enhancement, optimistic UI, no API routes |
| **Validation** | Zod schemas | Type inference, composable, runtime safety |
| **Poll Scheduling** | Database-computed status (no cron) | Simplicity for MVP, scalable later with Vercel Cron |
| **Real-Time Updates** | Optimistic UI + refetch on focus | Good UX, no additional protocols, works offline |
| **Analytics** | Prisma aggregation + indexes | Simple, type-safe, no external tools needed |
| **UI Pattern** | Reddit-style cards + pagination | Familiar UX, accessible, mobile-first |
| **Hosting** | Supabase (DB) + Vercel (app) | Managed, scalable, cost-effective for MVP |
| **Tag Management** | Admin-only creation + seed data | Controlled taxonomy, prevents spam |

---

## Open Questions / Future Research

- **Caching Strategy**: Fine-tune Next.js cache durations per route (feed vs. poll detail vs. analytics)
- **Image Uploads**: If links are insufficient, add Supabase Storage integration post-MVP
- **Email Notifications**: Use Resend or SendGrid for poll notifications (out of MVP scope)
- **Mobile App Auth**: JWT tokens vs. session cookies for Expo app (defer to mobile phase)
- **Internationalization**: next-intl for multi-language support (out of MVP scope per OS-012)

---

**Next Phase**: Phase 1 Design (data-model.md, contracts/, quickstart.md)
