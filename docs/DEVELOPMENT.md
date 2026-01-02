# Development Guide

Complete guide for setting up, developing, and contributing to the Rodinny Rozpocet application.

---

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Git**
- **OpenAI API key** (for AI features)

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd sivanences
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Create environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
OPEN_AI_API=sk-proj-your-key-here
```

### 4. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed default data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Generate test coverage report |
| `npm run db:seed` | Seed database with default data |

---

## Project Structure

```
sivanences/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── page.tsx           # Dashboard page
│   ├── [section]/         # Section pages
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
│
├── components/            # React components
│   ├── ui/               # Base UI (shadcn)
│   └── *.tsx             # Feature components
│
├── lib/                   # Utilities
│   ├── db.ts             # Prisma client
│   ├── format.ts         # Formatting utils
│   ├── loan.ts           # Loan calculations
│   ├── ai-prompts.ts     # AI prompt builders
│   └── types.ts          # TypeScript types
│
├── prisma/               # Database
│   ├── schema.prisma     # Schema definition
│   └── seed.ts           # Seed script
│
└── docs/                 # Documentation
```

---

## Development Workflow

### Creating a New Page

1. Create page file:
```tsx
// app/new-section/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/main-layout'
import { MonthSelector } from '@/components/month-selector'
import { getCurrentPeriod } from '@/lib/format'

export default function NewSectionPage() {
  const [year, setYear] = useState(getCurrentPeriod().year)
  const [month, setMonth] = useState(getCurrentPeriod().month)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchData()
  }, [year, month])

  const fetchData = async () => {
    const res = await fetch(`/api/new-endpoint?year=${year}&month=${month}`)
    setData(await res.json())
  }

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">New Section</h1>
        <MonthSelector
          year={year}
          month={month}
          onChange={(y, m) => { setYear(y); setMonth(m) }}
        />
      </div>

      {/* Page content */}
    </MainLayout>
  )
}
```

2. Add to navigation in `lib/types.ts`:
```typescript
export const NAV_ITEMS = [
  // ...existing items
  { href: '/new-section', label: 'New Section', icon: 'IconName' }
]
```

### Creating a New API Route

```typescript
// app/api/new-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const year = parseInt(searchParams.get('year') || '')
  const month = parseInt(searchParams.get('month') || '')

  if (!year || !month) {
    return NextResponse.json(
      { error: 'Year and month required' },
      { status: 400 }
    )
  }

  try {
    const data = await prisma.model.findMany({
      where: { year, month }
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await prisma.model.create({
      data: body
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create' },
      { status: 500 }
    )
  }
}
```

### Creating a New Component

```tsx
// components/new-component.tsx
'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'

interface NewComponentProps {
  title: string
  amount: number
  onChange?: (value: number) => void
}

export function NewComponent({ title, amount, onChange }: NewComponentProps) {
  const [value, setValue] = useState(amount)

  const handleChange = (newValue: number) => {
    setValue(newValue)
    onChange?.(newValue)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">
          {formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  )
}
```

### Adding a Database Model

1. Update schema:
```prisma
// prisma/schema.prisma
model NewModel {
  id        String   @id @default(cuid())
  name      String
  amount    Float
  createdAt DateTime @default(now())

  @@index([createdAt])
}
```

2. Generate migration:
```bash
npx prisma migrate dev --name add_new_model
```

3. Update seed if needed:
```typescript
// prisma/seed.ts
await prisma.newModel.createMany({
  data: [
    { name: 'Item 1', amount: 100 },
    { name: 'Item 2', amount: 200 }
  ]
})
```

---

## Database Management

### Prisma Commands

```bash
# View database in browser
npx prisma studio

# Reset database (drops all data)
npx prisma migrate reset

# Create migration
npx prisma migrate dev --name description

# Deploy migrations (production)
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Backup Database

```bash
# Create backup
cp prisma/dev.db prisma/backup-$(date +%Y%m%d).db

# Restore from backup
cp prisma/backup-20240101.db prisma/dev.db
```

---

## Testing

### Running Tests

```bash
# Watch mode (development)
npm run test

# Single run
npm run test:run

# With coverage
npm run test:coverage
```

### Writing Tests

```typescript
// lib/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPercent } from './format'

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(formatCurrency(12500)).toBe('12 500 Kc')
  })

  it('formats negative numbers correctly', () => {
    expect(formatCurrency(-5000)).toBe('-5 000 Kc')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('0 Kc')
  })
})

describe('formatPercent', () => {
  it('formats decimal as percentage', () => {
    expect(formatPercent(0.075)).toBe('7,5 %')
  })
})
```

### Component Testing

```typescript
// components/stat-card.test.tsx
import { render, screen } from '@testing-library/react'
import { StatCard } from './stat-card'

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="Prijmy" value={50000} format="currency" />)

    expect(screen.getByText('Prijmy')).toBeInTheDocument()
    expect(screen.getByText('50 000 Kc')).toBeInTheDocument()
  })

  it('shows trend indicator', () => {
    render(
      <StatCard
        title="Vydaje"
        value={30000}
        previousValue={25000}
        format="currency"
      />
    )

    expect(screen.getByText(/\+20%/)).toBeInTheDocument()
  })
})
```

---

## Code Style

### TypeScript

- Use strict mode
- Define interfaces for all props
- Avoid `any` type
- Use meaningful variable names

```typescript
// Good
interface CategoryProps {
  id: string
  name: string
  amount: number
}

function CategoryItem({ id, name, amount }: CategoryProps) {
  return <div>{name}: {amount}</div>
}

// Avoid
function CategoryItem(props: any) {
  return <div>{props.n}: {props.a}</div>
}
```

### React Components

- Use functional components with hooks
- Prefer named exports
- Keep components focused (single responsibility)
- Extract reusable logic to custom hooks

```typescript
// Good - custom hook for data fetching
function useMonthlyData(year: number, month: number) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/summary?year=${year}&month=${month}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [year, month])

  return { data, loading }
}
```

### CSS/Tailwind

- Use Tailwind utility classes
- Follow consistent spacing patterns
- Use semantic color classes
- Group related classes

```tsx
// Good
<div className="flex items-center gap-4 p-4 bg-card rounded-lg border">

// Avoid inline styles
<div style={{ display: 'flex', padding: '16px' }}>
```

---

## Common Patterns

### Data Fetching

```typescript
const fetchData = useCallback(async () => {
  setLoading(true)
  setError(null)
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch')
    setData(await res.json())
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}, [url])
```

### Form Handling

```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  setSubmitting(true)

  try {
    await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    onSuccess?.()
  } catch (err) {
    setError('Submission failed')
  } finally {
    setSubmitting(false)
  }
}
```

### Error Boundaries

```tsx
// In page or layout
import { ErrorBoundary } from '@/components/error-boundary'

<ErrorBoundary fallback={<ErrorMessage />}>
  <RiskyComponent />
</ErrorBoundary>
```

---

## Debugging

### Server-Side

```typescript
// In API routes
console.log('Request body:', body)
console.log('Database result:', result)
```

### Client-Side

```typescript
// In components
console.log('Render with props:', props)
console.log('State update:', newState)
```

### Prisma Queries

```bash
# Enable query logging
DEBUG=prisma:query npm run dev
```

### Network Requests

Use browser DevTools:
- Network tab for API calls
- Console for errors
- React DevTools for component state

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite file path |
| `OPEN_AI_API` | Yes | OpenAI API key |

### Adding New Variables

1. Add to `.env`:
```env
NEW_VARIABLE=value
```

2. Update `.env.example`:
```env
NEW_VARIABLE=your-value-here
```

3. Use in code:
```typescript
const value = process.env.NEW_VARIABLE
```

---

## Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Environment Considerations

- Ensure `DATABASE_URL` points to persistent storage
- Set `OPEN_AI_API` securely
- Consider database backup strategy

---

## Troubleshooting

### Common Issues

**Prisma client not found:**
```bash
npx prisma generate
```

**Database migration errors:**
```bash
npx prisma migrate reset
npm run db:seed
```

**OpenAI API errors:**
- Verify API key in `.env`
- Check API quota/billing
- Review request format

**Build failures:**
```bash
rm -rf .next node_modules
npm install
npm run build
```

**Type errors:**
```bash
npx tsc --noEmit
```

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [OpenAI API](https://platform.openai.com/docs)
- [Vitest](https://vitest.dev)
