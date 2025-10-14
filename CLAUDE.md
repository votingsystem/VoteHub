# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoteHub is a **Turborepo monorepo** built with:

- **Next.js 15** (React 19) - main web application in `apps/web`
- **shadcn/ui** - shared UI component library in `packages/ui`
- **pnpm** workspaces for package management
- **Turbo** for build orchestration and caching

## Development Commands

### At monorepo root:

```bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps and packages
pnpm lint             # Lint all packages
pnpm format           # Format with Prettier
```

### Web app (`apps/web`):

```bash
cd apps/web
pnpm dev              # Start Next.js dev server with Turbopack
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm lint:fix         # Auto-fix linting issues
pnpm typecheck        # Type check without emitting
```

### UI package (`packages/ui`):

```bash
cd packages/ui
pnpm lint             # Lint UI components
```

## Architecture

### Monorepo Structure

- **`apps/web/`** - Next.js application (App Router)
- **`packages/ui/`** - Shared React component library using shadcn/ui
- **`packages/typescript-config/`** - Shared TypeScript configs
- **`packages/eslint-config/`** - Shared ESLint configs

### UI Package (`@workspace/ui`)

The UI package is a **component library** that exports:

- **Components**: `@workspace/ui/components/*` (e.g., `@workspace/ui/components/button`)
- **Styles**: `@workspace/ui/globals.css` - imported in app layout
- **Utilities**: `@workspace/ui/lib/*` (e.g., `cn()` utility for class merging)
- **Hooks**: `@workspace/ui/hooks/*`

Components are built with:

- Radix UI primitives
- Tailwind CSS v4 (using `@tailwindcss/postcss`)
- class-variance-authority for variant management
- next-themes for theme support

### Adding shadcn/ui Components

Run from the **monorepo root**:

```bash
pnpm dlx shadcn@latest add <component-name> -c apps/web
```

This places components in `packages/ui/src/components/` for use across the monorepo.

### Theme System

- Theme provider configured in `apps/web/components/providers.tsx`
- Supports system/light/dark themes via next-themes
- Global styles in `packages/ui/src/styles/globals.css`

## Package Management

- **Package manager**: pnpm@10.4.1
- **Node version**: >=20
- Workspace packages referenced with `workspace:*` protocol
- Internal packages use `@workspace/*` namespace

## Build System

Turbo manages build pipeline with:

- **Build task**: Depends on upstream package builds (`^build`)
- **Dev task**: Persistent, no caching
- **Lint task**: Depends on upstream lints
- Outputs cached in `.next/` (excluding cache directory)

## Application Architecture

### Authentication

- **BetterAuth** - Configured in `apps/web/lib/auth.ts`
- Email/password authentication
- Session management with role-based access (ADMIN/VOTER)
- Auth Server Actions in `apps/web/actions/auth-actions.ts`
- Protected routes using layout-level auth checks

### Database

- **Prisma ORM** with PostgreSQL
- Schema: `apps/web/prisma/schema.prisma`
- Entities: User, Poll, VotingOption, Vote, Comment, Tag, Session
- Client singleton: `apps/web/lib/prisma.ts`

### Data Flow Pattern

1. **Server Components** fetch data directly from services
2. **Services** (`apps/web/services/`) handle business logic and database queries
3. **Server Actions** (`apps/web/actions/`) handle mutations with validation
4. **Client Components** use Server Actions via forms or `useTransition`

### Custom Voting Components

Located in `packages/ui/src/components/voting/`:

- **PollCard** - Displays poll summary with status badge
- **VoteOptions** - Interactive voting form with optimistic UI
- **VoteResults** - Horizontal bar chart showing vote percentages
- **CommentThread** - Recursive threaded comments (Phase 6)

### Validation

- **Zod schemas** in `apps/web/lib/validations.ts`
- Server-side validation in Server Actions
- Type-safe validation with TypeScript

### Error Handling

- **404**: `not-found.tsx` files for missing resources
- **401/403**: Layout-level redirects for unauthorized access
- **409**: Duplicate vote prevention with unique constraints
- **Error boundaries**: `error.tsx` files for runtime errors

### Loading States

- Next.js `loading.tsx` files for route-level loading
- Skeleton UIs matching page layouts
- Automatic Suspense boundaries

### Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support with focus indicators
- Semantic HTML with proper ARIA roles
- WCAG 2.1 AA compliant color contrast
