# Feature Specification: VoteHub Core Platform

**Feature Branch**: `001-votehub-core-platform`
**Created**: 2025-10-09
**Status**: Draft
**Input**: User description: "VoteHub Core Platform - Voting and Poll Management System"

## Clarifications

### Session 2025-10-09

- Q: How should poll deletion work when votes exist? → A: Polls with votes cannot be deleted at all (only unpublish/hide)
- Q: How are administrator accounts created and managed? → A: Admins created during initial system setup; normal users can never become admins
- Q: How are poll tags/categories created and managed? → A: Predefined list of tags created during setup; admins can add new tags via admin panel
- Q: What can non-authenticated (anonymous) users see? → A: Feed + poll details + vote results + comments (full read access, just can't vote/comment)
- Q: What time units should poll duration support? → A: Hours only (e.g., "24 hours", "168 hours")

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Vote on Active Polls (Priority: P1)

A voter visits VoteHub, browses the feed of active polls, selects a poll of interest, reads the details, chooses one of 2-5 voting options, and submits their vote. The system displays updated vote distribution after submission.

**Why this priority**: This is the core value proposition. Without the ability to view and vote on polls, the platform has no purpose. This delivers immediate value and can be demonstrated as a standalone MVP.

**Independent Test**: Create a poll with admin tools, log in as a voter, navigate to poll feed, click a poll, select an option, submit vote, and verify vote is recorded and results are visible.

**Acceptance Scenarios**:

1. **Given** a voter is viewing the poll feed, **When** they click on a poll card, **Then** they see the poll details including title, description, author, timestamp, tags, and 2-5 voting options
2. **Given** a voter is viewing a poll they haven't voted on, **When** they select one option and submit, **Then** their vote is recorded and they see updated vote distribution with visual breakdown
3. **Given** a voter has already voted on a poll, **When** they view that poll again, **Then** they see their previous vote highlighted and the current vote distribution, but cannot vote again
4. **Given** a poll has expired (past duration), **When** a voter views it, **Then** they see the results but cannot submit a vote
5. **Given** multiple voters vote on the same poll, **When** viewing the results, **Then** all votes are correctly aggregated and displayed as percentages and counts

---

### User Story 2 - Create and Publish Polls (Priority: P1)

An administrator creates a new poll by providing a title, optional link, description, tags, start date/time, duration, and 2-5 custom voting options. The poll is published to the feed and becomes available for voters when the start time arrives.

**Why this priority**: Content creation is equally critical to the MVP. Without admin-created polls, there's nothing for voters to interact with. This enables the core content loop.

**Independent Test**: Log in as admin, access poll creation form, fill all fields including custom voting options, publish poll, and verify it appears in the feed at the scheduled time.

**Acceptance Scenarios**:

1. **Given** an administrator is logged in, **When** they access the poll creation interface, **Then** they see a form with fields for title, link (optional), description, tags, start date/time, duration, and 2-5 voting options
2. **Given** an admin is creating a poll, **When** they add between 2 and 5 voting options with custom labels (e.g., "Strongly Agree", "Neutral", "Disagree"), **Then** all options are saved with the poll configuration
3. **Given** an admin sets a future start date/time for a poll, **When** the poll is published, **Then** it appears in the feed but voting is disabled until the start time is reached
4. **Given** an admin sets a poll duration of 7 days, **When** 7 days pass from the start time, **Then** the poll automatically closes and no further votes are accepted
5. **Given** a non-admin user, **When** they attempt to access poll creation features, **Then** they are denied access and see appropriate messaging

---

### User Story 3 - Sort and Filter Poll Feed (Priority: P2)

A voter wants to find relevant polls by sorting the feed (by most voted, newest, trending) or filtering by category/tag. The feed updates dynamically to show only matching polls.

**Why this priority**: Enhances discoverability and user experience but the platform functions without it. Users can still browse all polls sequentially. This becomes critical as poll volume grows.

**Independent Test**: Create polls with different vote counts, timestamps, and tags. Use sort controls to view by "Most Voted", "Newest", "Trending". Use filter controls to show only specific tags. Verify results match criteria.

**Acceptance Scenarios**:

1. **Given** the voter is viewing the poll feed, **When** they select "Most Voted" sort option, **Then** polls are reordered with highest vote counts first
2. **Given** the voter is viewing the poll feed, **When** they select "Newest" sort option, **Then** polls are reordered with most recently created first
3. **Given** the voter is viewing the poll feed, **When** they select "Trending" sort option, **Then** polls are reordered based on time-weighted vote velocity (recent votes weighted higher)
4. **Given** the voter is viewing the poll feed, **When** they filter by a specific tag/category (e.g., "Politics"), **Then** only polls with that tag are displayed
5. **Given** the voter has applied both sort and filter, **When** they clear filters, **Then** the feed returns to showing all polls with the selected sort order maintained

---

### User Story 4 - Comment on Polls (Priority: P3)

A voter or administrator adds comments to a poll to discuss or provide additional context. Comments are threaded (Reddit-style), can be sorted by newest/most active, and create an engagement layer beyond voting.

**Why this priority**: Adds community engagement but is not essential for the core voting functionality. The platform delivers value without comments. This is an enhancement for discourse.

**Independent Test**: View a poll, add a comment, reply to another comment, sort comments by newest/most active, and verify threading and sorting work correctly.

**Acceptance Scenarios**:

1. **Given** a user is viewing a poll, **When** they enter text in the comment field and submit, **Then** their comment appears in the comment thread with timestamp and username
2. **Given** a user is viewing comments on a poll, **When** they click reply on an existing comment, **Then** they can submit a nested reply that appears indented under the parent comment
3. **Given** multiple comments exist on a poll, **When** the user selects "Newest" sort, **Then** comments are reordered with most recent first (including nested replies)
4. **Given** multiple comments exist on a poll, **When** the user selects "Most Active" sort, **Then** comment threads with most recent activity appear first
5. **Given** comments exist on a poll, **When** a user without permissions tries to delete another user's comment, **Then** the action is denied (only comment author or admin can delete)

---

### User Story 5 - View User Profile and History (Priority: P3)

A user (voter or admin) views their own or another user's profile to see comment history and activity. Profiles display basic information and provide transparency about user participation.

**Why this priority**: Provides accountability and community features but is not core to the voting mechanism. Users can vote and create polls without profiles. Enhances trust and engagement.

**Independent Test**: Log in, navigate to profile page, verify comment history is displayed, click on another user's name from a comment, and verify their public profile loads.

**Acceptance Scenarios**:

1. **Given** a user is logged in, **When** they navigate to their profile page, **Then** they see their username, join date, and chronological list of comments they've made
2. **Given** a user is viewing a poll with comments, **When** they click on a commenter's username, **Then** they are taken to that user's public profile showing their comment history
3. **Given** a user is viewing their own profile, **When** they click on a comment from their history, **Then** they are navigated to that comment in context of the poll
4. **Given** a user is viewing another user's profile, **When** that user has no public activity, **Then** the profile displays minimal information (username, join date, "No activity yet" message)

---

### User Story 6 - Admin Analytics Dashboard (Priority: P4)

An administrator accesses a dashboard showing voting trends, participation rates, poll performance metrics, and sentiment aggregation over time. This enables data-driven decisions about content strategy.

**Why this priority**: Valuable for platform operators but not essential for core functionality. Polls can be created and voted on without analytics. This is a nice-to-have for optimization.

**Independent Test**: Log in as admin, navigate to analytics dashboard, verify charts/visualizations display vote counts, trends over time, participation rates, and poll performance metrics.

**Acceptance Scenarios**:

1. **Given** an administrator accesses the analytics dashboard, **When** the page loads, **Then** they see aggregate metrics: total polls, total votes, active users, participation rate
2. **Given** an administrator is viewing analytics, **When** they select a time range (e.g., last 7 days, last 30 days), **Then** all metrics and charts update to reflect that period
3. **Given** an administrator is viewing poll-level analytics, **When** they select a specific poll, **Then** they see detailed vote distribution, voting timeline, and demographic breakdown (if available)
4. **Given** an administrator is viewing trend charts, **When** they hover over data points, **Then** they see specific values (vote count, date/time, percentage)

---

### Edge Cases

- **What happens when a voter tries to vote on an expired poll?** System displays results but disables vote submission, showing "Poll closed" message
- **What happens when a voter tries to vote before poll start time?** System displays "Poll opens on [date/time]" message and disables vote options
- **What happens when an admin tries to create a poll with only 1 voting option?** Validation error: "Minimum 2 voting options required"
- **What happens when an admin tries to create a poll with 6+ voting options?** Validation error: "Maximum 5 voting options allowed"
- **What happens when a voter loses connection during vote submission?** Optimistic UI shows vote immediately; if server fails, vote is rolled back and error message displayed
- **What happens when two voters vote at exact same time on same poll?** Both votes are recorded independently; race conditions handled by database constraints
- **What happens when a non-authenticated user tries to vote or comment?** System displays login/registration prompt with message "Please login to vote" or "Please login to comment". Anonymous users can view all content (feed, polls, results, comments) but cannot interact
- **What happens when an admin tries to delete a poll that users have already voted on?** Deletion is blocked; system shows error "Cannot delete poll with existing votes. You can unpublish/hide the poll instead." Polls without votes can be deleted.
- **What happens when a poll's duration ends while a user is in the middle of voting?** If vote submits after expiration, validation fails with "Poll has ended" message
- **What happens if a user navigates away mid-comment?** Draft comments are not saved (standard web behavior; auto-save is out of scope for MVP)

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization

- **FR-001**: System MUST support two distinct user roles: Administrator and Voter
- **FR-001a**: Administrator accounts MUST be created during initial system setup/deployment; regular users cannot become administrators through the application
- **FR-002**: System MUST authenticate users via email/password with session-based authentication (standard web pattern)
- **FR-003**: System MUST restrict poll creation to Administrator role only
- **FR-004**: System MUST allow authenticated users of any role to vote on active polls
- **FR-005**: System MUST allow authenticated users of any role to comment on polls
- **FR-006**: System MUST prevent non-authenticated users from voting or commenting (read-only access to feed)
- **FR-006a**: Non-authenticated users MUST be able to view: poll feed, poll details, vote results/distribution, and comments
- **FR-006b**: Non-authenticated users attempting to vote or comment MUST be prompted to login/register

#### Poll Management

- **FR-007**: System MUST allow administrators to create polls with: title (required), link (optional), description (required), tags/categories (required), start date/time (required), duration (required), and 2-5 voting options (required)
- **FR-007a**: System MUST provide a predefined list of tags/categories initialized during system setup
- **FR-007b**: System MUST allow administrators to create new tags/categories through an admin panel
- **FR-007c**: When creating a poll, administrators MUST select from existing tags (tag creation happens separately in admin panel, not during poll creation)
- **FR-007d**: Poll duration MUST be specified in hours (e.g., 24, 48, 168); minimum 1 hour, maximum 8760 hours (365 days)
- **FR-008**: System MUST enforce minimum 2 and maximum 5 voting options per poll (changed from 4 to align with "2-5" requirement)
- **FR-009**: System MUST validate poll start date/time is not in the past (or allow immediate start)
- **FR-010**: System MUST calculate poll end time as start time + duration (in hours)
- **FR-011**: System MUST automatically disable voting when poll end time is reached
- **FR-012**: System MUST enable voting only between poll start time and end time
- **FR-013**: System MUST allow administrators to edit poll details before voting begins (after voting starts, polls are immutable to preserve vote integrity)
- **FR-013a**: System MUST prevent deletion of polls that have received any votes; only polls with zero votes can be deleted
- **FR-013b**: System MUST provide "unpublish/hide" functionality for polls with votes, removing them from public feed while preserving data
- **FR-014**: System MUST display poll metadata on feed: title, author, timestamp, vote count, comment count (if comments exist), tags

#### Voting System

- **FR-015**: System MUST allow each authenticated user to vote once per poll (one vote per user per poll constraint)
- **FR-016**: System MUST prevent users from changing their vote after submission (per "cannot change their vote" requirement)
- **FR-017**: System MUST validate vote submissions server-side with Zod schemas (per constitution)
- **FR-018**: System MUST track which user voted for which option (for constraint enforcement, but anonymize in public results)
- **FR-019**: System MUST display vote results as both counts and percentages
- **FR-020**: System MUST display vote distribution using visual representations (colored bars or pie charts)
- **FR-021**: System MUST show real-time or near-real-time vote updates (optimistic UI with server validation)
- **FR-022**: System MUST highlight a user's previously cast vote when they view a poll they've voted on

#### Feed & Discovery

- **FR-023**: System MUST display all active and completed polls in a card-based feed (Reddit-style layout)
- **FR-024**: System MUST support sorting polls by: Most Voted (total vote count), Newest (creation date), Trending (time-weighted vote velocity)
- **FR-025**: System MUST support filtering polls by tag/category (single tag filter; multi-tag is out of scope)
- **FR-026**: System MUST apply both sort and filter simultaneously when both are selected
- **FR-027**: System MUST display poll cards in compact view by default with option to expand (Reddit pattern)

#### Commenting System

- **FR-028**: System MUST allow authenticated users to add top-level comments to polls
- **FR-029**: System MUST allow authenticated users to reply to existing comments (nested threading, Reddit-style)
- **FR-030**: System MUST support sorting comments by: Newest (timestamp descending) or Most Active (most recent reply in thread)
- **FR-031**: System MUST display comment metadata: author, timestamp
- **FR-032**: System MUST allow comment authors and administrators to delete their own comments
- **FR-033**: System MUST NOT allow voting on comments (per "No voting on comments" requirement)

#### User Profiles

- **FR-034**: System MUST provide user profile pages displaying: username, join date, comment history
- **FR-035**: System MUST make profiles publicly viewable (no private profiles in MVP)
- **FR-036**: System MUST link usernames in comments to their profile pages
- **FR-037**: System MUST display comment history in chronological order (newest first)

#### Analytics Dashboard (Admin Only)

- **FR-038**: System MUST provide an analytics dashboard accessible only to Administrator role
- **FR-039**: System MUST display aggregate metrics: total polls, total votes, active users, overall participation rate
- **FR-040**: System MUST display voting trends over selectable time ranges (e.g., 7 days, 30 days, all time)
- **FR-041**: System MUST display poll-level analytics: vote distribution, voting timeline, participation rate per poll
- **FR-042**: System MUST visualize data with charts (line charts for trends, bar/pie charts for distribution)

#### API Requirements

- **FR-043**: System MUST expose a REST API for all core operations (poll creation, voting, commenting, feed retrieval)
- **FR-044**: API MUST use JSON for request and response payloads
- **FR-045**: API MUST implement authentication via session cookies or JWT tokens (to support future Expo mobile app)
- **FR-046**: API MUST follow RESTful conventions: GET (read), POST (create), PUT/PATCH (update), DELETE (remove)
- **FR-047**: API MUST return appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- **FR-048**: API MUST implement rate limiting to prevent abuse (standard web rate limiting, e.g., 100 requests/minute per user)

### Key Entities

- **User**: Represents a registered user (voter or administrator). Attributes: unique ID, username, email, password hash, role (voter/admin), join date, profile data
- **Poll**: Represents a voting poll. Attributes: unique ID, title, link (optional), description, author (User reference), tags/categories, start date/time, duration, end date/time (calculated), voting options (2-5 custom options), creation timestamp, status (scheduled/active/closed)
- **VotingOption**: Represents one option within a poll. Attributes: unique ID, poll reference, option text/label, display order
- **Vote**: Represents a user's vote on a poll. Attributes: unique ID, user reference, poll reference, voting option reference, timestamp. Constraints: unique (user, poll) to enforce one vote per user per poll
- **Comment**: Represents a comment on a poll. Attributes: unique ID, poll reference, user reference (author), parent comment reference (null for top-level, comment ID for replies), comment text, timestamp
- **Tag/Category**: Represents a classification for polls. Attributes: unique ID, name, slug (URL-friendly), created by (admin user reference), creation timestamp. A predefined set exists at system initialization; administrators can add new tags through admin panel. Used for filtering and organization

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find and vote on a poll within 30 seconds of landing on the feed (ease of use)
- **SC-002**: System supports at least 1,000 concurrent voters without performance degradation (response time <2s)
- **SC-003**: Poll creation by administrators takes less than 3 minutes from start to publish (admin efficiency)
- **SC-004**: 80% of voters successfully submit their vote on the first attempt without errors (vote submission reliability)
- **SC-005**: Vote results update and display within 2 seconds of submission (real-time feedback)
- **SC-006**: 90% of users successfully find relevant polls using sort/filter within 1 minute (discoverability)
- **SC-007**: Participation rate (votes per poll / total users who viewed poll) exceeds 30% for active polls (engagement metric)
- **SC-008**: Comment threads support at least 5 levels of nesting without layout breaking (Reddit-style threading depth)
- **SC-009**: API response times average under 200ms for read operations (feed, poll details) and under 500ms for write operations (vote submission, poll creation)
- **SC-010**: System achieves 99.5% uptime during voting periods (reliability for live polls)
- **SC-011**: 95% of voters can navigate the entire voting flow using only keyboard (accessibility)
- **SC-012**: Analytics dashboard loads within 3 seconds and displays data for up to 1,000 polls (admin tool performance)

## Assumptions

- **A-001**: Email/password authentication is sufficient for MVP; OAuth/SSO can be added later
- **A-002**: Single tag per poll is sufficient for MVP; multi-tagging can be added later
- **A-003**: Votes are anonymous in public results but tracked by user ID for constraint enforcement
- **A-004**: Poll durations are specified in hours only (e.g., 24 hours = 1 day, 168 hours = 1 week); range from 1 to 8760 hours (365 days maximum)
- **A-005**: Soft delete is preferred for polls and comments (archived, not destroyed) to preserve data integrity
- **A-006**: Real-time updates use optimistic UI + polling or Server-Sent Events; WebSockets are out of scope for MVP
- **A-007**: Time zone handling uses user's local time zone for display, UTC for storage
- **A-008**: Rate limiting applies at user level (authenticated) and IP level (anonymous browsing)
- **A-009**: Mobile app (Expo) will be developed in future phase; web-first approach with responsive design
- **A-010**: Image uploads (for poll content) are out of scope for MVP; links to external images allowed

## Dependencies

- **D-001**: Authentication system must be operational before any user-specific features (voting, commenting, profiles)
- **D-002**: Database schema and ORM must support relationships between Users, Polls, Votes, Comments
- **D-003**: Time-based poll scheduling requires reliable background job processing or cron-like system
- **D-004**: Real-time vote updates require either polling mechanism or event-driven update system
- **D-005**: Analytics dashboard depends on vote and poll data aggregation (can be implemented after core voting is stable)

## Out of Scope (MVP)

- **OS-001**: Expo mobile application (future phase; web-first)
- **OS-002**: User registration flows (assumed to be handled by standard authentication library; all registrations create Voter role)
- **OS-002a**: Admin role promotion or management through UI (admins created via system setup only)
- **OS-003**: Password reset and email verification (standard auth features, not unique to VoteHub)
- **OS-004**: User blocking, reporting, or moderation tools beyond basic comment deletion
- **OS-005**: Poll editing after voting has started (immutable once active)
- **OS-006**: Vote change/revoke functionality (per "cannot change their vote" requirement)
- **OS-007**: Multi-tag filtering (single tag only for MVP)
- **OS-008**: Advanced analytics (demographics, cohort analysis, A/B testing)
- **OS-009**: Notifications (email, push, in-app) for poll activity
- **OS-010**: Image/media uploads for polls or comments
- **OS-011**: Poll templates or draft saving
- **OS-012**: Internationalization (English only for MVP)
