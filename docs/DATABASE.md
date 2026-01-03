# Database Schema

This document describes the database schema used by the Rodinny Rozpocet application.

**Database:** SQLite
**ORM:** Prisma 5.22
**File Location:** `prisma/dev.db`

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐
│  Category   │       │ IncomeSource│
│─────────────│       │─────────────│
│ id (PK)     │       │ id (PK)     │
│ name        │       │ name        │
│ icon        │       │ order       │
│ order       │       └──────┬──────┘
└──────┬──────┘              │
       │                     │
       │ 1:N                 │ 1:N
       │                     │
       ▼                     ▼
┌─────────────┐       ┌─────────────┐
│   Expense   │       │   Income    │
│─────────────│       │─────────────│
│ id (PK)     │       │ id (PK)     │
│ amount      │       │ amount      │
│ year        │       │ year        │
│ month       │       │ month       │
│ categoryId  │       │ sourceId    │
└─────────────┘       └─────────────┘


┌──────────────────┐       ┌─────────────┐
│  InvestmentType  │       │  SavingGoal │
│──────────────────│       │─────────────│
│ id (PK)          │       │ id (PK)     │
│ name             │       │ name        │
│ order            │       │ targetAmount│
│ totalInvested    │       │currentAmount│
│ annualRate       │       │ isEmergency │
│ investmentYears  │       │ order       │
└───────┬──────────┘       └──────┬──────┘
        │                         │
        │ 1:N                     │ 1:N
        │                         │
        ▼                         ▼
┌─────────────┐          ┌───────────────┐
│ Investment  │          │FundTransaction│
│─────────────│          │───────────────│
│ id (PK)     │          │ id (PK)       │
│ amount      │          │ amount        │
│ year        │          │ description   │
│ month       │          │ date          │
│ typeId      │          │ savingGoalId  │
└─────────────┘          └───────────────┘


┌─────────────────┐       ┌───────────────┐
│  LoanScenario   │       │   ActiveLoan  │
│─────────────────│       │───────────────│
│ id (PK)         │       │ id (PK)       │
│ name            │       │ name          │
│ amount          │       │ type          │
│ interestRate    │       │ originalAmount│
│ termMonths      │       │remainingAmount│
│ type            │       │ interestRate  │
│ monthlyPayment  │       │ monthlyPayment│
│ totalPayment    │       │ startDate     │
│ totalInterest   │       │ termMonths    │
│ verdictStatus   │       └───────────────┘
│ verdictLabel    │
│ verdictReason   │
│ budgetImpact    │
│ budgetIncome    │
│ budgetExpenses  │
└─────────────────┘
```

---

## Models

### Category

Expense categories for organizing spending.

```prisma
model Category {
  id       String    @id @default(cuid())
  name     String    @unique
  icon     String?
  order    Int       @default(0)
  expenses Expense[]
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key (CUID) |
| name | String | Category name (unique) |
| icon | String? | Lucide icon name |
| order | Int | Sort order |
| expenses | Expense[] | Related expense records |

**Default Categories:**
1. Potraviny (Groceries)
2. Bydleni (Housing)
3. Energie (Utilities)
4. Doprava (Transport)
5. Obleceni (Clothing)
6. Zdravi (Health)
7. Vzdelavani (Education)
8. Zabava (Entertainment)
9. Restaurace (Dining)
10. Komunikace (Communications)
11. Pojisteni (Insurance)
12. Deti (Children)
13. Domacnost (Household)
14. Osobni (Personal)
15. Ostatni (Other)

---

### Expense

Monthly expense amounts per category.

```prisma
model Expense {
  id         String   @id @default(cuid())
  amount     Float
  year       Int
  month      Int
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([categoryId, year, month])
  @@index([year, month])
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key (CUID) |
| amount | Float | Expense amount in CZK |
| year | Int | Year (e.g., 2024) |
| month | Int | Month (1-12) |
| categoryId | String | Foreign key to Category |

**Constraints:**
- Unique combination of `[categoryId, year, month]`
- Indexed on `[year, month]` for efficient queries

---

### IncomeSource

Sources of income (salary, bonuses, etc.).

```prisma
model IncomeSource {
  id      String   @id @default(cuid())
  name    String   @unique
  order   Int      @default(0)
  incomes Income[]
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key (CUID) |
| name | String | Source name (unique) |
| order | Int | Sort order |
| incomes | Income[] | Related income records |

**Default Sources:**
1. Mzda (Salary)
2. Bonusy (Bonuses)
3. Ostatni (Other)

---

### Income

Monthly income amounts per source.

```prisma
model Income {
  id       String       @id @default(cuid())
  amount   Float
  year     Int
  month    Int
  sourceId String
  source   IncomeSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@unique([sourceId, year, month])
  @@index([year, month])
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key (CUID) |
| amount | Float | Income amount in CZK |
| year | Int | Year |
| month | Int | Month (1-12) |
| sourceId | String | Foreign key to IncomeSource |

---

### InvestmentType

Types of investments with growth parameters.

```prisma
model InvestmentType {
  id              String       @id @default(cuid())
  name            String       @unique
  order           Int          @default(0)
  totalInvested   Float?
  annualRate      Float?
  investmentYears Int?
  investments     Investment[]
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key (CUID) |
| name | String | Investment type name |
| order | Int | Sort order |
| totalInvested | Float? | Total principal invested |
| annualRate | Float? | Expected annual return (0.07 = 7%) |
| investmentYears | Int? | Investment horizon in years |
| investments | Investment[] | Monthly contribution records |

---

### Investment

Monthly investment contributions.

```prisma
model Investment {
  id     String         @id @default(cuid())
  amount Float
  year   Int
  month  Int
  typeId String
  type   InvestmentType @relation(fields: [typeId], references: [id], onDelete: Cascade)

  @@unique([typeId, year, month])
  @@index([year, month])
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key (CUID) |
| amount | Float | Monthly contribution in CZK |
| year | Int | Year |
| month | Int | Month (1-12) |
| typeId | String | Foreign key to InvestmentType |

---

### SavingGoal

Savings targets and funds.

```prisma
model SavingGoal {
  id            String            @id @default(cuid())
  name          String
  targetAmount  Float?
  currentAmount Float             @default(0)
  isEmergency   Boolean           @default(false)
  order         Int               @default(0)
  transactions  FundTransaction[]
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key (CUID) |
| name | String | Goal name |
| targetAmount | Float? | Target amount (null = unlimited) |
| currentAmount | Float | Current balance |
| isEmergency | Boolean | Is this an emergency fund? |
| order | Int | Sort order |
| transactions | FundTransaction[] | Deposit/withdrawal history |

**Emergency Fund Note:**
When `isEmergency = true`, the recommended target is calculated as 3x average monthly expenses.

---

### FundTransaction

Deposits and withdrawals for saving goals.

```prisma
model FundTransaction {
  id           String     @id @default(cuid())
  amount       Float
  description  String?
  date         DateTime   @default(now())
  savingGoalId String
  savingGoal   SavingGoal @relation(fields: [savingGoalId], references: [id], onDelete: Cascade)

  @@index([savingGoalId])
  @@index([date])
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key (CUID) |
| amount | Float | Transaction amount (+deposit, -withdrawal) |
| description | String? | Optional note |
| date | DateTime | Transaction timestamp |
| savingGoalId | String | Foreign key to SavingGoal |

---

### LoanScenario

Saved loan calculations and analysis.

```prisma
model LoanScenario {
  id             String  @id @default(cuid())
  name           String
  amount         Float
  interestRate   Float
  termMonths     Int
  type           String
  monthlyPayment Float
  totalPayment   Float
  totalInterest  Float
  verdictStatus  String?
  verdictLabel   String?
  verdictReason  String?
  budgetImpact   Float?
  budgetIncome   Float?
  budgetExpenses Float?
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key (CUID) |
| name | String | Scenario name |
| amount | Float | Loan principal |
| interestRate | Float | Annual interest rate (4.5 = 4.5%) |
| termMonths | Int | Loan term in months |
| type | String | "MORTGAGE" or "CONSUMER" |
| monthlyPayment | Float | Calculated monthly payment |
| totalPayment | Float | Total amount to be paid |
| totalInterest | Float | Total interest paid |
| verdictStatus | String? | "AVAILABLE", "RISKY", "NOT_RECOMMENDED" |
| verdictLabel | String? | Czech verdict label |
| verdictReason | String? | Explanation text |
| budgetImpact | Float? | Payment as % of monthly income |
| budgetIncome | Float? | Income at time of calculation |
| budgetExpenses | Float? | Expenses at time of calculation |

---

### ActiveLoan

Currently active loans being paid off.

```prisma
model ActiveLoan {
  id              String   @id @default(cuid())
  name            String
  type            String
  originalAmount  Float
  remainingAmount Float
  interestRate    Float
  monthlyPayment  Float
  startDate       DateTime
  termMonths      Int
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key (CUID) |
| name | String | Loan name/description |
| type | String | "MORTGAGE" or "CONSUMER" |
| originalAmount | Float | Original loan amount |
| remainingAmount | Float | Manually updated remaining balance |
| interestRate | Float | Annual interest rate |
| monthlyPayment | Float | Monthly payment amount |
| startDate | DateTime | Loan start date |
| termMonths | Int | Original term in months |

**Note:** The `calculatedRemaining` field in API responses is computed based on payments made since `startDate`.

---

## Database Operations

### Seeding

Run the seed script to populate default data:

```bash
npm run db:seed
```

This creates:
- 15 default expense categories
- 3 default income sources

### Migrations

Create a new migration after schema changes:

```bash
npx prisma migrate dev --name description_of_change
```

### Reset Database

Reset and reseed the database:

```bash
npx prisma migrate reset
```

### Database Studio

Open Prisma Studio to view/edit data:

```bash
npx prisma studio
```

---

## Query Patterns

### Fetch Monthly Data with Relations

```typescript
// Get categories with expenses for a month
const categories = await prisma.category.findMany({
  include: {
    expenses: {
      where: { year, month }
    }
  },
  orderBy: { order: 'asc' }
})
```

### Upsert Pattern

```typescript
// Create or update expense
const expense = await prisma.expense.upsert({
  where: {
    categoryId_year_month: { categoryId, year, month }
  },
  update: { amount },
  create: { categoryId, year, month, amount }
})
```

### Aggregations

```typescript
// Sum all expenses for a month
const total = await prisma.expense.aggregate({
  where: { year, month },
  _sum: { amount: true }
})
```

---

## Backup & Recovery

The SQLite database is a single file at `prisma/dev.db`.

**Backup:**
```bash
cp prisma/dev.db prisma/backup-$(date +%Y%m%d).db
```

**Restore:**
```bash
cp prisma/backup-20240601.db prisma/dev.db
```
