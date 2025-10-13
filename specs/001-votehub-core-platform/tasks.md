# Tasks: VoteHub Core Platform MVP

**Input**: Design documents from `/specs/001-votehub-core-platform/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, quickstart.md

**MVP Scope**: User Stories 1 & 2 (View/Vote + Create Polls) - Locally testable voting application

**Tests**: Not included in MVP (focus on functional implementation first)

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, etc.)
- Include exact file paths in descriptions

## Path Conventions

Tasks use the existing monorepo structure:

- **Web app**: `apps/web/` (Next.js 15 application)
- **Shared UI**: `packages/ui/` (component library)
- **Config**: `packages/typescript-config/`, `packages/eslint-config/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies

- [x] T001 Install project dependencies via `pnpm install` at repository root
- [x] T002 [P] Configure environment variables in `apps/web/.env` (DATABASE_URL, AUTH_SECRET, AUTH_URL, NEXT_PUBLIC_APP_URL per quickstart.md)
- [x] T003 [P] Verify Supabase connection or setup local PostgreSQL database

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & ORM Setup

- [x] T004 Create Prisma schema in `apps/web/prisma/schema.prisma` with all entities from data-model.md (User, Poll, VotingOption, Vote, Comment, Tag, Session)
- [x] T005 Configure Prisma client singleton in `apps/web/lib/prisma.ts` with connection pooling logic
- [x] T006 Run initial Prisma migration: `npx prisma migrate dev --name init` from apps/web (completed manually)
- [x] T007 Create seed script in `apps/web/prisma/seed.ts` (admin user: admin@votehub.com/admin123, default tags per research.md)
- [x] T008 Run seed: `npx prisma db seed` from apps/web to populate initial data

### Authentication Framework

- [x] T009 Install BetterAuth: `pnpm add better-auth` in apps/web
- [x] T010 Configure BetterAuth in `apps/web/lib/auth.ts` with email/password provider, session management, role field (admin/voter)
- [x] T011 Create auth Server Actions in `apps/web/actions/auth-actions.ts` (login, register, logout functions)
- [x] T012 Create login page in `apps/web/app/(auth)/login/page.tsx` with email/password form using Server Action
- [x] T013 Create register page in `apps/web/app/(auth)/register/page.tsx` (auto-assigns voter role)
- [x] T014 Create auth layout in `apps/web/app/(auth)/layout.tsx` for auth pages styling

### Core UI Components (shadcn/ui)

- [x] T015 [P] Add Button component: `pnpm dlx shadcn@latest add button -c apps/web`
- [x] T016 [P] Add Card component: `pnpm dlx shadcn@latest add card -c apps/web`
- [x] T017 [P] Add Form component: `pnpm dlx shadcn@latest add form -c apps/web`
- [x] T018 [P] Add Dialog component: `pnpm dlx shadcn@latest add dialog -c apps/web`
- [x] T019 [P] Add Badge component: `pnpm dlx shadcn@latest add badge -c apps/web`
- [x] T020 [P] Add Select component: `pnpm dlx shadcn@latest add select -c apps/web`
- [x] T021 [P] Add Input component: `pnpm dlx shadcn@latest add input -c apps/web`
- [x] T022 [P] Add Textarea component: `pnpm dlx shadcn@latest add textarea -c apps/web`

### Type Definitions & Validation

- [x] T023 [P] Create Poll types in `apps/web/types/poll.ts` (Poll, VotingOption, PollStatus enum)
- [x] T024 [P] Create Vote types in `apps/web/types/vote.ts` (Vote, VoteResult)
- [x] T025 [P] Create User types in `apps/web/types/user.ts` (User, UserRole enum)
- [x] T026 [P] Create Comment types in `apps/web/types/comment.ts` (Comment)
- [x] T027 Create Zod validation schemas in `apps/web/lib/validations.ts` (voteSubmissionSchema, pollCreationSchema per research.md)

### Theme & Layout

- [x] T028 Create theme provider in `apps/web/components/providers.tsx` (next-themes, Reddit-inspired dark/light)
- [x] T029 Create main navigation in `apps/web/components/nav.tsx` (logo, login/register/logout, admin link if admin role)
- [x] T030 Create main layout in `apps/web/app/(main)/layout.tsx` (includes nav, theme provider)
- [x] T031 Update root layout in `apps/web/app/layout.tsx` to wrap with providers

**Checkpoint**: Foundation ready - all user stories can now be implemented in parallel

---

## Phase 3: User Story 1 - View and Vote on Active Polls (Priority: P1) 🎯 MVP

**Goal**: Voters can browse polls, view details, submit votes, and see aggregated results in real-time

**Independent Test**: Create a poll via seed/admin, log in as voter, view feed, click poll, select option, submit vote, verify vote recorded and results displayed

### Backend - Poll & Vote Services

- [x] T032 [P] [US1] Create poll service in `apps/web/services/poll-service.ts` (getPollWithStatus, getActivePolls, getPollById methods from research.md)
- [x] T033 [P] [US1] Create vote service in `apps/web/services/vote-service.ts` (submitVote with unique constraint check, getVoteResults, getUserVote methods)

### Backend - Server Actions

- [x] T034 [US1] Create vote Server Actions in `apps/web/actions/vote-actions.ts` (submitVote with Zod validation, revalidatePath per research.md)

### Frontend - Custom Voting Components

- [x] T035 [P] [US1] Create PollCard component in `packages/ui/src/components/voting/poll-card.tsx` (Reddit-style card with compact/expanded views, vote count, metadata)
- [x] T036 [P] [US1] Create VoteOptions component in `packages/ui/src/components/voting/vote-options.tsx` (radio inputs, Server Action form, optimistic UI per research.md)
- [x] T037 [P] [US1] Create VoteResults component in `packages/ui/src/components/voting/vote-results.tsx` (colored bars, percentages, vote counts)

### Frontend - Poll Feed & Detail Pages

- [x] T038 [US1] Create poll feed page in `apps/web/app/(main)/page.tsx` (Server Component, fetch active polls, map to PollCard components, show newest first)
- [x] T039 [US1] Create poll detail page in `apps/web/app/(main)/poll/[id]/page.tsx` (Server Component, fetch poll + vote results + user's vote, render VoteOptions if not voted, else show VoteResults)
- [x] T040 [P] [US1] Create poll loading state in `apps/web/app/(main)/poll/[id]/loading.tsx` (skeleton UI)
- [x] T041 [P] [US1] Create poll error boundary in `apps/web/app/(main)/poll/[id]/error.tsx` (error handling)

### Integration & Validation

- [x] T042 [US1] Verify poll status transitions (SCHEDULED → ACTIVE → CLOSED) in poll service based on current time vs startAt/endAt
- [x] T043 [US1] Verify vote integrity: database constraint prevents duplicate votes (test by attempting second vote, should fail with 409 Conflict)
- [x] T044 [US1] Verify vote submission triggers optimistic UI update then revalidation (immediate feedback, then server confirmation)
- [x] T045 [US1] Verify expired polls show results but disable voting (check endAt < now condition)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Voters can view polls and vote.

---

## Phase 4: User Story 2 - Create and Publish Polls (Priority: P1) 🎯 MVP

**Goal**: Administrators can create time-bound polls with 2-5 custom voting options that appear in the feed

**Independent Test**: Log in as admin (admin@votehub.com), access /admin/polls/new, fill form (title, description, tag, startAt, duration, 2-5 options), submit, verify poll appears in feed

### Backend - Poll Management Services

- [x] T046 [P] [US2] Create tag service in `apps/web/services/tag-service.ts` (getTags, createTag methods)
- [x] T047 [P] [US2] Extend poll service in `apps/web/services/poll-service.ts` (createPoll, updatePoll, deletePoll, unpublishPoll methods per contracts)

### Backend - Admin Server Actions

- [x] T048 [US2] Create poll Server Actions in `apps/web/actions/poll-actions.ts` (createPoll with admin role check, updatePoll, unpublishPoll, revalidateTag('polls'))
- [x] T049 [P] [US2] Create tag Server Actions in `apps/web/actions/tag-actions.ts` (createTag with admin role check, getTags)

### Frontend - Admin Poll Creation

- [x] T050 [US2] Create admin layout in `apps/web/app/(main)/admin/layout.tsx` (check session.user.role === 'admin', redirect if not)
- [x] T051 [US2] Create poll list page in `apps/web/app/(main)/admin/polls/page.tsx` (list all polls by admin, link to create/edit)
- [x] T052 [US2] Create poll creation page in `apps/web/app/(main)/admin/polls/new/page.tsx` (form: title, description, link optional, tag select, startAt datetime-local, durationHours number 1-8760, dynamic option inputs 2-5)
- [x] T053 [US2] Add dynamic option input logic in poll creation form (add/remove option buttons, validate 2-5 range client-side)
- [x] T054 [P] [US2] Create poll edit page in `apps/web/app/(main)/admin/polls/[id]/edit/page.tsx` (pre-fill form, only allow edit if no votes)

### Frontend - Tag Management

- [x] T055 [US2] Create tag management page in `apps/web/app/(main)/admin/tags/page.tsx` (list tags, create new tag form, slug auto-generated)

### Integration & Validation

- [x] T056 [US2] Verify admin role enforcement: non-admin cannot access /admin routes (redirect to login or 403)
- [x] T057 [US2] Verify poll creation with 2-5 options saves correctly (check VotingOption order field)
- [x] T058 [US2] Verify poll appears in feed immediately if startAt <= now, else scheduled (check status field)
- [x] T059 [US2] Verify duration calculation: endAt = startAt + durationHours (display endAt on poll card)
- [x] T060 [US2] Verify poll deletion blocked if votes exist (attempt delete poll with votes, expect error message per clarifications)
- [x] T061 [US2] Verify unpublish/hide functionality for polls with votes (status → CLOSED, hidden from public feed)

**Checkpoint**: At this point, User Stories 1 AND 2 are fully functional. MVP is complete: admins create polls, voters vote.

---

## Phase 5: User Story 3 - Sort and Filter Poll Feed (Priority: P2)

**Goal**: Enhance feed discoverability with sorting (Newest, Most Voted, Trending) and tag filtering

**Independent Test**: Create multiple polls with different vote counts and tags, use sort dropdown, use tag filter, verify ordering

**Deferred for Post-MVP**: Implement after MVP validation. Tasks outline:

- [x] T062 [US3] Add sort query param support in feed page (sort=newest|most-voted|trending)
- [x] T063 [US3] Implement trending algorithm in poll service (time-weighted vote velocity per research.md)
- [x] T064 [US3] Add sort dropdown UI in feed page (next to feed title)
- [x] T065 [US3] Add tag filter dropdown in feed (fetch all tags, filter polls by tagId query param)
- [x] T066 [US3] Add "Clear Filters" button to reset sort/filter

**Checkpoint**: Feed now has enhanced discoverability (still independent of other features)

---

## Phase 6: User Story 4 - Comment on Polls (Priority: P3)

**Goal**: Add threaded comment system for poll discussions

**Independent Test**: View poll, add comment, reply to comment, sort by newest/most active, verify threading

**Deferred for Post-MVP**: Implement after MVP validation. Tasks outline:

- [x] T067 [P] [US4] Create comment service in `apps/web/services/comment-service.ts` (addComment, deleteComment, getComments methods)
- [x] T068 [US4] Create comment Server Actions in `apps/web/actions/comment-actions.ts` (addComment, deleteComment)
- [x] T069 [P] [US4] Create CommentThread component in `packages/ui/src/components/voting/comment-thread.tsx` (recursive rendering, nested indentation)
- [x] T070 [US4] Add comment section to poll detail page (fetch comments with replies, sort options, comment form)
- [x] T071 [US4] Implement comment deletion (only author or admin can delete, cascade to replies)

**Checkpoint**: Polls now support community discussions (independent feature, doesn't break voting)

---

## Phase 7: User Story 5 - View User Profile and History (Priority: P3)

**Goal**: Display user profiles with comment history and activity

**Independent Test**: Log in, click username in nav or on comment, verify profile page shows user info and comments

**Deferred for Post-MVP**: Implement after MVP validation. Tasks outline:

- [x] T072 [US5] Create user profile page in `apps/web/app/(main)/user/[username]/page.tsx` (fetch user by username, show join date, comment history)
- [x] T073 [US5] Link usernames in nav and comments to profile pages
- [x] T074 [US5] Display "No activity yet" message for users without comments

**Checkpoint**: User profiles provide transparency (doesn't affect core voting functionality)

---

## Phase 8: User Story 6 - Admin Analytics Dashboard (Priority: P4)

**Goal**: Provide admins with vote trends and participation metrics

**Independent Test**: Log in as admin, navigate to /admin/analytics, view charts and aggregate stats

**Deferred for Post-MVP**: Implement after MVP validation. Tasks outline:

- [ ] T075 [P] [US6] Create analytics service in `apps/web/services/analytics-service.ts` (getPollStats, getTrendingPolls, getParticipationRate per research.md)
- [ ] T076 [US6] Create analytics page in `apps/web/app/(main)/admin/analytics/page.tsx` (aggregate metrics, charts with recharts or similar)
- [ ] T077 [US6] Add time range selector (7 days, 30 days, all time)

**Checkpoint**: Admins have data-driven insights (optional feature for optimization)

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final touches, testing, documentation after core features complete

- [ ] T078 [P] Add loading states (Suspense boundaries) for slow queries in feed and poll detail pages
- [ ] T079 [P] Verify keyboard navigation works (Tab through poll cards, Enter to open, Tab through vote options, Enter/Space to vote)
- [ ] T080 [P] Test without JavaScript (disable in DevTools): forms should submit via native POST, results should render server-side
- [ ] T081 [P] Verify WCAG 2.1 AA compliance (color contrast, ARIA labels on interactive elements)
- [ ] T082 [P] Add error handling: 404 for missing polls, 401/403 for unauthorized access, 409 for duplicate votes
- [x] T083 Run full type check: `pnpm typecheck` from repository root (fix any TypeScript errors)
- [x] T084 Run lint: `pnpm lint` from repository root (fix any linting issues)
- [x] T085 Format code: `pnpm format` from repository root (Prettier)
- [x] T086 Create production build: `pnpm build` from repository root (verify no build errors)
- [x] T087 Test production build locally: `cd apps/web && pnpm start` (verify functionality matches dev)
- [ ] T088 Update CLAUDE.md with any new patterns or components added during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion - No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion - No dependencies on other stories (can run in parallel with US1 if staffed)
- **User Story 3 (Phase 5)**: Depends on US1 completion (extends feed functionality)
- **User Story 4 (Phase 6)**: Depends on US1 completion (adds comments to poll detail page)
- **User Story 5 (Phase 7)**: Depends on US4 completion (profiles show comment history)
- **User Story 6 (Phase 8)**: Depends on US1, US2 completion (analyzes poll and vote data)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Independent
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent (parallel with US1 possible)
- **User Story 3 (P2)**: Depends on US1 (extends feed with sort/filter)
- **User Story 4 (P3)**: Depends on US1 (adds comments to polls)
- **User Story 5 (P3)**: Depends on US4 (profiles need comment history)
- **User Story 6 (P4)**: Depends on US1 + US2 (analyzes voting data)

### Within Each User Story

- Backend services before Server Actions
- Server Actions before frontend components
- Custom components before page integration
- Core implementation before validation tasks

### Parallel Opportunities

- All Setup tasks (T001-T003) can run in parallel
- Core UI components (T015-T022) can run in parallel
- Type definitions (T023-T026) can run in parallel
- Within User Story 1: Services (T032, T033), Components (T035-T037), Loading/Error pages (T040, T041) can run in parallel
- Within User Story 2: Services (T046, T047), Server Actions (T048, T049), Edit page (T054) can run in parallel with main flow
- User Story 1 and User Story 2 can be worked on in parallel by different team members (both depend only on Foundational phase)

---

## Parallel Example: User Story 1 (View and Vote)

```bash
# Once Foundational phase completes, launch these tasks in parallel:

# Backend services
Task T032: Create poll service in apps/web/services/poll-service.ts
Task T033: Create vote service in apps/web/services/vote-service.ts

# Frontend components
Task T035: Create PollCard component in packages/ui/src/components/voting/poll-card.tsx
Task T036: Create VoteOptions component in packages/ui/src/components/voting/vote-options.tsx
Task T037: Create VoteResults component in packages/ui/src/components/voting/vote-results.tsx

# Sequential after services/components complete:
Task T034: Create vote Server Actions (needs services)
Task T038: Create feed page (needs PollCard component)
Task T039: Create poll detail page (needs VoteOptions, VoteResults components)
Task T040, T041: Loading/error pages (parallel with T038, T039)

# Validation tasks (sequential after implementation):
Task T042-T045: Integration checks
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only) 🎯

**Recommended for local testing MVP**:

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T031) - CRITICAL blocking phase
3. Complete Phase 3: User Story 1 (T032-T045) - Core voting functionality
4. Complete Phase 4: User Story 2 (T046-T061) - Admin poll creation
5. **STOP and VALIDATE MVP**:
   - Test locally per quickstart.md
   - Admin creates poll → Voter sees poll → Voter votes → Results update
   - Verify all acceptance scenarios from spec.md
6. Optional: Run Phase 9 polish tasks (T078-T088)

**MVP Deliverable**: Locally testable app with core voting loop (admins create polls, voters vote, results displayed)

**Task Count for MVP**: 61 tasks (T001-T061)

- Setup: 3 tasks
- Foundational: 28 tasks (critical infrastructure)
- User Story 1: 14 tasks (voting functionality)
- User Story 2: 16 tasks (poll creation)

**Estimated Time**: 2-3 days for full MVP (assuming foundational phase takes 1 day, each user story takes 0.5-1 day)

### Incremental Delivery (Post-MVP)

After MVP validation:

1. Add User Story 3 (Phase 5): Sort/Filter (T062-T066) - 5 tasks
2. Add User Story 4 (Phase 6): Comments (T067-T071) - 5 tasks
3. Add User Story 5 (Phase 7): Profiles (T072-T074) - 3 tasks
4. Add User Story 6 (Phase 8): Analytics (T075-T077) - 3 tasks
5. Polish & Cross-Cutting (Phase 9): T078-T088 - 11 tasks

Each phase adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers (post-Foundational phase):

- **Developer A**: User Story 1 (T032-T045) - Voting functionality
- **Developer B**: User Story 2 (T046-T061) - Poll creation
- **Merge**: Both stories integrate seamlessly (shared data model, no conflicts)
- **Result**: MVP complete in half the time

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] labels**: Track which user story each task belongs to (US1, US2, US3...)
- **MVP Focus**: Complete T001-T061 for locally testable voting application
- **Each user story is independently completable and testable**
- **Checkpoint markers**: Test after each user story phase completion
- **Avoid**: Vague tasks, same file conflicts, cross-story dependencies that break independence
- **File paths**: All paths are specific and executable by LLM without additional context
- **Constitution compliance**: All tasks follow Next.js 15 best practices, modular architecture, type safety

---

## Quick Start for MVP Implementation

```bash
# 1. Setup (3 tasks)
pnpm install
# Configure .env per quickstart.md
# Verify database connection

# 2. Foundational (28 tasks) - MUST COMPLETE FIRST
cd apps/web
# Create Prisma schema from data-model.md
npx prisma migrate dev --name init
npx prisma db seed
# Install BetterAuth, configure auth
# Add shadcn components (T015-T022)
# Create type definitions and validation schemas

# 3. User Story 1: Voting (14 tasks)
# Implement poll-service, vote-service
# Create vote-actions Server Action
# Build PollCard, VoteOptions, VoteResults components
# Create feed page and poll detail page
# Test: Can view polls and vote

# 4. User Story 2: Poll Creation (16 tasks)
# Extend poll-service with create/update methods
# Create poll-actions, tag-actions
# Build admin panel (/admin/polls/new)
# Test: Admin can create polls that appear in feed

# 5. Validate MVP
# Log in as admin, create poll
# Log in as voter, vote on poll
# Verify results update
# ✅ MVP COMPLETE
```

---

**Total Task Count**: 88 tasks

- **MVP (P1 only)**: 61 tasks (T001-T061)
- **P2 (Sort/Filter)**: 5 tasks (T062-T066)
- **P3 (Comments + Profiles)**: 8 tasks (T067-T074)
- **P4 (Analytics)**: 3 tasks (T075-T077)
- **Polish**: 11 tasks (T078-T088)

**Recommended First Milestone**: Complete MVP (T001-T061) for local testing validation.
