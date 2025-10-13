# API Contracts: VoteHub Core Platform

**Date**: 2025-10-09
**Feature**: VoteHub Core Platform
**Branch**: `001-votehub-core-platform`

## Overview

VoteHub exposes a REST API via Next.js Server Actions and API routes. This document defines all endpoints, request/response schemas, authentication requirements, and error handling patterns.

**Implementation Pattern**: Primary mutations handled by Server Actions (progressive enhancement), read operations can use both Server Components and API routes for future mobile app support.

---

## Authentication

All authenticated endpoints require a valid session cookie from BetterAuth.

**Session Management**:

- Login: `POST /api/auth/login`
- Register: `POST /api/auth/register`
- Logout: `POST /api/auth/logout`
- Session check: `GET /api/auth/session`

**Authorization**:

- **Admin-only endpoints**: Check `session.user.role === 'ADMIN'`
- **Authenticated endpoints**: Check `session !== null`
- **Public endpoints**: No auth required (feed, poll details, vote results, comments)

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": {
    "code": "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT" | "INTERNAL_ERROR",
    "message": "Human-readable error description",
    "details": {} // Optional additional context
  }
}
```

**HTTP Status Codes**:

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Duplicate vote, constraint violation
- `500 Internal Server Error`: Unexpected server error

---

## Endpoints Summary

| Method                     | Endpoint                        | Auth     | Role         | Description                        |
| -------------------------- | ------------------------------- | -------- | ------------ | ---------------------------------- |
| **Polls**                  |
| GET                        | `/api/polls`                    | Optional | Any          | List polls with filters/sort       |
| POST                       | `/api/polls`                    | Required | Admin        | Create new poll                    |
| GET                        | `/api/polls/:id`                | Optional | Any          | Get poll details + vote results    |
| PATCH                      | `/api/polls/:id`                | Required | Admin        | Update poll (before voting starts) |
| DELETE                     | `/api/polls/:id`                | Required | Admin        | Delete poll (only if no votes)     |
| POST                       | `/api/polls/:id/unpublish`      | Required | Admin        | Unpublish/close poll               |
| **Voting**                 |
| POST                       | `/api/polls/:id/vote`           | Required | Any          | Submit vote                        |
| GET                        | `/api/polls/:id/results`        | Optional | Any          | Get vote results                   |
| GET                        | `/api/polls/:id/my-vote`        | Required | Any          | Get user's vote on poll            |
| **Comments**               |
| GET                        | `/api/polls/:id/comments`       | Optional | Any          | Get poll comments (threaded)       |
| POST                       | `/api/comments`                 | Required | Any          | Add comment/reply                  |
| DELETE                     | `/api/comments/:id`             | Required | Author/Admin | Delete comment                     |
| **Tags**                   |
| GET                        | `/api/tags`                     | Optional | Any          | List all tags                      |
| POST                       | `/api/tags`                     | Required | Admin        | Create new tag                     |
| **Users**                  |
| GET                        | `/api/users/:username`          | Optional | Any          | Get user profile                   |
| GET                        | `/api/users/:username/comments` | Optional | Any          | Get user's comment history         |
| **Analytics** (Admin only) |
| GET                        | `/api/analytics/overview`       | Required | Admin        | Aggregate stats                    |
| GET                        | `/api/analytics/polls/:id`      | Required | Admin        | Poll-level analytics               |
| GET                        | `/api/analytics/trends`         | Required | Admin        | Voting trends over time            |

---

## Detailed Endpoint Specifications

### Poll Endpoints

#### `GET /api/polls` - List Polls

**Description**: Retrieve paginated list of polls with optional filtering and sorting.

**Authentication**: Optional (public endpoint)

**Query Parameters**:

```typescript
{
  cursor?: string         // Pagination cursor (poll ID)
  limit?: number          // Results per page (default: 20, max: 100)
  sort?: "newest" | "most-voted" | "trending" // Default: newest
  tag?: string            // Filter by tag slug
  status?: "scheduled" | "active" | "closed" // Default: active
}
```

**Response** (`200 OK`):

```json
{
  "polls": [
    {
      "id": "cm123abc",
      "title": "Should AI development be regulated?",
      "description": "As AI technology advances...",
      "link": "https://example.com/article",
      "author": {
        "id": "user123",
        "username": "admin"
      },
      "tag": {
        "id": "tag123",
        "name": "Technology",
        "slug": "technology"
      },
      "startAt": "2025-10-09T10:00:00Z",
      "endAt": "2025-10-16T10:00:00Z",
      "status": "active",
      "voteCount": 42,
      "commentCount": 5,
      "createdAt": "2025-10-09T09:00:00Z"
    }
  ],
  "pagination": {
    "nextCursor": "cm456def", // Null if no more results
    "hasMore": true
  }
}
```

**Example Usage**:

```bash
# Get newest polls
GET /api/polls?sort=newest&limit=20

# Filter by tag
GET /api/polls?tag=technology&sort=trending

# Pagination
GET /api/polls?cursor=cm456def&limit=20
```

---

#### `POST /api/polls` - Create Poll

**Description**: Create a new poll (admin only).

**Authentication**: Required
**Authorization**: Admin role only

**Request Body**:

```json
{
  "title": "Should AI development be regulated?",
  "description": "As AI technology advances rapidly, there is debate about government oversight and safety measures.",
  "link": "https://example.com/ai-regulation-article", // Optional
  "tagId": "cm123tag",
  "startAt": "2025-10-10T10:00:00Z", // ISO 8601 format
  "durationHours": 168, // 1-8760 hours
  "options": [
    { "label": "Strongly regulate" },
    { "label": "Light regulation" },
    { "label": "Self-regulation only" },
    { "label": "No regulation" }
  ]
}
```

**Validation**:

- `title`: 5-200 characters
- `description`: 10-5000 characters
- `link`: Valid URL or empty
- `startAt`: Must be now or in future
- `durationHours`: 1-8760 (1 hour to 365 days)
- `options`: 2-5 items, each label 1-100 characters

**Response** (`201 Created`):

```json
{
  "poll": {
    "id": "cm789poll",
    "title": "Should AI development be regulated?",
    "description": "...",
    "link": "...",
    "author": { "id": "...", "username": "admin" },
    "tag": { "id": "...", "name": "Technology", "slug": "technology" },
    "startAt": "2025-10-10T10:00:00Z",
    "endAt": "2025-10-17T10:00:00Z", // Computed: startAt + durationHours
    "status": "scheduled",
    "options": [
      { "id": "opt1", "label": "Strongly regulate", "order": 0 },
      { "id": "opt2", "label": "Light regulation", "order": 1 },
      { "id": "opt3", "label": "Self-regulation only", "order": 2 },
      { "id": "opt4", "label": "No regulation", "order": 3 }
    ],
    "createdAt": "2025-10-09T12:00:00Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not logged in
- `403 Forbidden`: Not an admin
- `400 Bad Request`: Validation failed (invalid duration, too many options, etc.)

---

#### `GET /api/polls/:id` - Get Poll Details

**Description**: Retrieve detailed poll information including vote results.

**Authentication**: Optional (public endpoint)

**Response** (`200 OK`):

```json
{
  "poll": {
    "id": "cm789poll",
    "title": "Should AI development be regulated?",
    "description": "...",
    "link": "...",
    "author": { "id": "...", "username": "admin" },
    "tag": { "id": "...", "name": "Technology", "slug": "technology" },
    "startAt": "2025-10-10T10:00:00Z",
    "endAt": "2025-10-17T10:00:00Z",
    "status": "active",
    "options": [
      {
        "id": "opt1",
        "label": "Strongly regulate",
        "voteCount": 15,
        "percentage": 35.7
      },
      {
        "id": "opt2",
        "label": "Light regulation",
        "voteCount": 18,
        "percentage": 42.9
      },
      {
        "id": "opt3",
        "label": "Self-regulation only",
        "voteCount": 6,
        "percentage": 14.3
      },
      {
        "id": "opt4",
        "label": "No regulation",
        "voteCount": 3,
        "percentage": 7.1
      }
    ],
    "totalVotes": 42,
    "commentCount": 5,
    "createdAt": "2025-10-09T12:00:00Z",
    "userVote": { "optionId": "opt2" } // Present if user is authenticated and has voted
  }
}
```

**Error Responses**:

- `404 Not Found`: Poll doesn't exist

---

#### `PATCH /api/polls/:id` - Update Poll

**Description**: Update poll details (only allowed before voting starts).

**Authentication**: Required
**Authorization**: Admin role only

**Request Body** (all fields optional):

```json
{
  "title": "Updated poll title",
  "description": "Updated description",
  "link": "https://example.com/updated",
  "tagId": "cm456tag",
  "startAt": "2025-10-11T10:00:00Z",
  "durationHours": 240
}
```

**Response** (`200 OK`):

```json
{
  "poll": {
    /* Updated poll object */
  }
}
```

**Error Responses**:

- `400 Bad Request`: Poll already has votes (immutable)
- `403 Forbidden`: Not an admin or not poll author
- `404 Not Found`: Poll doesn't exist

---

#### `DELETE /api/polls/:id` - Delete Poll

**Description**: Permanently delete poll (only if no votes exist).

**Authentication**: Required
**Authorization**: Admin role only

**Response** (`200 OK`):

```json
{
  "message": "Poll deleted successfully"
}
```

**Error Responses**:

- `409 Conflict`: Poll has votes (cannot delete, use unpublish instead)
- `403 Forbidden`: Not an admin
- `404 Not Found`: Poll doesn't exist

---

#### `POST /api/polls/:id/unpublish` - Unpublish/Close Poll

**Description**: Manually close poll and hide from feed (preserves data).

**Authentication**: Required
**Authorization**: Admin role only

**Response** (`200 OK`):

```json
{
  "poll": {
    "id": "cm789poll",
    "status": "closed"
    // ... other fields
  }
}
```

---

### Voting Endpoints

#### `POST /api/polls/:id/vote` - Submit Vote

**Description**: Cast a vote on a poll.

**Authentication**: Required

**Request Body**:

```json
{
  "optionId": "opt2"
}
```

**Response** (`201 Created`):

```json
{
  "vote": {
    "id": "cm123vote",
    "pollId": "cm789poll",
    "optionId": "opt2",
    "createdAt": "2025-10-09T14:30:00Z"
  },
  "results": {
    "options": [
      { "id": "opt1", "voteCount": 15, "percentage": 35.7 },
      { "id": "opt2", "voteCount": 19, "percentage": 45.2 },
      { "id": "opt3", "voteCount": 6, "percentage": 14.3 },
      { "id": "opt4", "voteCount": 3, "percentage": 7.1 }
    ],
    "totalVotes": 43
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not logged in
- `400 Bad Request`: Invalid optionId or poll not active
- `409 Conflict`: User has already voted on this poll
- `404 Not Found`: Poll or option doesn't exist

**Business Rules Enforced**:

- Poll must be in ACTIVE status (between startAt and endAt)
- User can only vote once per poll (database constraint)
- Vote cannot be changed after submission

---

#### `GET /api/polls/:id/results` - Get Vote Results

**Description**: Retrieve vote distribution and statistics.

**Authentication**: Optional (public endpoint)

**Response** (`200 OK`):

```json
{
  "pollId": "cm789poll",
  "totalVotes": 42,
  "options": [
    {
      "id": "opt1",
      "label": "Strongly regulate",
      "voteCount": 15,
      "percentage": 35.7
    },
    {
      "id": "opt2",
      "label": "Light regulation",
      "voteCount": 18,
      "percentage": 42.9
    },
    {
      "id": "opt3",
      "label": "Self-regulation only",
      "voteCount": 6,
      "percentage": 14.3
    },
    {
      "id": "opt4",
      "label": "No regulation",
      "voteCount": 3,
      "percentage": 7.1
    }
  ]
}
```

---

#### `GET /api/polls/:id/my-vote` - Get User's Vote

**Description**: Check if authenticated user has voted and retrieve their choice.

**Authentication**: Required

**Response** (`200 OK` if voted):

```json
{
  "vote": {
    "optionId": "opt2",
    "createdAt": "2025-10-09T14:30:00Z"
  }
}
```

**Response** (`200 OK` if not voted):

```json
{
  "vote": null
}
```

---

### Comment Endpoints

#### `GET /api/polls/:id/comments` - Get Comments

**Description**: Retrieve threaded comments for a poll.

**Authentication**: Optional (public endpoint)

**Query Parameters**:

```typescript
{
  sort?: "newest" | "most-active" // Default: newest
  limit?: number // Default: 50
}
```

**Response** (`200 OK`):

```json
{
  "comments": [
    {
      "id": "cm123comment",
      "text": "This is a top-level comment",
      "author": {
        "id": "user123",
        "username": "voter1"
      },
      "createdAt": "2025-10-09T15:00:00Z",
      "replies": [
        {
          "id": "cm456reply",
          "text": "This is a nested reply",
          "author": { "id": "user456", "username": "voter2" },
          "createdAt": "2025-10-09T15:30:00Z",
          "replies": []
        }
      ]
    }
  ]
}
```

**Note**: Nested replies limited to 5 levels deep.

---

#### `POST /api/comments` - Add Comment

**Description**: Post a top-level comment or reply to existing comment.

**Authentication**: Required

**Request Body**:

```json
{
  "pollId": "cm789poll",
  "text": "This is my comment on the poll",
  "parentId": "cm123comment" // Optional, null for top-level
}
```

**Validation**:

- `text`: 1-5000 characters
- `parentId`: Must exist if provided

**Response** (`201 Created`):

```json
{
  "comment": {
    "id": "cm789comment",
    "text": "This is my comment on the poll",
    "author": { "id": "user123", "username": "voter1" },
    "pollId": "cm789poll",
    "parentId": null,
    "createdAt": "2025-10-09T16:00:00Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not logged in
- `400 Bad Request`: Text too long or empty
- `404 Not Found`: Poll or parent comment doesn't exist

---

#### `DELETE /api/comments/:id` - Delete Comment

**Description**: Delete a comment (author or admin only).

**Authentication**: Required
**Authorization**: Comment author or Admin

**Response** (`200 OK`):

```json
{
  "message": "Comment deleted successfully"
}
```

**Error Responses**:

- `403 Forbidden`: Not comment author or admin
- `404 Not Found`: Comment doesn't exist

**Note**: Deleting a parent comment cascades to all replies.

---

### Tag Endpoints

#### `GET /api/tags` - List Tags

**Description**: Retrieve all available tags.

**Authentication**: Optional (public endpoint)

**Response** (`200 OK`):

```json
{
  "tags": [
    {
      "id": "cm123tag",
      "name": "Technology",
      "slug": "technology",
      "pollCount": 42
    },
    {
      "id": "cm456tag",
      "name": "Politics",
      "slug": "politics",
      "pollCount": 38
    }
  ]
}
```

---

#### `POST /api/tags` - Create Tag

**Description**: Create a new tag (admin only).

**Authentication**: Required
**Authorization**: Admin role only

**Request Body**:

```json
{
  "name": "Climate Change"
}
```

**Validation**:

- `name`: 2-50 characters, unique

**Response** (`201 Created`):

```json
{
  "tag": {
    "id": "cm789tag",
    "name": "Climate Change",
    "slug": "climate-change", // Auto-generated from name
    "createdBy": "admin123",
    "createdAt": "2025-10-09T17:00:00Z"
  }
}
```

**Error Responses**:

- `403 Forbidden`: Not an admin
- `409 Conflict`: Tag name/slug already exists

---

### User Endpoints

#### `GET /api/users/:username` - Get User Profile

**Description**: Retrieve user profile information.

**Authentication**: Optional (public endpoint)

**Response** (`200 OK`):

```json
{
  "user": {
    "id": "user123",
    "username": "voter1",
    "role": "voter",
    "joinedAt": "2025-09-01T10:00:00Z",
    "stats": {
      "commentCount": 15,
      "voteCount": 42 // Hidden in public profiles (user privacy)
    }
  }
}
```

**Error Responses**:

- `404 Not Found`: User doesn't exist

---

#### `GET /api/users/:username/comments` - Get User Comments

**Description**: Retrieve user's comment history.

**Authentication**: Optional (public endpoint)

**Query Parameters**:

```typescript
{
  limit?: number // Default: 20
  cursor?: string // Pagination cursor
}
```

**Response** (`200 OK`):

```json
{
  "comments": [
    {
      "id": "cm123comment",
      "text": "This is a comment",
      "poll": {
        "id": "cm789poll",
        "title": "Poll title"
      },
      "createdAt": "2025-10-09T15:00:00Z"
    }
  ],
  "pagination": {
    "nextCursor": "cm456comment",
    "hasMore": true
  }
}
```

---

### Analytics Endpoints (Admin Only)

#### `GET /api/analytics/overview` - Aggregate Statistics

**Description**: Platform-wide analytics dashboard.

**Authentication**: Required
**Authorization**: Admin role only

**Response** (`200 OK`):

```json
{
  "overview": {
    "totalPolls": 150,
    "activePolls": 42,
    "totalVotes": 5420,
    "totalUsers": 1250,
    "overallParticipationRate": 34.2
  },
  "trends": {
    "pollsCreatedLast7Days": 8,
    "votesLast7Days": 320,
    "newUsersLast7Days": 45
  }
}
```

---

#### `GET /api/analytics/polls/:id` - Poll-Level Analytics

**Description**: Detailed analytics for a specific poll.

**Authentication**: Required
**Authorization**: Admin role only

**Response** (`200 OK`):

```json
{
  "poll": {
    "id": "cm789poll",
    "title": "Poll title",
    "totalVotes": 42,
    "participationRate": 28.5,
    "voteDistribution": [
      { "option": "Strongly regulate", "count": 15, "percentage": 35.7 },
      { "option": "Light regulation", "count": 18, "percentage": 42.9 },
      { "option": "Self-regulation only", "count": 6, "percentage": 14.3 },
      { "option": "No regulation", "count": 3, "percentage": 7.1 }
    ],
    "votingTimeline": [
      { "date": "2025-10-10", "cumulativeVotes": 5 },
      { "date": "2025-10-11", "cumulativeVotes": 18 },
      { "date": "2025-10-12", "cumulativeVotes": 35 },
      { "date": "2025-10-13", "cumulativeVotes": 42 }
    ]
  }
}
```

---

#### `GET /api/analytics/trends` - Voting Trends

**Description**: Time-series voting activity.

**Authentication**: Required
**Authorization**: Admin role only

**Query Parameters**:

```typescript
{
  range?: "7d" | "30d" | "all" // Default: 30d
}
```

**Response** (`200 OK`):

```json
{
  "trends": {
    "dailyVotes": [
      { "date": "2025-10-01", "votes": 45 },
      { "date": "2025-10-02", "votes": 62 }
      // ... more days
    ],
    "topPolls": [
      {
        "id": "cm789poll",
        "title": "Poll title",
        "voteCount": 120,
        "participationRate": 42.5
      }
    ]
  }
}
```

---

## Rate Limiting

**Policy**: 100 requests per minute per authenticated user, 20 requests per minute per IP for anonymous users.

**Headers**:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696877400
```

**Error Response** (`429 Too Many Requests`):

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds."
  }
}
```

---

## Caching Strategy

- **Poll feed**: Cache for 30 seconds (revalidate on new poll creation)
- **Poll details**: Cache for 10 seconds (revalidate on vote submission)
- **Vote results**: Cache for 30 seconds
- **Tags list**: Cache for 5 minutes (revalidate on tag creation)
- **User profiles**: Cache for 1 minute
- **Analytics**: No caching (always fresh data for admins)

**Cache Headers**:

```
Cache-Control: public, s-maxage=30, stale-while-revalidate=60
```

---

## Summary

This API contract supports all VoteHub functional requirements:

- ✅ Poll CRUD operations (admin only for create/edit)
- ✅ Voting system with integrity enforcement
- ✅ Threaded comment system
- ✅ Tag-based filtering
- ✅ User profiles and activity tracking
- ✅ Admin analytics dashboard
- ✅ Progressive enhancement (Server Actions for mutations)
- ✅ Future mobile app support (REST API available)

**Implementation**: Server Actions handle mutations from web UI, REST endpoints support both web and future mobile clients.

**Next Phase**: Generate quickstart.md for developer onboarding.
