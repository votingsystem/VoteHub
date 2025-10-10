# Quick Start Guide: VoteHub Development

**Date**: 2025-10-09
**Feature**: VoteHub Core Platform
**Branch**: `001-votehub-core-platform`

## Prerequisites

- **Node.js**: v20+ (LTS recommended)
- **pnpm**: v10.4.1+ (package manager)
- **PostgreSQL**: Local installation OR Supabase account
- **Git**: Version control
- **Code Editor**: VS Code recommended (with Prisma extension)

---

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to repository root
cd VoteHub

# Install all dependencies (monorepo)
pnpm install

# Verify installation
pnpm --version  # Should show 10.4.1+
node --version  # Should show v20+
```

### 2. Database Setup (Supabase)

**Option A: Use Supabase (Recommended)**

1. Create Supabase account: https://supabase.com/dashboard
2. Create new project
3. Get connection strings from Settings → Database

**Option B: Local PostgreSQL**

```bash
# Install PostgreSQL
brew install postgresql@15  # macOS
# Or download from postgresql.org

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb votehub_dev
```

### 3. Environment Configuration

Create `.env` file in `apps/web/`:

```bash
# apps/web/.env

# Database (Supabase)
DATABASE_URL="postgresql://user:password@db.xxx.supabase.co:5432/postgres"
DATABASE_URL_POOLED="postgresql://user:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true"

# OR Local PostgreSQL
# DATABASE_URL="postgresql://localhost:5432/votehub_dev"

# BetterAuth (generate random secrets)
AUTH_SECRET="generate-with: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Generate secrets**:
```bash
openssl rand -base64 32
```

### 4. Database Migration

```bash
# Navigate to web app
cd apps/web

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database (creates admin user + default tags)
npx prisma db seed
```

**Default Admin Credentials** (created by seed):
- Email: `admin@votehub.com`
- Password: `admin123`
- **⚠️ CHANGE IN PRODUCTION**

### 5. Start Development Server

```bash
# From repository root
pnpm dev

# Or from apps/web
cd apps/web && pnpm dev
```

**Servers started**:
- Web app: http://localhost:3000
- Turbopack dev server (faster builds)

---

## Development Workflow

### Creating a New Poll (Admin)

1. **Login as Admin**
   ```
   Navigate to: http://localhost:3000/login
   Email: admin@votehub.com
   Password: admin123
   ```

2. **Access Admin Panel**
   ```
   Navigate to: http://localhost:3000/admin/polls/new
   ```

3. **Fill Poll Form**
   - Title: "Should we implement feature X?"
   - Description: Detailed context
   - Tag: Select from dropdown (e.g., "Technology")
   - Start date: Now or future date
   - Duration: Enter hours (e.g., 168 for 1 week)
   - Options: Add 2-5 voting options

4. **Submit**
   - Poll appears in feed if startAt ≤ now
   - Otherwise shows as "Scheduled"

### Voting as User

1. **Register User Account**
   ```
   Navigate to: http://localhost:3000/register
   Create account (automatically assigned "voter" role)
   ```

2. **Browse Feed**
   ```
   Navigate to: http://localhost:3000
   View active polls
   ```

3. **Vote on Poll**
   - Click poll card
   - Select one option
   - Click "Submit Vote"
   - See updated results immediately (optimistic UI)

4. **View Results**
   - Vote distribution shown as bars/percentages
   - Your vote highlighted
   - Cannot vote again (enforced by database constraint)

### Adding Comments

1. **View Poll Details**
   ```
   Click any poll card to open detail page
   ```

2. **Add Top-Level Comment**
   - Scroll to comment section
   - Type comment in text area
   - Click "Post Comment"

3. **Reply to Comment**
   - Click "Reply" on any comment
   - Type reply
   - Click "Post Reply"
   - Nested up to 5 levels

### Managing Tags (Admin)

1. **View Tags**
   ```
   Navigate to: http://localhost:3000/admin/tags
   ```

2. **Create New Tag**
   - Click "New Tag"
   - Enter tag name (e.g., "Climate Change")
   - Slug auto-generated: "climate-change"
   - Click "Create"

---

## Testing

### Running Tests

```bash
# From repository root
pnpm test          # Run all tests
pnpm test:watch    # Watch mode

# From apps/web
cd apps/web
pnpm test          # Web app tests only
```

### Test Categories

1. **Unit Tests** (services, utilities)
   ```bash
   # Test vote service
   pnpm test services/vote-service.test.ts
   ```

2. **Integration Tests** (Server Actions, database)
   ```bash
   # Test voting flow
   pnpm test actions/vote-actions.test.ts
   ```

3. **E2E Tests** (Playwright)
   ```bash
   # Install Playwright
   npx playwright install

   # Run E2E tests
   pnpm test:e2e
   ```

### Manual Testing Checklist

- [ ] Admin can create poll with 2-5 options
- [ ] Poll starts/ends at scheduled times
- [ ] User can vote once per poll (second vote rejected)
- [ ] Vote results update in real-time
- [ ] Comments thread correctly (nested replies)
- [ ] Tag filtering works on feed
- [ ] Sort options work (Newest, Most Voted, Trending)
- [ ] Poll deletion blocked if votes exist
- [ ] Admin can unpublish poll with votes
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Works without JavaScript (disable in DevTools)

---

## Database Management

### View Database

```bash
# Prisma Studio (GUI)
cd apps/web
npx prisma studio
```

Opens browser: http://localhost:5555

### Reset Database

```bash
# Warning: Deletes all data
cd apps/web
npx prisma migrate reset

# Re-seed
npx prisma db seed
```

### Create Migration

```bash
# After changing schema.prisma
cd apps/web
npx prisma migrate dev --name add_new_field
```

### Inspect Database

```bash
# View current schema
npx prisma db pull

# Generate SQL for migration
npx prisma migrate diff --from-empty --to-schema-datamodel schema.prisma
```

---

## Code Quality

### Linting

```bash
# From repository root
pnpm lint          # Check all workspaces
pnpm lint:fix      # Auto-fix issues

# From apps/web
cd apps/web
pnpm lint
```

### Type Checking

```bash
# From repository root
pnpm typecheck     # Check all workspaces

# From apps/web
cd apps/web
pnpm typecheck
```

### Formatting

```bash
# From repository root
pnpm format        # Format all files with Prettier
```

### Pre-Commit Checks

```bash
# Run before committing
pnpm lint && pnpm typecheck && pnpm test
```

---

## Adding shadcn/ui Components

```bash
# From repository root
pnpm dlx shadcn@latest add <component-name> -c apps/web

# Examples
pnpm dlx shadcn@latest add button -c apps/web
pnpm dlx shadcn@latest add dialog -c apps/web
pnpm dlx shadcn@latest add form -c apps/web
```

Components are added to `packages/ui/src/components/ui/` automatically.

### Using Components

```tsx
// In apps/web/app/... component
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"

export default function MyPage() {
  return (
    <Card>
      <Button>Click Me</Button>
    </Card>
  )
}
```

---

## Debugging

### Next.js Dev Server

- **Hot Reload**: Changes auto-reload in browser
- **Error Overlay**: Shows TypeScript/build errors
- **Console**: Check browser console and terminal logs

### Server Actions

```typescript
// Add console.log in Server Actions
"use server"

export async function submitVote(formData: FormData) {
  console.log("Vote submission:", Object.fromEntries(formData))
  // ... rest of action
}
```

Logs appear in **terminal**, not browser console.

### Prisma Queries

```typescript
// Enable query logging
// apps/web/lib/prisma.ts
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})
```

### React DevTools

Install browser extension:
- Chrome: React Developer Tools
- Firefox: React Developer Tools

Inspect component tree, props, state.

---

## Common Issues & Solutions

### Issue: `pnpm install` fails

**Solution**:
```bash
# Clear cache
pnpm store prune

# Reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Issue: Database connection error

**Solution**:
```bash
# Check DATABASE_URL in .env
# Ensure PostgreSQL is running (if local)
brew services start postgresql@15

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Issue: Prisma migration fails

**Solution**:
```bash
# Reset database (WARNING: deletes data)
npx prisma migrate reset

# Or manually fix migration
npx prisma migrate resolve --rolled-back <migration-name>
```

### Issue: Port 3000 already in use

**Solution**:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 pnpm dev
```

### Issue: TypeScript errors after adding component

**Solution**:
```bash
# Regenerate Prisma client
cd apps/web
npx prisma generate

# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## Production Build

### Build for Production

```bash
# From repository root
pnpm build

# Build succeeds if:
# - No TypeScript errors
# - No linting errors
# - All packages build successfully
```

### Test Production Build Locally

```bash
cd apps/web
pnpm build
pnpm start
```

Runs production server on http://localhost:3000

### Deployment (Vercel)

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables (same as .env)
4. Deploy

Vercel auto-detects:
- Next.js 15
- pnpm workspace
- Turborepo build caching

---

## Useful Commands Reference

```bash
# Development
pnpm dev                # Start all apps in dev mode
pnpm build              # Build all apps and packages
pnpm lint               # Lint all packages
pnpm typecheck          # Type check all packages
pnpm test               # Run all tests

# Web app specific (from apps/web/)
pnpm dev                # Start Next.js dev server
pnpm build              # Production build
pnpm start              # Start production server
pnpm lint:fix           # Auto-fix linting issues

# Database (from apps/web/)
npx prisma studio       # Open Prisma Studio GUI
npx prisma migrate dev  # Create and apply migration
npx prisma db seed      # Seed database
npx prisma generate     # Regenerate Prisma client

# Component library
pnpm dlx shadcn@latest add <component> -c apps/web

# Cleanup
pnpm store prune        # Clean pnpm cache
rm -rf node_modules     # Remove dependencies
rm -rf .next            # Remove Next.js build cache
```

---

## Next Steps

1. ✅ Complete setup above
2. ✅ Create test poll as admin
3. ✅ Vote as regular user
4. ✅ Add comments
5. ✅ Explore admin analytics
6. 📖 Read [data-model.md](./data-model.md) for database schema
7. 📖 Read [contracts/README.md](./contracts/README.md) for API reference
8. 🔨 Start implementing tasks from `tasks.md` (run `/speckit.tasks` to generate)

---

## Support & Resources

- **Project Docs**: `specs/001-votehub-core-platform/`
- **Constitution**: `.specify/memory/constitution.md`
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **shadcn/ui**: https://ui.shadcn.com/docs
- **BetterAuth**: https://better-auth.com/docs

**Troubleshooting**: Check console logs, Prisma Studio, and React DevTools first.
