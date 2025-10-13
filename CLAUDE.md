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
