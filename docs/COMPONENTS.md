# Components Guide

Documentation for React components used in the Rodinny Rozpocet application.

---

## Component Architecture

```
components/
├── ui/                           # Base UI components (shadcn/ui)
│   ├── alert-dialog.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── progress.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── skeleton.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   └── tooltip.tsx
│
├── main-layout.tsx               # Page layout wrapper
├── sidebar-nav.tsx               # Navigation sidebar
├── page-header.tsx               # Page title and month selector
├── month-selector.tsx            # Period selection
├── stat-card.tsx                 # Statistics display
├── editable-table.tsx            # Inline editing table
├── add-item-dialog.tsx           # Generic add item dialog
├── income-breakdown.tsx          # Income chart
├── loan-compare-view.tsx         # Loan comparison
├── loan-history-sidebar.tsx      # Saved loan scenarios
├── active-loans-table.tsx        # Active loans table
├── add-loan-dialog.tsx           # Add loan form
├── category-insight-card.tsx     # AI category insight display
├── ai-financial-overview.tsx     # AI insights dashboard
└── household-settings-dialog.tsx # Household configuration
```

---

## Base UI Components (shadcn/ui)

These components are based on [shadcn/ui](https://ui.shadcn.com/) and built with Radix UI primitives.

### Button

```tsx
import { Button } from '@/components/ui/button'

<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

**Variants:**
- `default` - Primary action (solid background)
- `secondary` - Secondary action
- `outline` - Bordered button
- `ghost` - No background
- `destructive` - Danger/delete actions
- `link` - Text link style

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

### Input

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<div>
  <Label htmlFor="amount">Castka</Label>
  <Input
    id="amount"
    type="text"
    placeholder="0"
    className="text-right"
  />
</div>
```

### Dialog

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Description text</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Select

```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'

<Select value={selected} onValueChange={setSelected}>
  <SelectTrigger>
    <SelectValue placeholder="Vyberte..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Table

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Kategorie</TableHead>
      <TableHead className="text-right">Castka</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map(item => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell className="text-right">{item.amount}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Progress

```tsx
import { Progress } from '@/components/ui/progress'

<Progress value={75} className="h-2" />
```

### Tabs

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Badge

```tsx
import { Badge } from '@/components/ui/badge'

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Error</Badge>
```

---

## Application Components

### MainLayout

Main page layout with sidebar navigation.

```tsx
import { MainLayout } from '@/components/main-layout'

export default function Page() {
  return (
    <MainLayout>
      {/* Page content */}
    </MainLayout>
  )
}
```

**Features:**
- Responsive sidebar navigation
- Consistent page structure
- Header with branding

---

### SidebarNav

Navigation sidebar component.

```tsx
import { SidebarNav } from '@/components/sidebar-nav'

<SidebarNav />
```

**Navigation Items:**
| Route | Label | Icon |
|-------|-------|------|
| `/` | Prehled | LayoutDashboard |
| `/vydaje` | Vydaje | Receipt |
| `/prijmy` | Prijmy | Wallet |
| `/cile` | Cile | Target |
| `/pujcky` | Pujcky | Calculator |
| `/investice` | Investice | TrendingUp |
| `/export` | Export | Download |

---

### MonthSelector

Period selection dropdown.

```tsx
import { MonthSelector } from '@/components/month-selector'

<MonthSelector
  year={year}
  month={month}
  onChange={(newYear, newMonth) => {
    setYear(newYear)
    setMonth(newMonth)
  }}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| year | number | Current year |
| month | number | Current month (1-12) |
| onChange | (year, month) => void | Selection change handler |

**Features:**
- Shows Czech month names
- Includes past 5 years + current year
- Formatted display: "Cerven 2024"

---

### StatCard

Statistics display card.

```tsx
import { StatCard } from '@/components/stat-card'

<StatCard
  title="Prijmy"
  value={125000}
  previousValue={120000}
  format="currency"
  trend="up"
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| title | string | Card title |
| value | number | Current value |
| previousValue | number? | Previous period value |
| format | 'currency' \| 'number' \| 'percent' | Value format |
| trend | 'up' \| 'down' \| 'neutral'? | Trend indicator |
| icon | ReactNode? | Optional icon |

**Features:**
- Automatic formatting (CZK currency)
- Previous period comparison
- Color-coded trend indicators

---

### IncomeBreakdown

Income sources visualization.

```tsx
import { IncomeBreakdown } from '@/components/income-breakdown'

<IncomeBreakdown
  sources={[
    { name: 'Mzda', amount: 100000 },
    { name: 'Bonusy', amount: 25000 }
  ]}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| sources | Array<{name, amount}> | Income source data |

**Features:**
- Pie chart visualization
- Percentage breakdown
- Color-coded legend

---

### ActiveLoansTable

Display of currently active loans.

```tsx
import { ActiveLoansTable } from '@/components/active-loans-table'

<ActiveLoansTable
  loans={activeLoans}
  onAddLoan={handleAddLoan}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| loans | ActiveLoan[] | Array of active loans |
| onAddLoan | () => void | Add button handler |

**Displayed Fields:**
- Loan name and type
- Original amount
- Remaining balance
- Monthly payment
- Interest rate
- Progress indicator

---

### AddLoanDialog

Dialog for adding new active loans.

```tsx
import { AddLoanDialog } from '@/components/add-loan-dialog'

<AddLoanDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onSubmit={handleSubmit}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| open | boolean | Dialog visibility |
| onOpenChange | (open) => void | Visibility handler |
| onSubmit | (loan) => void | Form submission handler |

**Form Fields:**
- Loan name
- Loan type (Mortgage/Consumer)
- Original amount
- Interest rate
- Monthly payment
- Start date
- Term in months

---

### LoanCompareView

Side-by-side loan scenario comparison.

```tsx
import { LoanCompareView } from '@/components/loan-compare-view'

<LoanCompareView
  scenario1={firstScenario}
  scenario2={secondScenario}
  onClose={handleClose}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| scenario1 | LoanScenario | First loan to compare |
| scenario2 | LoanScenario | Second loan to compare |
| onClose | () => void | Close handler |

**Comparison Points:**
- Loan amount
- Interest rate
- Term length
- Monthly payment
- Total payment
- Total interest
- Verdict status

---

### LoanHistorySidebar

Saved loan scenarios list.

```tsx
import { LoanHistorySidebar } from '@/components/loan-history-sidebar'

<LoanHistorySidebar
  scenarios={savedScenarios}
  onSelect={handleSelect}
  onDelete={handleDelete}
  onCompare={handleCompare}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| scenarios | LoanScenario[] | Saved scenarios |
| onSelect | (scenario) => void | Selection handler |
| onDelete | (id) => void | Delete handler |
| onCompare | (s1, s2) => void | Compare handler |

---

## Utility Functions

### cn() - Class Name Merger

```tsx
import { cn } from '@/lib/utils'

<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' ? 'primary' : 'secondary'
)}>
```

### Formatting Utilities

```tsx
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  formatMonth
} from '@/lib/format'

formatCurrency(12500)      // "12 500 Kc"
formatNumber(1234.56)      // "1 234,56"
formatPercent(0.075)       // "7,5 %"
formatDate(new Date())     // "15.6.2024"
formatMonth(2024, 6)       // "Cerven 2024"
```

---

## Component Patterns

### Data Fetching Pattern

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'

export function DataComponent({ year, month }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/data?year=${year}&month=${month}`)
      if (!res.ok) throw new Error('Fetch failed')
      setData(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <Skeleton />
  if (error) return <ErrorMessage message={error} />
  return <DataDisplay data={data} />
}
```

### Form Submission Pattern

```tsx
const handleSubmit = async (formData) => {
  try {
    const res = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    if (!res.ok) {
      throw new Error('Submission failed')
    }

    // Refresh data
    await refetchData()

    // Close dialog
    setIsOpen(false)
  } catch (err) {
    setError(err.message)
  }
}
```

### Inline Edit Pattern

```tsx
const [editValue, setEditValue] = useState(originalValue)

const handleBlur = async () => {
  if (editValue !== originalValue) {
    await updateValue(editValue)
  }
}

<Input
  value={editValue}
  onChange={(e) => setEditValue(e.target.value)}
  onBlur={handleBlur}
  className="text-right"
/>
```

---

### PageHeader

Page title with integrated month selector.

```tsx
import { PageHeader } from '@/components/page-header'

<PageHeader
  title="Vydaje"
  year={year}
  month={month}
  onPeriodChange={(y, m) => { setYear(y); setMonth(m) }}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| title | string | Page title |
| year | number | Current year |
| month | number | Current month (1-12) |
| onPeriodChange | (year, month) => void | Period change handler |

---

### EditableTable

Table component with inline editing capabilities.

```tsx
import { EditableTable } from '@/components/editable-table'

<EditableTable
  items={categories}
  year={year}
  month={month}
  onUpdate={handleUpdate}
  onDelete={handleDelete}
/>
```

**Features:**
- Inline amount editing
- Delete confirmation
- Loading states
- Czech number formatting

---

### AddItemDialog

Generic dialog for adding new items (categories, sources, etc.).

```tsx
import { AddItemDialog } from '@/components/add-item-dialog'

<AddItemDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onSubmit={handleSubmit}
  title="Pridat kategorii"
  placeholder="Nazev kategorie"
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| open | boolean | Dialog visibility |
| onOpenChange | (open) => void | Visibility handler |
| onSubmit | (name) => void | Submit handler |
| title | string | Dialog title |
| placeholder | string | Input placeholder |

---

### AIFinancialOverview

Dashboard component displaying AI-generated financial insights.

```tsx
import { AIFinancialOverview } from '@/components/ai-financial-overview'

<AIFinancialOverview
  year={year}
  month={month}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| year | number | Year for analysis |
| month | number | Month for analysis |

**Features:**
- Financial health score display
- Narrative summary
- Highlights and warnings
- Actionable suggestions
- Feedback collection (thumbs up/down)
- Caching with manual refresh

---

### CategoryInsightCard

Displays AI-generated insight for a specific expense category.

```tsx
import { CategoryInsightCard } from '@/components/category-insight-card'

<CategoryInsightCard
  categoryName="Potraviny"
  insight={categoryInsight}
  onFeedback={handleFeedback}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| categoryName | string | Category name |
| insight | object | { insight, trend, benchmarkComparison } |
| onFeedback | (isPositive) => void | Feedback handler |

---

### HouseholdSettingsDialog

Dialog for configuring household settings.

```tsx
import { HouseholdSettingsDialog } from '@/components/household-settings-dialog'

<HouseholdSettingsDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onSave={handleSave}
/>
```

**Features:**
- Total members configuration
- Adult/children split
- Emergency fund target settings
- Validation of member counts

---

## Styling Conventions

### Color Palette

| Purpose | Color | Tailwind Class |
|---------|-------|----------------|
| Income/Positive | Green | `text-green-700`, `bg-green-50` |
| Expense/Negative | Red | `text-red-700`, `bg-red-50` |
| Warning | Orange | `text-orange-600`, `bg-orange-50` |
| Investment | Blue-gray | `text-slate-600`, `bg-slate-50` |
| Neutral | Gray | `text-gray-600`, `bg-gray-50` |

### Typography

```tsx
// Headings
<h1 className="text-2xl font-bold">Page Title</h1>
<h2 className="text-xl font-semibold">Section Title</h2>
<h3 className="text-lg font-medium">Subsection</h3>

// Body
<p className="text-sm text-muted-foreground">Description</p>

// Numbers (currency)
<span className="font-mono text-right">12 500 Kc</span>
```

### Spacing

```tsx
// Cards grid
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

// Section spacing
<div className="space-y-4">

// Inline items
<div className="flex items-center gap-2">
```
