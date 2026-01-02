# Architecture

This document describes the technical architecture, technology stack, and project structure of the Rodinny Rozpocet application.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Next.js Frontend                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │    │
│  │  │ Dashboard│  │ Expenses │  │  Income  │  │  Goals  │  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │    │
│  │  │  Loans   │  │Investments│  │  Shared Components  │   │    │
│  │  └──────────┘  └──────────┘  └──────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/Fetch API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes (Server)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ /api/summary    /api/expenses    /api/income             │   │
│  │ /api/goals      /api/loans       /api/investments        │   │
│  │ /api/ai-insights                 /api/export             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
              │                                    │
              │ Prisma ORM                         │ OpenAI API
              ▼                                    ▼
┌─────────────────────────┐          ┌─────────────────────────┐
│    SQLite Database      │          │     OpenAI GPT-5        │
│    (prisma/dev.db)      │          │     (AI Insights)       │
└─────────────────────────┘          └─────────────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework with App Router |
| React | 19.2.3 | UI component library |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 4.x | Utility-first CSS framework |
| shadcn/ui | - | Component library (Radix UI based) |
| Recharts | 3.6.0 | Data visualization/charts |
| Lucide React | 0.562.0 | Icon library |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 16.x | Backend API endpoints |
| Prisma | 5.22.0 | Database ORM |
| better-sqlite3 | 12.5.0 | SQLite driver |
| OpenAI SDK | 6.15.0 | AI integration |

### Database

| Technology | Purpose |
|------------|---------|
| SQLite | File-based relational database |
| Prisma Client | Type-safe database queries |

### Development Tools

| Tool | Purpose |
|------|---------|
| Vitest | Unit testing framework |
| Testing Library | React component testing |
| ESLint | Code linting |
| TypeScript | Static type checking |

---

## Project Structure

```
sivanences/
│
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Backend)
│   │   ├── ai-insights/          # AI insight generation
│   │   │   ├── route.ts          # Main insights endpoint
│   │   │   └── executive-summary/
│   │   ├── expenses/             # Expense CRUD
│   │   │   ├── route.ts          # Expense amounts
│   │   │   └── categories/       # Category management
│   │   ├── income/               # Income CRUD
│   │   │   ├── route.ts          # Income amounts
│   │   │   └── sources/          # Source management
│   │   ├── investments/          # Investment CRUD
│   │   │   ├── route.ts          # Investment amounts
│   │   │   └── types/            # Type management
│   │   ├── goals/                # Savings goals CRUD
│   │   │   └── [id]/             # Dynamic goal routes
│   │   ├── loans/                # Loan scenarios CRUD
│   │   │   ├── route.ts          # Saved scenarios
│   │   │   └── active/           # Active loans
│   │   ├── summary/              # Dashboard data aggregation
│   │   ├── history/              # Transaction history
│   │   └── export/               # Data export
│   │
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── globals.css               # Global styles
│   ├── page.tsx                  # Dashboard (/)
│   ├── vydaje/page.tsx           # Expenses (/vydaje)
│   ├── prijmy/page.tsx           # Income (/prijmy)
│   ├── cile/page.tsx             # Goals (/cile)
│   ├── pujcky/page.tsx           # Loans (/pujcky)
│   ├── investice/page.tsx        # Investments (/investice)
│   └── export/page.tsx           # Export (/export)
│
├── components/                   # React Components
│   ├── ui/                       # Base UI (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   │
│   ├── main-layout.tsx           # Page layout wrapper
│   ├── sidebar-nav.tsx           # Navigation sidebar
│   ├── month-selector.tsx        # Period selection
│   ├── stat-card.tsx             # Statistics display
│   ├── ai-insight-card.tsx       # AI insights component
│   ├── loan-compare-view.tsx     # Loan comparison
│   └── ...
│
├── lib/                          # Utilities & Helpers
│   ├── db.ts                     # Prisma client singleton
│   ├── format.ts                 # Czech formatting utilities
│   ├── loan.ts                   # Loan calculations
│   ├── ai-prompts.ts             # AI prompt builders
│   ├── types.ts                  # Shared TypeScript types
│   ├── utils.ts                  # General utilities
│   └── generated/prisma/         # Generated Prisma client
│
├── prisma/
│   ├── schema.prisma             # Database schema definition
│   ├── dev.db                    # SQLite database file
│   └── seed.ts                   # Database seeding script
│
├── public/                       # Static assets
├── data/                         # Data files
│
├── .env                          # Environment variables
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind configuration
├── vitest.config.ts              # Test configuration
├── package.json                  # Dependencies
└── components.json               # shadcn/ui configuration
```

---

## Data Flow Patterns

### 1. Monthly Data Loading

```
User Selects Month
       │
       ▼
┌─────────────────┐
│ MonthSelector   │
│ Component       │
└────────┬────────┘
         │ onChange(year, month)
         ▼
┌─────────────────┐
│ Page Component  │
│ (e.g., Dashboard)│
└────────┬────────┘
         │ fetch(`/api/summary?year=${year}&month=${month}`)
         ▼
┌─────────────────┐
│ API Route       │
│ /api/summary    │
└────────┬────────┘
         │ Prisma queries
         ▼
┌─────────────────┐
│ SQLite Database │
└────────┬────────┘
         │ Results
         ▼
┌─────────────────┐
│ JSON Response   │────► UI Renders Data
└─────────────────┘
```

### 2. Data Update Flow

```
User Edits Value
       │
       ▼
┌─────────────────┐
│ Input Component │
│ (onBlur)        │
└────────┬────────┘
         │ POST /api/expenses
         │ { categoryId, year, month, amount }
         ▼
┌─────────────────┐
│ API Route       │
│ /api/expenses   │
└────────┬────────┘
         │ prisma.expense.upsert()
         ▼
┌─────────────────┐
│ Database Update │
└────────┬────────┘
         │ Success response
         ▼
┌─────────────────┐
│ Refetch Data    │────► UI Updates
└─────────────────┘
```

### 3. AI Insight Generation

```
Page Loads / User Clicks Refresh
       │
       ▼
┌─────────────────┐
│ AiInsightCard   │
└────────┬────────┘
         │ GET /api/ai-insights (check cache)
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Cached Insight? │────►│ Return Cached   │
│ (< 1 hour)      │ Yes │ Show immediately│
└────────┬────────┘     └─────────────────┘
         │ No (or force refresh)
         ▼
┌─────────────────┐
│ POST /api/      │
│ ai-insights     │
└────────┬────────┘
         │ Build context from DB
         ▼
┌─────────────────┐
│ buildPrompt()   │
│ (lib/ai-prompts)│
└────────┬────────┘
         │ Send to OpenAI
         ▼
┌─────────────────┐
│ OpenAI GPT-5    │
│ Generate insight│
└────────┬────────┘
         │ Parse JSON response
         ▼
┌─────────────────┐
│ Cache in DB     │
│ (CachedInsight) │
└────────┬────────┘
         │ Return to client
         ▼
┌─────────────────┐
│ UI Animates     │
│ New Insight     │
└─────────────────┘
```

---

## Key Design Decisions

### 1. File-Based Database (SQLite)

**Why SQLite?**
- Simple deployment (no external database server)
- Perfect for single-user/family application
- Fast local file access
- Easy backup (copy single file)

**Trade-offs:**
- Not suitable for multi-user concurrent access
- No cloud sync (by design - privacy focused)

### 2. Server-Side Rendering with App Router

**Why Next.js App Router?**
- Modern React patterns (Server Components)
- Built-in API routes
- File-based routing
- Optimized for performance

### 3. AI Insight Caching

**Strategy:**
- Database cache (persistent across restarts)
- In-memory cache (1-hour TTL for fast access)
- Background regeneration (stale-while-revalidate pattern)

**Why?**
- Reduce OpenAI API costs
- Faster user experience
- Insights don't change frequently within a month

### 4. Czech-First Design

**Approach:**
- All UI text in Czech
- Currency formatting (CZK with proper separators)
- Date formatting (Czech standard)
- AI prompts in Czech (without diacritics for reliability)

---

## Security Considerations

| Area | Implementation |
|------|----------------|
| API Keys | Stored in `.env` (git-ignored) |
| Database | Local SQLite (no network exposure) |
| Authentication | None (local/family use) |
| Input Validation | Basic validation via Prisma types |
| SQL Injection | Protected by Prisma ORM |

---

## Performance Optimizations

1. **Prisma Client Singleton** - Reuses database connection
2. **React Hooks** - `useMemo`, `useCallback` for expensive computations
3. **Background Prefetching** - InsightsPrefetcher component
4. **Efficient Queries** - Indexed database columns
5. **Client-Side Caching** - State management for fetched data

---

## Extensibility Points

### Adding New Expense Category
1. Use UI to add category (or seed script)
2. Category auto-appears in expense tracking

### Adding New API Endpoint
1. Create route in `app/api/[endpoint]/route.ts`
2. Use Prisma for database access
3. Return JSON response

### Adding New Component
1. Create in `components/`
2. Follow existing patterns (TypeScript, Tailwind)
3. Import and use in pages

### Adding New AI Section
1. Add section type to `lib/ai-prompts.ts`
2. Create prompt builder function
3. Update API route to handle section
4. Create UI component to display insights
