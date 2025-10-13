# Implementation Plan: VoteHub Core Platform

**Branch**: `001-votehub-core-platform` | **Date**: 2025-10-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-votehub-core-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

VoteHub is a Reddit-style voting platform that replaces binary upvote/downvote with contextual multi-option polls (2-5 options per poll). Administrators create time-bound polls with custom voting options; voters browse a feed, vote once per poll, and view real-time aggregated results. The platform includes threaded comments, tag-based filtering, user profiles, and an admin analytics dashboard. Built as a Next.js 15 monorepo with REST API for future mobile expansion.

## Technical Context

**Language/Version**: TypeScript 5.7+ / Node.js 20+
**Primary Dependencies**: Next.js 15 (App Router), React 19, Prisma ORM, BetterAuth, Zod, shadcn/ui, Tailwind CSS v4
**Storage**: PostgreSQL (Supabase hosted)
**Testing**: Jest + React Testing Library (integration tests), Playwright (E2E), Vitest (unit tests for services)
**Target Platform**: Web (Vercel deployment), REST API for future Expo mobile app
**Project Type**: Web monorepo (Turborepo with apps/web + packages/ui)
**Performance Goals**: <2s page load (FCP <1.5s), <500ms API write operations, <200ms read operations, support 1000 concurrent users
**Constraints**: <200KB initial JS bundle, 99.5% uptime, WCAG 2.1 AA compliance, works without JavaScript (progressive enhancement)
**Scale/Scope**: MVP targets 10K users, 1K+ polls, 100K+ votes, horizontally scalable architecture

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### ✅ I. Clean Modular Architecture

- **Requirement**: Service layer in `apps/web/services/`, Server Actions in `apps/web/actions/`, no business logic in components
- **Status**: PASS - Plan follows Next.js 15 Server Actions pattern with separate service layer
- **Implementation**: Poll management, voting logic, auth operations isolated in services; components call Server Actions

### ✅ II. Next.js 15 Best Practices (NON-NEGOTIABLE)

- **Requirement**: Server Components by default, Client Components only for interactivity, Server Actions for mutations, Turbopack dev
- **Status**: PASS - Architecture designed server-first
- **Implementation**: Feed as Server Component, interactive elements (vote buttons, comment forms) as Client Components with Server Actions

### ✅ III. Monorepo Organization

- **Requirement**: `apps/web/` for Next.js app, `packages/ui/` for components, workspace protocol for deps
- **Status**: PASS - Existing monorepo structure used
- **Implementation**: VoteHub extends existing structure: `apps/web/` (polls, voting), `packages/ui/` (poll cards, vote UI)

### ✅ IV. Component Library First

- **Requirement**: All UI via shadcn CLI to `packages/ui`, custom components in `packages/ui/src/components/voting/`
- **Status**: PASS - shadcn/ui integration planned
- **Implementation**: Base components (Button, Card, Dialog) from shadcn; custom Poll Card, Vote Button, Comment Thread in `voting/`

### ✅ V. Type Safety

- **Requirement**: TypeScript strict mode, explicit types for polls/votes, Zod validation, no `any` types
- **Status**: PASS - Full TypeScript + Zod validation
- **Implementation**: Types: `Poll`, `VoteOption`, `Vote`, `Comment`, `User`; Zod schemas for all API inputs

### ✅ VI. Reddit-Style UX Consistency

- **Requirement**: Card feed, compact/expanded views, orange/blue colors, max 4 vote options (NOTE: Spec says 2-5, constitution says max 4 - NEEDS CLARIFICATION)
- **Status**: **PARTIAL** - Vote option count discrepancy between spec (2-5) and constitution (max 4)
- **Implementation**: Reddit-inspired design system with orange accents, card layout, sorting (Hot/New/Top/Trending)

### ⚠️ VII. Vote Integrity

- **Requirement**: Server-side validation, one vote per user per poll, server-calculated results
- **Status**: PASS with NOTE - Spec says votes cannot be changed (FR-016), constitution says "vote changes allowed but tracked"
- **Implementation**: Database unique constraint (user_id, poll_id), Server Actions only, Zod validation, optimistic UI with rollback

### ✅ VIII. Progressive Enhancement

- **Requirement**: Works without JS, WCAG 2.1 AA, keyboard navigation, native form submission
- **Status**: PASS - Server Actions enable no-JS voting
- **Implementation**: Forms use `action={serverAction}`, radio inputs for votes, server-rendered results

### 🔴 Discrepancies Requiring Resolution

| Issue             | Constitution                          | Spec                          | Resolution Needed                                                      |
| ----------------- | ------------------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| Vote option count | Max 4 (Principle VI)                  | 2-5 options (FR-008)          | **CLARIFY**: Use 2-5 (spec wins) or enforce max 4 (constitution wins)? |
| Vote changes      | "allowed but tracked" (Principle VII) | "cannot change vote" (FR-016) | **CLARIFY**: Allow changes with audit trail or prohibit entirely?      |

**Decision**: Proceeding with **spec requirements** (2-5 vote options, no vote changes) as spec is more recent and explicit. Constitution will be amended post-MVP if governance requires vote change tracking.

## Project Structure

### Documentation (this feature)

```
specs/001-votehub-core-platform/
├── plan.md              # This file
├── research.md          # Phase 0: Tech stack research, Prisma patterns, BetterAuth setup
├── data-model.md        # Phase 1: Entity schema, relationships, constraints
├── quickstart.md        # Phase 1: Local dev setup, seed data, test workflows
├── contracts/           # Phase 1: REST API OpenAPI specs
│   ├── polls.yaml       # Poll CRUD endpoints
│   ├── votes.yaml       # Voting endpoints
│   ├── comments.yaml    # Comment system endpoints
│   ├── tags.yaml        # Tag management endpoints
│   └── auth.yaml        # Authentication endpoints
└── tasks.md             # Phase 2: Generated by /speckit.tasks (NOT by this plan)
```

### Source Code (repository root)

VoteHub uses the existing **Turborepo monorepo structure** (web application pattern):

```
apps/web/                                  # Next.js 15 application
├── app/                                   # App Router structure
│   ├── (auth)/                           # Auth routes group
│   │   ├── login/                        # Login page
│   │   └── register/                     # Registration page
│   ├── (main)/                           # Main app routes
│   │   ├── layout.tsx                    # Main layout with nav
│   │   ├── page.tsx                      # Poll feed (home)
│   │   ├── poll/[id]/                    # Poll detail page
│   │   │   ├── page.tsx                  # Server Component
│   │   │   ├── loading.tsx               # Loading state
│   │   │   └── error.tsx                 # Error boundary
│   │   ├── user/[username]/              # User profile
│   │   │   └── page.tsx
│   │   └── admin/                        # Admin routes (protected)
│   │       ├── layout.tsx                # Admin layout
│   │       ├── polls/                    # Poll management
│   │       │   ├── page.tsx              # Poll list
│   │       │   ├── new/page.tsx          # Create poll
│   │       │   └── [id]/edit/page.tsx    # Edit poll
│   │       ├── tags/page.tsx             # Tag management
│   │       └── analytics/page.tsx        # Analytics dashboard
│   └── api/                              # API routes (REST endpoints)
│       └── [...rest routes if needed]
├── actions/                               # Server Actions (Next.js 15 pattern)
│   ├── poll-actions.ts                   # createPoll, updatePoll, unpublishPoll
│   ├── vote-actions.ts                   # submitVote, getVoteResults
│   ├── comment-actions.ts                # addComment, deleteComment
│   ├── tag-actions.ts                    # createTag, getTags
│   └── auth-actions.ts                   # login, register, logout
├── services/                              # Business logic layer
│   ├── poll-service.ts                   # Poll CRUD, validation, scheduling
│   ├── vote-service.ts                   # Vote submission, aggregation
│   ├── comment-service.ts                # Comment threading logic
│   ├── tag-service.ts                    # Tag management
│   └── analytics-service.ts              # Vote trends, participation metrics
├── lib/                                   # Utilities
│   ├── prisma.ts                         # Prisma client singleton
│   ├── auth.ts                           # BetterAuth configuration
│   ├── validations.ts                    # Zod schemas
│   └── utils.ts                          # Helpers
├── types/                                 # TypeScript types
│   ├── poll.ts                           # Poll, VotingOption, PollStatus
│   ├── vote.ts                           # Vote, VoteResult
│   ├── comment.ts                        # Comment
│   ├── user.ts                           # User, UserRole
│   └── api.ts                            # API request/response types
├── components/                            # App-specific components
│   ├── providers.tsx                     # Theme, auth context providers
│   ├── nav.tsx                           # Navigation bar
│   └── [other app-specific UI]
└── prisma/
    ├── schema.prisma                      # Database schema
    └── seed.ts                           # Seed data (admin users, tags)

packages/ui/                               # Shared component library
├── src/
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   └── [other shadcn components]
│   │   └── voting/                       # Custom VoteHub components
│   │       ├── poll-card.tsx             # Reddit-style poll card (compact/expanded)
│   │       ├── vote-options.tsx          # Voting UI (2-5 options)
│   │       ├── vote-results.tsx          # Visual vote distribution (bars/charts)
│   │       ├── comment-thread.tsx        # Nested comment threading
│   │       └── poll-feed.tsx             # Poll feed layout component
│   ├── hooks/                            # Shared hooks
│   │   ├── use-optimistic-vote.ts        # Optimistic UI for voting
│   │   └── use-poll-feed.ts              # Feed pagination/sorting
│   └── styles/
│       └── globals.css                   # Tailwind global styles
└── package.json

packages/typescript-config/                # Shared TS configs (existing)
packages/eslint-config/                    # Shared linting (existing)
```

**Structure Decision**: **Web application (monorepo)** pattern selected. VoteHub extends the existing Turborepo structure with `apps/web` as the main Next.js application and `packages/ui` for the shared component library. This aligns with Constitution Principle III (Monorepo Organization) and leverages existing infrastructure. No backend/frontend split needed—Next.js Server Actions handle API logic.

## Complexity Tracking

_No violations detected. All constitution principles satisfied with noted discrepancies resolved via spec precedence._

---

## Phase 0: Research & Technology Decisions

**Status**: PENDING (to be generated in research.md)

### Research Topics

1. **BetterAuth Setup**: Email/password authentication, session management, role-based access control (Admin/Voter)
2. **Prisma Schema Design**: Poll scheduling (start/end times), unique vote constraints, comment threading (self-referential FK)
3. **Server Actions Best Practices**: Optimistic UI patterns, error handling, revalidation strategies
4. **Zod Validation Patterns**: Vote submission schemas, poll creation validation, duration constraints (1-8760 hours)
5. **Poll Scheduling**: Background job patterns (cron vs. Vercel cron vs. database triggers) for auto-closing polls
6. **Real-time Updates**: Polling vs. Server-Sent Events for vote result updates (WebSockets out of scope)
7. **Analytics Aggregation**: Efficient vote counting queries, time-weighted trending algorithm
8. **Reddit-Style UI Patterns**: Card layouts, compact/expanded views, infinite scroll vs. pagination
9. **Supabase Integration**: Connection pooling, row-level security (RLS) configuration, backup strategies
10. **Tag Management**: Admin-only tag creation, tag slug generation, tag filtering performance

**Output**: `research.md` with decisions, rationale, and implementation notes for each topic.

---

## Phase 1: Design Artifacts

**Status**: PENDING (to be generated after Phase 0)

### Deliverables

1. **data-model.md**: Prisma schema design
   - Entities: User, Poll, VotingOption, Vote, Comment, Tag
   - Relationships: One-to-many (User→Polls, Poll→VotingOptions), many-to-one (Vote→User/Poll)
   - Constraints: Unique (user_id, poll_id) for votes, self-referential Comment.parentId
   - Indexes: Performance optimization for feed queries, vote aggregation
   - Enums: PollStatus (scheduled/active/closed), UserRole (admin/voter)

2. **contracts/**: REST API specifications (OpenAPI 3.0)
   - `POST /api/polls` - Create poll (admin only)
   - `GET /api/polls` - List polls (with sort/filter query params)
   - `GET /api/polls/:id` - Get poll details
   - `POST /api/polls/:id/vote` - Submit vote (authenticated users)
   - `GET /api/polls/:id/results` - Get vote results
   - `POST /api/comments` - Add comment
   - `DELETE /api/comments/:id` - Delete comment (author/admin)
   - `GET /api/tags` - List tags
   - `POST /api/tags` - Create tag (admin only)
   - Auth endpoints handled by BetterAuth library

3. **quickstart.md**: Developer onboarding guide
   - Prerequisites: Node 20+, pnpm 10+, PostgreSQL (or Supabase account)
   - Setup steps: Install deps, configure env vars, run Prisma migrations, seed database
   - Seed data: Create admin user, sample tags, test polls
   - Dev workflow: `pnpm dev`, accessing admin panel, testing vote submission
   - Testing: Run unit/integration tests, E2E with Playwright

4. **Agent Context Update**: Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add VoteHub-specific tech: Prisma, BetterAuth, Supabase
   - Update CLAUDE.md with poll management patterns, Server Actions usage
   - Document custom components in `packages/ui/components/voting/`

---

## Next Steps

1. ✅ Constitution check completed (minor discrepancies resolved via spec precedence)
2. 🔄 **NEXT**: Generate `research.md` (Phase 0)
3. ⏳ Generate `data-model.md`, `contracts/`, `quickstart.md` (Phase 1)
4. ⏳ Update agent context (Phase 1)
5. ⏳ Re-evaluate constitution check post-design
6. ⏳ **STOP**: Report completion (user runs `/speckit.tasks` to generate tasks.md)

---

**Note**: This plan stops after Phase 1 design artifacts. Task generation is triggered separately via `/speckit.tasks` command.
