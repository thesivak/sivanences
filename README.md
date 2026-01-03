# Rodinny Rozpocet

A Czech family budget management application built with Next.js.

## Features

- **Dashboard** - Overview of monthly income, expenses, and balance
- **Expense Tracking** - Manage monthly expenses by category
- **Income Management** - Track income from multiple sources
- **Savings Goals** - Set and track progress toward financial targets
- **Loan Analysis** - Calculate loan affordability with stress testing
- **Investment Tracking** - Monitor investment contributions and projections
- **AI Insights** - Financial analysis and recommendations (optional)

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Charts**: Recharts
- **Testing**: Vitest, Testing Library

## Quick Start

```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma migrate dev
npm run db:seed

# Start development server
npm run dev
```

Visit `http://localhost:3000`

## Project Structure

```
sivanences/
├── app/                    # Next.js App Router
│   ├── api/               # Backend API routes
│   ├── vydaje/            # Expenses page
│   ├── prijmy/            # Income page
│   ├── cile/              # Goals page
│   ├── pujcky/            # Loans page
│   ├── investice/         # Investments page
│   └── export/            # Export page
├── components/            # React components
│   └── ui/               # Base UI components (shadcn)
├── lib/                   # Utilities and helpers
├── prisma/               # Database schema
└── docs/                 # Documentation
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run db:seed` | Seed database with default data |

## Documentation

See the [docs/](./docs/) directory for detailed documentation:

- [Overview](./docs/README.md) - Application overview
- [Architecture](./docs/ARCHITECTURE.md) - System design and structure
- [API Reference](./docs/API.md) - API endpoint documentation
- [Database](./docs/DATABASE.md) - Database schema reference
- [Components](./docs/COMPONENTS.md) - Component library guide
- [Development](./docs/DEVELOPMENT.md) - Development setup and guide

## Localization

- **Language**: Czech (Cestina)
- **Currency**: CZK (Czech Koruna)
- **Number Format**: 1 234,56
- **Date Format**: 15. 1. 2024
