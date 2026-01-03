# API Reference

Complete documentation of all API endpoints in the Rodinny Rozpocet application.

**Base URL:** `/api`

---

## Overview

All API routes are implemented as Next.js API Routes and return JSON responses.

| Method | Description |
|--------|-------------|
| GET | Retrieve data |
| POST | Create or update data |
| PATCH | Partial update |
| DELETE | Remove data |

---

## Summary

### GET /api/summary

Retrieves complete financial summary for a specific month.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | Yes | Year (e.g., 2024) |
| month | number | Yes | Month (1-12) |

**Response:**
```typescript
{
  year: number
  month: number
  categories: Array<{
    id: string
    name: string
    icon: string | null
    amount: number
    previousAmount: number  // Previous month
  }>
  incomeSources: Array<{
    id: string
    name: string
    amount: number
    previousAmount: number
  }>
  investmentTypes: Array<{
    id: string
    name: string
    amount: number
    totalInvested: number | null
    annualRate: number | null
    investmentYears: number | null
  }>
  savingGoals: Array<{
    id: string
    name: string
    currentAmount: number
    targetAmount: number | null
    isEmergency: boolean
    progress: number  // 0-100
  }>
  activeLoans: Array<{
    id: string
    name: string
    type: string
    originalAmount: number
    remainingAmount: number
    calculatedRemaining: number
    monthlyPayment: number
    interestRate: number
    startDate: string
    termMonths: number
    monthsPaid: number
    monthsRemaining: number
  }>
  totals: {
    income: number
    expenses: number
    investments: number
    balance: number
    previousIncome: number
    previousExpenses: number
  }
  averageExpenses: number
  totalLoanPayments: number
  totalLoanBalance: number
}
```

**Example:**
```bash
GET /api/summary?year=2024&month=6
```

---

## Expenses

### GET /api/expenses

Get all expense categories with amounts for a specific month.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | Yes | Year |
| month | number | Yes | Month (1-12) |

**Response:**
```typescript
Array<{
  id: string
  name: string
  icon: string | null
  order: number
  expense: {
    amount: number
  } | null
}>
```

### POST /api/expenses

Create or update expense amount for a category.

**Request Body:**
```typescript
{
  categoryId: string
  year: number
  month: number
  amount: number
}
```

**Response:**
```typescript
{
  id: string
  amount: number
  year: number
  month: number
  categoryId: string
}
```

### GET /api/expenses/categories

Get all expense categories.

**Response:**
```typescript
Array<{
  id: string
  name: string
  icon: string | null
  order: number
}>
```

### POST /api/expenses/categories

Create a new expense category.

**Request Body:**
```typescript
{
  name: string
  icon?: string
}
```

### PATCH /api/expenses/categories

Update category name.

**Request Body:**
```typescript
{
  id: string
  name: string
}
```

### DELETE /api/expenses/categories

Delete a category.

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | string | Yes |

---

## Income

### GET /api/income

Get all income sources with amounts for a specific month.

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| year | number | Yes |
| month | number | Yes |

**Response:**
```typescript
Array<{
  id: string
  name: string
  order: number
  income: {
    amount: number
  } | null
}>
```

### POST /api/income

Create or update income amount for a source.

**Request Body:**
```typescript
{
  sourceId: string
  year: number
  month: number
  amount: number
}
```

### GET /api/income/sources

Get all income sources.

### POST /api/income/sources

Create a new income source.

**Request Body:**
```typescript
{
  name: string
}
```

### PATCH /api/income/sources

Update source name.

**Request Body:**
```typescript
{
  id: string
  name: string
}
```

### DELETE /api/income/sources

Delete an income source.

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | string | Yes |

---

## Investments

### GET /api/investments

Get all investment types with monthly amounts.

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| year | number | Yes |
| month | number | Yes |

**Response:**
```typescript
Array<{
  id: string
  name: string
  order: number
  totalInvested: number | null
  annualRate: number | null
  investmentYears: number | null
  investment: {
    amount: number
  } | null
}>
```

### POST /api/investments

Create or update monthly investment amount.

**Request Body:**
```typescript
{
  typeId: string
  year: number
  month: number
  amount: number
}
```

### GET /api/investments/types

Get all investment types.

### POST /api/investments/types

Create a new investment type.

**Request Body:**
```typescript
{
  name: string
  totalInvested?: number
  annualRate?: number
  investmentYears?: number
}
```

### PATCH /api/investments/types

Update investment type.

**Request Body:**
```typescript
{
  id: string
  name?: string
  totalInvested?: number
  annualRate?: number
  investmentYears?: number
}
```

### DELETE /api/investments/types

Delete an investment type.

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | string | Yes |

---

## Saving Goals

### GET /api/goals

Get all saving goals with transaction history.

**Response:**
```typescript
Array<{
  id: string
  name: string
  targetAmount: number | null
  currentAmount: number
  isEmergency: boolean
  order: number
  transactions: Array<{
    id: string
    amount: number
    description: string | null
    date: string
  }>
}>
```

### POST /api/goals

Create a new saving goal.

**Request Body:**
```typescript
{
  name: string
  targetAmount?: number
  isEmergency?: boolean
}
```

### GET /api/goals/[id]

Get a specific goal by ID.

### PUT /api/goals/[id]

Update a goal.

**Request Body:**
```typescript
{
  name?: string
  targetAmount?: number
  isEmergency?: boolean
}
```

### DELETE /api/goals/[id]

Delete a goal.

### POST /api/goals/[id]/transaction

Add a deposit or withdrawal to a goal.

**Request Body:**
```typescript
{
  amount: number       // Positive = deposit, Negative = withdrawal
  description?: string
}
```

---

## Loans

### GET /api/loans

Get all saved loan scenarios.

**Response:**
```typescript
Array<{
  id: string
  name: string
  amount: number
  interestRate: number
  termMonths: number
  type: "MORTGAGE" | "CONSUMER"
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  verdictStatus: "AVAILABLE" | "RISKY" | "NOT_RECOMMENDED" | null
  verdictLabel: string | null
  verdictReason: string | null
  budgetImpact: number | null
  budgetIncome: number | null
  budgetExpenses: number | null
}>
```

### POST /api/loans

Save a new loan scenario.

**Request Body:**
```typescript
{
  name: string
  amount: number
  interestRate: number
  termMonths: number
  type: "MORTGAGE" | "CONSUMER"
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  verdictStatus?: string
  verdictLabel?: string
  verdictReason?: string
  budgetImpact?: number
  budgetIncome?: number
  budgetExpenses?: number
}
```

### PATCH /api/loans

Update loan scenario name.

**Request Body:**
```typescript
{
  id: string
  name: string
}
```

### DELETE /api/loans

Delete a loan scenario.

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | string | Yes |

### GET /api/loans/active

Get all active (currently paying) loans with calculated remaining balances.

**Response:**
```typescript
Array<{
  id: string
  name: string
  type: string
  originalAmount: number
  remainingAmount: number
  calculatedRemaining: number
  interestRate: number
  monthlyPayment: number
  startDate: string
  termMonths: number
  monthsPaid: number
  monthsRemaining: number
}>
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (missing/invalid parameters) |
| 404 | Not Found |
| 500 | Internal Server Error |

**Error Response Format:**
```typescript
{
  error: string  // Error message
}
```

---

## Usage Examples

### Fetch Dashboard Data
```javascript
const response = await fetch('/api/summary?year=2024&month=6')
const data = await response.json()
```

### Update Expense
```javascript
await fetch('/api/expenses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    categoryId: 'abc123',
    year: 2024,
    month: 6,
    amount: 5000
  })
})
```

### Add Transaction to Goal
```javascript
await fetch('/api/goals/goal123/transaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 1000,  // Deposit
    description: 'Monthly deposit'
  })
})
```
