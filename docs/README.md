# Rodinny Rozpocet - Documentation

**Family Budget Management Application**

A comprehensive financial management tool designed for Czech families to track expenses, income, investments, loans, and savings goals with AI-powered insights.

## Quick Navigation

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System design, tech stack, and project structure |
| [API Reference](./API.md) | Complete API endpoint documentation |
| [Database Schema](./DATABASE.md) | Prisma models and data relationships |
| [Components](./COMPONENTS.md) | React component library reference |
| [AI Integration](./AI-INTEGRATION.md) | OpenAI integration and insight generation |
| [Development Guide](./DEVELOPMENT.md) | Setup, commands, and contribution guidelines |

---

## Overview

### Purpose

This application helps families (primarily targeting the household financial decision-maker) to:

- **Track Monthly Finances** - Monitor income and expenses by category
- **Manage Investments** - Track investment contributions with compound interest projections
- **Analyze Loans** - Calculate loan affordability with stress testing
- **Set Savings Goals** - Track progress toward financial targets including emergency funds
- **Get AI Insights** - Receive personalized financial recommendations

### Key Features

```
+------------------+     +------------------+     +------------------+
|    Dashboard     |     |  AI Insights     |     |  Loan Analysis   |
|  - Monthly KPIs  |     |  - Health Score  |     |  - Calculator    |
|  - Quick Stats   |     |  - Patterns      |     |  - Stress Tests  |
|  - Charts        |     |  - Advice        |     |  - Comparisons   |
+------------------+     +------------------+     +------------------+
         |                       |                       |
         +----------+------------+-----------+-----------+
                    |                        |
              +-----v------+          +------v-----+
              |  Expenses  |          |   Income   |
              |  Tracking  |          |  Tracking  |
              +------------+          +------------+
                    |                        |
              +-----v------+          +------v-----+
              | Investments|          |   Goals    |
              |  & Growth  |          |  Savings   |
              +------------+          +------------+
```

### Target Audience

- Czech-speaking families
- Household financial managers
- Users making loan decisions (mortgages, consumer loans)
- People tracking long-term savings goals

---

## Application Sections

### 1. Dashboard (`/`)
The main overview showing current month's financial health:
- Total income, expenses, and balance
- Investment contributions
- Top expense categories
- Active loans summary
- Savings goal progress
- AI-powered executive summary

### 2. Expenses (`/vydaje`)
Manage monthly expense categories:
- 15 default categories (groceries, housing, utilities, etc.)
- Add custom categories
- Edit monthly amounts inline
- View historical data by month

### 3. Income (`/prijmy`)
Track income sources:
- Salary, bonuses, and other income
- Add custom income sources
- Monthly amount tracking
- Source-by-source breakdown

### 4. Savings Goals (`/cile`)
Manage savings targets:
- Create named savings goals
- Track progress with visual indicators
- Special emergency fund tracking (3x monthly expenses)
- Deposit/withdrawal transaction history

### 5. Loans (`/pujcky`)
Loan analysis and management:
- **Active Loans Table** - Track current loan payments
- **Loan Calculator** - Analyze new loan affordability
- **Verdict System** - Available / Risky / Not Recommended
- **Stress Testing** - Simulate income drops and inflation
- **Scenario Comparison** - Compare multiple loan options

### 6. Investments (`/investice`)
Investment tracking with projections:
- Monthly contribution tracking
- Annual return rate configuration
- Investment horizon settings
- Compound interest calculator
- Future value projections

---

## Technology Summary

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui |
| Backend | Next.js API Routes |
| Database | SQLite with Prisma ORM |
| AI | OpenAI GPT-5 mini |
| Testing | Vitest, Testing Library |

---

## Quick Start

```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev
npm run db:seed

# Configure environment
cp .env.example .env
# Add your OPEN_AI_API key

# Start development server
npm run dev
```

Visit `http://localhost:3000`

---

## Currency & Localization

- **Language**: Czech (Cestina)
- **Currency**: CZK (Czech Koruna)
- **Number Format**: Space for thousands, comma for decimals (1 234,56)
- **Date Format**: Czech standard (day.month.year)

---

## File Structure Overview

```
sivanences/
├── app/                    # Next.js App Router
│   ├── api/               # Backend API routes
│   ├── page.tsx           # Dashboard
│   ├── vydaje/            # Expenses page
│   ├── prijmy/            # Income page
│   ├── cile/              # Goals page
│   ├── pujcky/            # Loans page
│   └── investice/         # Investments page
├── components/            # React components
│   └── ui/               # Base UI components
├── lib/                   # Utilities and helpers
├── prisma/               # Database schema and migrations
└── docs/                 # This documentation
```

---

## Support

For issues and feature requests, please check the main project repository.
