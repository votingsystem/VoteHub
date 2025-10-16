# VoteHub

A Reddit-style voting platform built with Next.js 15, React 19, and Google OAuth authentication.

## Features

- 🔐 Google OAuth exclusive authentication (no passwords!)
- 🗳️ Create and vote on polls
- 💬 Threaded comments
- 🏷️ Tag-based categorization
- 👤 User profiles with Google data sync
- 📊 Real-time vote results

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Authentication**: BetterAuth with Google OAuth
- **Database**: PostgreSQL with Prisma ORM
- **UI**: shadcn/ui component library
- **Styling**: Tailwind CSS v4
- **Monorepo**: Turborepo with pnpm workspaces

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL database
- Google OAuth credentials

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd VoteHub
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` with your credentials:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/votehub"
AUTH_SECRET="your-secret-key-here"
AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
OAUTH_DEPLOYMENT_DATE="2025-10-16T00:00:00Z"
CRON_SECRET="your-cron-secret"
```

4. Set up the database:
```bash
cd apps/web
npx prisma db push
```

5. Start the development server:
```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## Authentication Setup

VoteHub uses **Google OAuth as the exclusive authentication method**. See detailed setup instructions:

- **Complete Setup Guide**: [specs/002-reemplazar-sistema-de/readme-auth-config.md](specs/002-reemplazar-sistema-de/readme-auth-config.md)
- **Quick Start Guide**: [specs/002-reemplazar-sistema-de/quickstart.md](specs/002-reemplazar-sistema-de/quickstart.md)
- **OAuth Flow Documentation**: [specs/002-reemplazar-sistema-de/contracts/oauth-flow.md](specs/002-reemplazar-sistema-de/contracts/oauth-flow.md)

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `AUTH_SECRET` | BetterAuth secret key (32+ chars) | ✅ Yes |
| `AUTH_URL` | Application base URL | ✅ Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | ✅ Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | ✅ Yes |
| `OAUTH_DEPLOYMENT_DATE` | Date OAuth was deployed (ISO 8601) | ✅ Yes |
| `CRON_SECRET` | Secret for cron job authorization | Production only |

## Development

### Monorepo Structure

```
VoteHub/
├── apps/
│   └── web/              # Next.js application
│       ├── app/          # App Router pages
│       ├── actions/      # Server Actions
│       ├── services/     # Business logic
│       ├── lib/          # Utilities and config
│       └── prisma/       # Database schema
├── packages/
│   └── ui/               # Shared UI components
│       └── src/
│           └── components/  # shadcn/ui components
└── specs/                # Feature specifications
    └── 002-reemplazar-sistema-de/  # OAuth migration docs
```

### Adding Components

To add shadcn/ui components:

```bash
pnpm dlx shadcn@latest add <component-name> -c apps/web
```

Components are placed in `packages/ui/src/components/` for use across the monorepo.

### Using Components

Import components from the `@workspace/ui` package:

```tsx
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
```

### Database Migrations

After modifying `apps/web/prisma/schema.prisma`:

```bash
cd apps/web
npx prisma db push          # Development (no migration files)
npx prisma migrate dev      # Production (creates migration files)
npx prisma studio           # View database in browser
```

### Running Tests

```bash
pnpm test                   # Run all tests
pnpm test:watch             # Run tests in watch mode
pnpm typecheck              # Type check all packages
```

### Building for Production

```bash
pnpm build                  # Build all apps and packages
pnpm start                  # Start production server
```

## Deployment

### Vercel (Recommended)

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Cron Jobs

VoteHub uses Vercel Cron for scheduled tasks:

- **Session Cleanup**: Hourly (`0 * * * *`) - Removes expired sessions
- **Unmigrated Accounts Cleanup**: Daily at midnight (`0 0 * * *`) - Removes accounts that haven't migrated to Google OAuth after 30 days

Set `CRON_SECRET` environment variable in production for authorization.

## Troubleshooting

### OAuth Errors

- **"redirect_uri_mismatch"**: Verify redirect URIs in Google Cloud Console match your `AUTH_URL`
- **"invalid_client"**: Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- **"access_denied"**: User cancelled OAuth flow - expected behavior

### Database Errors

- **"P1001: Can't reach database"**: Check `DATABASE_URL` and PostgreSQL is running
- **"P2002: Unique constraint failed"**: Duplicate data (email, username, etc.)

### Session Issues

- **Session expired**: Sessions last 24 hours, auto-refresh if active within 12 hours
- **Not authenticated**: Clear cookies and sign in again

## Documentation

- [Authentication Setup](specs/002-reemplazar-sistema-de/readme-auth-config.md)
- [Quick Start Guide](specs/002-reemplazar-sistema-de/quickstart.md)
- [Data Model](specs/002-reemplazar-sistema-de/data-model.md)
- [Implementation Plan](specs/002-reemplazar-sistema-de/plan.md)
- [OAuth Flow](specs/002-reemplazar-sistema-de/contracts/oauth-flow.md)
- [Session Management](specs/002-reemplazar-sistema-de/contracts/session-management.md)

## License

MIT
