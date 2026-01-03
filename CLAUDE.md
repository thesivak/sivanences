# CLAUDE.md

This file provides context for AI assistants working on this project.

## Project Overview

**Rodinny Rozpocet** (Family Budget) is a Czech family budget management application. It helps track monthly finances, investments, loans, and savings goals.

### Key Characteristics

- **Language**: All UI text is in Czech
- **Currency**: CZK (Czech Koruna), formatted as `1 234,56 Kc`
- **Data Model**: Monthly aggregates by category (not individual transactions)
- **Target User**: Family financial decision-maker

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Database**: SQLite with Prisma ORM
- **Testing**: Vitest, React Testing Library
- **AI** (optional): Claude Code CLI for financial insights (requires local Claude Code installation)

## Project Structure

```
app/                    # Next.js App Router pages and API routes
  api/                  # Backend API endpoints
  vydaje/               # Expenses page (/vydaje)
  prijmy/               # Income page (/prijmy)
  cile/                 # Savings goals page (/cile)
  pujcky/               # Loans page (/pujcky)
  investice/            # Investments page (/investice)
components/             # React components
  ui/                   # shadcn/ui base components
lib/                    # Utilities, helpers, types
prisma/                 # Database schema and migrations
docs/                   # Detailed documentation
```

## Common Commands

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run db:seed       # Seed database with default data
npx prisma studio     # Open database GUI
npx prisma migrate dev --name <name>  # Create migration
```

## Code Conventions

### API Routes

- Located in `app/api/[endpoint]/route.ts`
- Use helpers from `lib/api.ts`: `successResponse`, `errorResponse`, `badRequestResponse`
- Always validate query parameters and request body
- Use Prisma for database operations

### Components

- Use `'use client'` directive for client components
- Import UI components from `@/components/ui/`
- Use `formatCurrency`, `formatPercent` from `lib/format.ts` for Czech formatting
- Follow existing patterns in `components/` directory

### Database

- Schema defined in `prisma/schema.prisma`
- All models have `createdAt` and `updatedAt` timestamps
- Use `prisma.model.upsert()` for create-or-update operations
- Monthly data uses `year` and `month` columns (1-12)

### Testing

- Test files are colocated with source (e.g., `format.test.ts`)
- Use Vitest and React Testing Library
- Mock Prisma with `lib/__mocks__/db.ts`

## Key Patterns

### Monthly Data Fetching

```typescript
const res = await fetch(`/api/endpoint?year=${year}&month=${month}`)
const data = await res.json()
```

### Form Submission

```typescript
await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
```

### Czech Formatting

```typescript
import { formatCurrency, formatPercent, formatMonth } from '@/lib/format'

formatCurrency(12500)     // "12 500 Kc"
formatPercent(0.075)      // "7,5 %"
formatMonth(2024, 6)      // "Cerven 2024"
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite database path (required) |

### AI Insights (Optional)

AI financial insights are powered by **Claude Code CLI** running locally. No API keys or cloud services required.

**Requirements:**
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
- Active Claude subscription (Pro/Max)
- Run `claude login` to authenticate

If Claude Code is not available, the app falls back to rule-based demo insights.

## Important Notes

1. **Localization**: All user-facing text should be in Czech
2. **Number Format**: Use Czech formatting (space for thousands, comma for decimals)
3. **Privacy**: Application is designed for local/family use, no cloud sync
4. **Simplicity**: Keep the UI minimal and focused on numbers

## Documentation

See `docs/` directory for detailed documentation:
- `docs/README.md` - Application overview
- `docs/ARCHITECTURE.md` - System design
- `docs/API.md` - API reference
- `docs/DATABASE.md` - Database schema
- `docs/COMPONENTS.md` - Component guide
- `docs/DEVELOPMENT.md` - Development setup
