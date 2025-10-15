# Feature Specification: Google OAuth Exclusive Authentication

**Feature Branch**: `002-reemplazar-sistema-de`
**Created**: 2025-10-15
**Status**: Draft
**Input**: User description: "Reemplazar el sistema de autenticación actual basado en email+contraseña por un sistema de acceso exclusivamente mediante cuentas de Google (Gmail) usando OAuth"

## Clarifications

### Session 2025-10-15

- Q: What is the maximum session duration before requiring re-authentication? → A: 24 hours (standard web app, balance security/convenience)
- Q: Should the system use OAuth refresh tokens to maintain sessions without re-authentication? → A: No, rely on Google's session state only (simpler, but may require re-auth if Google token expires)
- Q: What authentication events must be logged for operational monitoring? → A: Standard: logins, logouts, failed attempts, account creation, and token expiration
- Q: How long should the system retain user data for accounts that cannot be migrated to Google OAuth? → A: 30 days (minimal grace period, prioritize data minimization)
- Q: What rate limit should apply to authentication attempts per user/IP address? → A: 10 attempts per minute (standard web app protection)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - First-time User Registration with Google (Priority: P1)

A new user discovers VoteHub and wants to create an account to participate in polls. They click "Sign in with Google," authorize VoteHub to access their basic Google profile information (name, email, profile picture), and are immediately logged into the platform ready to vote.

**Why this priority**: This is the core value proposition - eliminating registration friction. Without this working, users cannot access the platform at all.

**Independent Test**: Can be fully tested by creating a new Google account, clicking "Sign in with Google," completing OAuth authorization, and verifying the user can immediately create or vote on polls. Delivers immediate access without password creation.

**Acceptance Scenarios**:

1. **Given** a user with a valid Google account visits the login page, **When** they click "Sign in with Google" and authorize VoteHub, **Then** they are redirected to the platform with an active session and can immediately participate in polls
2. **Given** a first-time user completes Google OAuth, **When** their account is created, **Then** their profile includes their Google name, email, and profile picture
3. **Given** a user cancels the Google authorization flow, **When** they return to VoteHub, **Then** they see the login page with a clear option to retry authentication

---

### User Story 2 - Returning User Login with Google (Priority: P1)

An existing VoteHub user returns to the platform after their session expires. They click "Sign in with Google," are instantly recognized by Google's existing session, and are logged back into VoteHub within seconds without entering any credentials.

**Why this priority**: This delivers the core benefit of reduced friction for returning users and leverages Google's existing authentication state.

**Independent Test**: Can be tested by logging in once with Google, logging out of VoteHub (but staying logged into Google), then returning to VoteHub and clicking "Sign in with Google." User should be authenticated within 2-3 seconds without re-entering credentials.

**Acceptance Scenarios**:

1. **Given** a user is already logged into their Google account, **When** they click "Sign in with Google" on VoteHub, **Then** they are authenticated and redirected to the platform in under 3 seconds without entering credentials
2. **Given** a user's VoteHub session expires, **When** they return and sign in with Google again, **Then** their previous data (created polls, votes, comments) is preserved and accessible
3. **Given** a user is logged out of both Google and VoteHub, **When** they click "Sign in with Google," **Then** they are prompted to sign into Google first, then automatically redirected back to VoteHub after successful Google authentication

---

### User Story 3 - User Account Linking and Migration (Priority: P2)

An existing VoteHub user with an email+password account visits the platform after the OAuth migration. They see a notice explaining the change and are prompted to link their account by signing in with the Google account matching their existing email. After successful linking, they can access all their previous data using only Google sign-in going forward.

**Why this priority**: This prevents data loss and user frustration for existing users, but it's secondary to enabling new user flows. The platform can function with new users only while migration happens in parallel.

**Independent Test**: Can be tested by creating a legacy email+password account, implementing the migration flow, then signing in with the matching Google account and verifying all previous polls, votes, and comments are preserved. Delivers continuity for existing users.

**Acceptance Scenarios**:

1. **Given** an existing user with email "user@gmail.com" has a password-based account, **When** they sign in with their Google account using "user@gmail.com," **Then** their accounts are automatically linked and they access all their historical data
2. **Given** a user signs in with a Google account that doesn't match any existing email, **When** authentication completes, **Then** a new account is created rather than linking to existing data
3. **Given** a user with an existing account uses a non-Gmail Google account (e.g., custom domain via Google Workspace), **When** they attempt to link their account, **Then** the system recognizes the Google-authenticated email and links appropriately

---

### User Story 4 - Profile Management with Google Data (Priority: P3)

A logged-in user wants to view or update their profile information. They navigate to their profile page and see their name, email, and profile picture populated from their Google account. They can update optional fields (bio, preferences) but understand that core identity data (name, email, photo) is synchronized from Google.

**Why this priority**: This enhances user experience but isn't critical for core functionality. Users can participate in polls without ever visiting their profile page.

**Independent Test**: Can be tested by signing in with Google, navigating to the profile page, verifying Google data is displayed correctly, changing the profile picture in Google, then re-authenticating and confirming the update is reflected in VoteHub. Delivers improved profile accuracy.

**Acceptance Scenarios**:

1. **Given** a user is logged in via Google, **When** they view their profile, **Then** they see their Google name, email, and profile picture displayed
2. **Given** a user updates their Google profile picture, **When** they sign in to VoteHub again, **Then** their profile picture is updated to match their current Google profile
3. **Given** a user wants to change their display name, **When** they attempt to edit their profile, **Then** they see their Google name is read-only and cannot be edited within VoteHub

---

### User Story 5 - Session Management and Security (Priority: P2)

A user signs into VoteHub on a public computer, participates in polls, then clicks "Sign out." Their VoteHub session is terminated immediately. If they navigate back to VoteHub without signing in again, they cannot access authenticated features until re-authenticating with Google.

**Why this priority**: This is critical for security and user trust, especially given the elimination of password-based controls. However, it doesn't block basic feature functionality.

**Independent Test**: Can be tested by signing in, performing authenticated actions (voting, commenting), signing out, then attempting to access protected pages and verifying they require re-authentication. Delivers expected security behavior.

**Acceptance Scenarios**:

1. **Given** a user is signed in, **When** they click "Sign out," **Then** their VoteHub session is immediately terminated and they are redirected to the login page
2. **Given** a user's session is terminated, **When** they attempt to vote or comment, **Then** they are prompted to sign in with Google before proceeding
3. **Given** a user is signed in on multiple devices, **When** they sign out on one device, **Then** only the current device session is terminated while sessions on other devices remain active

---

### Edge Cases

- What happens when a user denies VoteHub access to their Google profile during OAuth authorization?
  - User remains on login page with clear error message explaining that Google authorization is required to use VoteHub
  - User can retry the authorization flow

- What happens when a user's Google account is deleted or suspended after creating a VoteHub account?
  - User cannot sign in until their Google account is restored
  - Existing VoteHub data remains in the system but is inaccessible until authentication is restored

- What happens when Google OAuth service is temporarily unavailable?
  - Users see a clear error message indicating authentication is temporarily unavailable
  - System displays estimated recovery time if available
  - No data loss occurs; users can retry when service is restored

- What happens when a user tries to sign in with a Google account from a restricted domain (e.g., corporate policy blocking OAuth apps)?
  - System displays error message explaining the restriction
  - User is advised to contact their Google Workspace administrator or use a personal Google account

- What happens when a user has an existing email+password account with a non-Gmail address (e.g., user@yahoo.com)?
  - User must sign in with a Google account to access VoteHub
  - If the Google account email does not match any existing VoteHub account email, a new account is created
  - Unmigrated accounts and their data are retained for 30 days after OAuth deployment, then permanently deleted

- What happens when network connectivity is lost during the OAuth redirect flow?
  - User sees browser error and can retry by clicking "Sign in with Google" again
  - No partial account creation occurs; process is atomic

- What happens when two users attempt to create accounts with the same Google account simultaneously?
  - System prevents duplicate account creation via database constraints
  - Second request either waits for first to complete or receives error and can retry

- What happens when a user exceeds the authentication rate limit?
  - User receives a clear error message indicating too many authentication attempts
  - User must wait until the rate limit window resets (1 minute) before retrying
  - Rate limit applies per IP address at 10 attempts per minute

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST authenticate users exclusively via Google OAuth 2.0 authorization flow
- **FR-002**: System MUST request only essential Google profile scopes: email, profile (name), and profile picture
- **FR-003**: System MUST automatically create a new VoteHub account when a user signs in with a Google account for the first time
- **FR-004**: System MUST populate new user accounts with name, email, and profile picture from Google profile data
- **FR-005**: System MUST maintain user sessions after successful Google authentication with a maximum duration of 24 hours
- **FR-006**: System MUST provide a "Sign out" function that terminates the user's VoteHub session
- **FR-007**: System MUST redirect unauthenticated users to the Google sign-in flow when accessing protected resources
- **FR-008**: System MUST link existing email+password accounts to Google accounts when the email addresses match
- **FR-009**: System MUST preserve all user data (polls, votes, comments) during account migration from email+password to Google OAuth
- **FR-010**: System MUST remove all password storage and password-related functionality (password reset, password change, etc.)
- **FR-011**: System MUST handle OAuth errors gracefully and provide clear user-facing error messages
- **FR-012**: System MUST prevent duplicate account creation when the same Google account is used multiple times
- **FR-013**: System MUST synchronize user profile pictures from Google on each sign-in
- **FR-014**: System MUST display "Sign in with Google" as the only authentication option on all login and registration pages
- **FR-015**: System MUST securely store and validate OAuth access tokens according to OAuth 2.0 best practices without using refresh tokens
- **FR-016**: System MUST log authentication events including successful logins, logouts, failed authentication attempts, new account creation, and session token expiration for security monitoring and operational debugging
- **FR-017**: System MUST retain user data for unmigrated accounts (email+password accounts that cannot be linked to Google OAuth) for 30 days after the OAuth migration deployment, then permanently delete such orphaned accounts and their associated data
- **FR-018**: System MUST enforce rate limiting of 10 authentication attempts per minute per IP address to prevent abuse and protect against credential stuffing or denial-of-service attacks

### Key Entities

- **User Account**: Represents a VoteHub user authenticated via Google OAuth
  - Core identity: Google account ID (unique identifier), email, name, profile picture URL
  - Additional data: account creation date, last sign-in date, role (ADMIN/VOTER)
  - Relationships: owns polls, votes, comments (preserved from existing schema)

- **Authentication Session**: Represents an active user session after Google OAuth
  - Attributes: session token, user reference, creation timestamp, expiration timestamp
  - Duration: 24 hours maximum before requiring re-authentication
  - Lifecycle: created on successful OAuth, terminated on sign-out or 24-hour expiration

- **OAuth Token**: Securely stored Google OAuth tokens for session management
  - Attributes: access token, token expiration, associated user
  - Strategy: No refresh tokens; relies on Google's session state for re-authentication
  - Usage: validates session, fetches Google profile data on sign-in

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: New users can complete account creation and reach the main platform in under 30 seconds (compared to 2-3 minutes with email+password+verification)
- **SC-002**: Returning users can sign in and access their account in under 5 seconds when already logged into Google
- **SC-003**: Account creation completion rate increases by at least 40% (fewer abandoned registrations)
- **SC-004**: Password reset support requests are eliminated entirely (zero password-related tickets after migration)
- **SC-005**: User authentication errors decrease by at least 60% (eliminating forgotten passwords, typos, verification failures)
- **SC-006**: 95% of existing users successfully migrate their accounts within the first 30 days of deployment
- **SC-007**: System maintains 99.9% authentication availability (dependent on Google OAuth uptime)
- **SC-008**: Zero security incidents related to password storage or password-based attacks after migration
- **SC-009**: User satisfaction with sign-in experience improves by at least 30% (measured via post-authentication survey or NPS)
- **SC-010**: Time-to-first-vote for new users decreases by at least 50%

## Assumptions _(optional)_

- Users have access to a Google account (personal Gmail or Google Workspace)
- Users are comfortable authorizing VoteHub to access their basic Google profile information
- Google OAuth service maintains high availability (99.9%+ uptime)
- VoteHub already has a process for creating Google Cloud Console project and obtaining OAuth 2.0 credentials
- Existing users will receive advance notice of the authentication system change (via email, in-app banner, etc.)
- The majority of existing users (80%) use Gmail addresses and can easily link their accounts
- Users accessing VoteHub from restricted networks (corporate firewalls blocking OAuth) is an acceptable edge case with no special accommodation
- Profile data from Google (name, email, picture) is sufficient for VoteHub's user identity needs
- Browser cookie-based session management is acceptable (users with cookies disabled is an acceptable edge case)

## Dependencies _(optional)_

- Google OAuth 2.0 API availability and stability
- Google Cloud Console project setup with OAuth 2.0 credentials (client ID and client secret)
- Valid domain verification in Google Cloud Console for OAuth consent screen
- SSL/TLS certificate for VoteHub domain (required for secure OAuth redirects)
- User communication channel to notify existing users of authentication system changes

## Out of Scope _(optional)_

- Support for authentication via other OAuth providers (Facebook, GitHub, Microsoft, etc.)
- Support for email+password authentication (being completely removed)
- Support for passwordless email magic links
- Support for multi-factor authentication beyond what Google provides natively
- Admin panel for manually migrating user accounts (migration is automatic based on email matching)
- Ability for users to disconnect their Google account and use alternative authentication
- Custom email verification flows (handled by Google)
- Account recovery flows independent of Google (if user loses Google account access, they lose VoteHub access)
- Profile data synchronization beyond initial sign-in (one-way sync from Google on each login only)

## Open Questions _(optional)_

_This section will be populated during the clarification phase if needed._
