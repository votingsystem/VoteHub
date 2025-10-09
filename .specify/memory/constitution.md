<!--
═══════════════════════════════════════════════════════════════════════════════
SYNC IMPACT REPORT
═══════════════════════════════════════════════════════════════════════════════
Version: 0.0.0 → 1.0.0 (MAJOR - Initial ratification)
Date: 2025-10-09

CHANGES SUMMARY:
- Constitution created from template with VoteHub-specific principles
- All placeholder tokens replaced with concrete project values
- Eight core principles established for voting application development
- Governance structure and versioning policy defined
- Focus on Next.js 15 best practices and Reddit-style UX

PRINCIPLES ESTABLISHED:
1. Clean Modular Architecture - Component and service layer separation
2. Next.js 15 Best Practices - Server components, App Router, React 19
3. Monorepo Organization - Turborepo workspace structure
4. Component Library First - shadcn/ui integration pattern
5. Type Safety - TypeScript strict mode enforcement
6. Reddit-Style UX Consistency - Design system alignment
7. Vote Integrity - Data validation and security requirements
8. Progressive Enhancement - Accessibility and performance

TEMPLATE ALIGNMENT:
✅ plan-template.md - Constitution Check section ready
✅ spec-template.md - User story format aligns with principles
✅ tasks-template.md - Task organization supports modular architecture

FOLLOW-UP ITEMS:
- None - all placeholders resolved

═══════════════════════════════════════════════════════════════════════════════
-->

# VoteHub Constitution

## Core Principles

### I. Clean Modular Architecture

**Rule**: All business logic MUST be separated into reusable services. UI components MUST be
presentation-focused and delegate data operations to service layers. No business logic in
component files.

**Rationale**: VoteHub's voting functionality requires testable, maintainable code. Mixing
concerns creates tight coupling that prevents unit testing and code reuse across the
application.

**Requirements**:
- Service layer in `apps/web/services/` handles all data operations
- Components in `apps/web/components/` focus on rendering and user interaction
- Use custom hooks in `packages/ui/hooks/` for shared stateful logic
- Server actions in `apps/web/actions/` for mutations (Next.js 15 pattern)
- Data models/types in `apps/web/types/` or `packages/shared-types/`
- No direct database queries in components (use services or server actions)

### II. Next.js 15 Best Practices (NON-NEGOTIABLE)

**Rule**: Use Server Components by default. Client Components only when interactivity requires
client-side state, effects, or browser APIs. Server Actions for mutations. Turbopack for
development.

**Rationale**: Next.js 15 + React 19 optimize for server-first rendering. This reduces bundle
size, improves initial load times, and enables better SEO—critical for public voting content.

**Requirements**:
- Default to Server Components (no `"use client"` directive)
- Add `"use client"` only when needed: useState, useEffect, event handlers, browser APIs
- Use Server Actions for form submissions, voting operations, data mutations
- Implement streaming with Suspense boundaries for slow data fetching
- Use `loading.tsx` and `error.tsx` for route segments
- Leverage Turbopack dev server: `pnpm dev` (faster than webpack)
- Use `next/image` for all images with proper sizing and lazy loading
- Implement dynamic routes with new `generateStaticParams` for poll pages

### III. Monorepo Organization

**Rule**: Applications live in `apps/`, shared packages in `packages/`. All internal
dependencies use workspace protocol (`workspace:*`). No cross-workspace file imports outside
published package exports.

**Rationale**: Turborepo's caching and parallel execution depend on clear workspace boundaries.
Violating this structure breaks incremental builds and task orchestration.

**Requirements**:
- `apps/web/` - Next.js voting application (main deployable)
- `packages/ui/` - Shared component library (shadcn/ui components)
- `packages/typescript-config/` - Shared TypeScript configurations
- `packages/eslint-config/` - Shared linting rules
- Import via namespaces: `@workspace/ui/components/button`
- No relative imports across workspace boundaries
- Each package has single, well-defined responsibility

### IV. Component Library First

**Rule**: All UI components MUST be added via shadcn CLI to `packages/ui`. Never duplicate
components in `apps/web`. Custom components extending shadcn MUST live in `packages/ui`.

**Rationale**: VoteHub's Reddit-style interface requires consistent design system. Centralizing
components in the shared package ensures visual consistency and reduces maintenance overhead.

**Requirements**:
- Add shadcn components: `pnpm dlx shadcn@latest add <component> -c apps/web`
- Components land in `packages/ui/src/components/`
- Custom voting UI components (poll cards, vote buttons) in `packages/ui/src/components/voting/`
- Use Radix UI primitives for accessible interactions
- Theme via `next-themes` with Reddit-inspired dark/light modes
- Tailwind CSS v4 for styling (PostCSS pipeline)
- Export all components from `packages/ui` with explicit types

### V. Type Safety

**Rule**: TypeScript strict mode MUST be enabled. All vote data, poll configurations, and user
interactions MUST have explicit type definitions. No `any` types except for untyped third-party
integrations (require inline justification).

**Rationale**: Vote data integrity depends on type safety. Runtime errors in voting logic could
compromise poll results. Strong typing catches issues at compile time.

**Requirements**:
- Extend `@workspace/typescript-config` in all workspaces
- Strict mode enabled: `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`
- Define types for polls: `Poll`, `VoteOption`, `Vote`, `VoteResult`
- Zod schemas for runtime validation of vote submissions
- Use `import type` syntax for type-only imports
- Run `pnpm typecheck` before commits
- Public APIs export explicit TypeScript interfaces

### VI. Reddit-Style UX Consistency

**Rule**: All UI patterns MUST follow Reddit's information hierarchy and interaction models. Poll
cards display like Reddit posts. Vote options replace upvote/downvote. Feed layouts match Reddit
structure.

**Rationale**: Users understand Reddit's patterns. Matching this mental model reduces cognitive
load and accelerates user adoption of VoteHub.

**Requirements**:
- Card-based layout for poll feed (similar to Reddit post feed)
- Poll metadata visible: author, timestamp, vote count, comment count (if applicable)
- Maximum 4 vote options per poll (user requirement)
- Vote options displayed as selectable cards/buttons within poll card
- Use Reddit-inspired color scheme: orange accents for primary actions, blue for votes
- Compact/expanded view modes for poll cards
- Sort options: Hot, New, Top (by vote count), Trending
- Responsive design: mobile-first approach
- Dark mode as default with light mode option

### VII. Vote Integrity

**Rule**: All vote submissions MUST be validated server-side. One vote per user per poll
(enforce via session/auth). Vote changes allowed but tracked. No client-side vote count
manipulation.

**Rationale**: Voting applications require data integrity. Client-side validation alone enables
tampering. Server-side enforcement protects poll authenticity.

**Requirements**:
- Server Actions for all vote submissions (never client-side API calls with exposed endpoints)
- Validate vote payload with Zod schemas before database write
- Enforce one active vote per user per poll (database constraints + application logic)
- Track vote history if user changes vote (audit trail)
- Use optimistic UI updates with rollback on server validation failure
- Rate limiting on vote endpoints to prevent abuse
- Authentication required for voting (implement auth strategy in planning phase)
- Poll results calculated server-side, never from client state

### VIII. Progressive Enhancement

**Rule**: Core voting functionality MUST work without JavaScript. Forms submit via Server
Actions. Poll results visible on server-rendered pages. Keyboard navigation for all interactions.

**Rationale**: Accessibility is not optional for civic tools. VoteHub must serve users with
assistive technologies, slow connections, or JavaScript-disabled environments.

**Requirements**:
- Forms use `<form action={serverAction}>` pattern (native HTML submission)
- Vote buttons as radio inputs with visual styling (work without JS)
- Server-rendered poll results (JavaScript enhances with real-time updates)
- Keyboard navigation: Tab through options, Enter/Space to vote
- ARIA labels on all interactive elements
- Focus management for dynamic content (modals, notifications)
- WCAG 2.1 Level AA compliance: color contrast ≥4.5:1, text alternatives
- Screen reader testing with NVDA/JAWS
- Performance budget: First Contentful Paint <1.5s, Time to Interactive <3s

## Development Workflow

### Feature Development Process

1. **Specification**: Create spec in `.specify/specs/###-feature-name/spec.md` using template
2. **Planning**: Run `/speckit.plan` to generate implementation plan with research
3. **Task Generation**: Run `/speckit.tasks` to create actionable task list
4. **Implementation**: Execute tasks in dependency order, commit after each logical unit
5. **Testing**: Verify functionality, run type checking, linting
6. **Review**: PR with constitution compliance check, peer review, CI validation

### Branch Strategy

- **Main branch**: `master` (production-ready, always deployable)
- **Feature branches**: `###-feature-name` (### = issue number, feature-name kebab-case)
- **Commit format**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
- **PR requirements**: Passing CI (lint, typecheck, build), peer review approval

### Code Review Checklist

- [ ] Follows Clean Modular Architecture (Principle I)
- [ ] Uses Server Components by default (Principle II)
- [ ] Respects workspace boundaries (Principle III)
- [ ] Components added to packages/ui (Principle IV)
- [ ] Type safe with no `any` types (Principle V)
- [ ] Matches Reddit-style UX patterns (Principle VI)
- [ ] Vote logic validated server-side (Principle VII)
- [ ] Keyboard accessible, works without JS (Principle VIII)

## Quality Gates

### Pre-Commit

```bash
pnpm format          # Prettier formatting
pnpm lint:fix        # Auto-fix ESLint issues
pnpm typecheck       # TypeScript validation
```

### Pre-Merge (CI Enforced)

- All tests pass (when test suite implemented)
- `pnpm build` succeeds across all workspaces
- `pnpm lint` passes with zero errors
- `pnpm typecheck` passes with zero errors
- No unresolved TODO/FIXME comments in production code
- Documentation updated for API changes

### Pre-Deployment

- Integration tests pass in staging environment
- Accessibility audit passes (Lighthouse, axe DevTools)
- Performance metrics meet budgets (Core Web Vitals)
- Security scan shows no critical vulnerabilities
- Vote integrity tests pass (concurrent voting scenarios)

## Technical Constraints

### Maximum Complexity Limits

- **Vote options per poll**: Maximum 4 options (user requirement)
- **Component depth**: Maximum 5 levels of nesting (prefer flat composition)
- **Service layer**: Keep services focused (single responsibility)
- **Bundle size**: JavaScript bundles <200KB initial load
- **Database queries**: Maximum 3 queries per page load (use joins/eager loading)

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Runtime**: React 19 with Server Components
- **Language**: TypeScript 5.7+ (strict mode)
- **Styling**: Tailwind CSS v4 via PostCSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Build Tool**: Turbo (monorepo orchestration), Turbopack (dev server)
- **Package Manager**: pnpm 10.4.1
- **Validation**: Zod (runtime schema validation)

### Forbidden Patterns

- ❌ Client Components by default (must justify `"use client"`)
- ❌ Business logic in component files
- ❌ Duplicate components across apps/packages
- ❌ Direct database queries in components
- ❌ `any` types without justification comment
- ❌ Client-side vote count manipulation
- ❌ Hardcoded styles (use Tailwind classes)
- ❌ Unvalidated user input (use Zod schemas)

## Governance

### Amendment Procedure

1. **Propose**: Open issue with rationale, impact analysis, affected code areas
2. **Draft**: Update constitution file with semantic version bump
3. **Propagate**: Update affected templates (plan, spec, tasks) and CLAUDE.md
4. **Review**: Minimum 48-hour feedback period for team discussion
5. **Approve**: Requires technical lead approval
6. **Announce**: Communicate changes via team channels with migration guidance if needed

### Versioning Policy

- **MAJOR (X.0.0)**: Backward-incompatible changes (remove principle, change architecture)
- **MINOR (0.X.0)**: New principles added, expanded guidance, new quality gates
- **PATCH (0.0.X)**: Clarifications, typo fixes, non-semantic improvements

### Compliance Review

- **Planning phase**: Constitution Check gate in implementation plan (Principle validation)
- **Code review**: Reviewers verify principle adherence using checklist above
- **Quarterly audits**: Review codebase for drift, identify refactoring needs
- **Exception handling**: Document justified violations in Complexity Tracking table

### Complexity Justification

If a principle must be violated, document in implementation plan:

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Example: Client Component for entire poll feed | Real-time vote updates via WebSocket | Server polling adds 2s latency, poor UX for live results |

### Living Document

This constitution supersedes ad-hoc coding practices. When conflicts arise, constitution
principles take precedence unless explicitly amended through governance process. Reference
CLAUDE.md for implementation details that realize these principles in day-to-day development.

---

**Version**: 1.0.0 | **Ratified**: 2025-10-09 | **Last Amended**: 2025-10-09
