# AI Integration

Documentation for the OpenAI integration that powers AI-generated financial insights.

---

## Overview

The application uses OpenAI's GPT-5 mini model to generate personalized financial insights for each section of the application. Insights are generated in Czech and cached to minimize API costs.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Financial Data │────►│  Prompt Builder │────►│   OpenAI API    │
│  (from Database)│     │  (lib/ai-prompts)│    │   (GPT-5 mini)  │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    UI Display   │◄────│  JSON Parser    │◄────│  AI Response    │
│ (AiInsightCard) │     │                 │     │  (Czech text)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Configuration

### Environment Variables

```env
# .env
OPEN_AI_API=sk-proj-your-api-key-here
```

### OpenAI Client Setup

```typescript
// In API routes
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API
})
```

---

## Insight Sections

The AI generates insights for 6 financial sections:

| Section | Purpose | Key Metrics |
|---------|---------|-------------|
| `dashboard` | Overall financial health | Balance, trends, savings rate |
| `expenses` | Spending analysis | Category breakdown, changes |
| `income` | Income stability | Sources, diversification |
| `investments` | Investment strategy | Growth, allocation |
| `goals` | Savings progress | Goal completion, emergency fund |
| `loans` | Loan affordability | Debt ratio, payment burden |

---

## Response Structure

All insights follow the same structure:

```typescript
interface InsightResponse {
  summary: string           // 1-2 sentence overview
  patterns: string[]        // 3-5 detected patterns
  recommendations: string[] // 3-5 actionable recommendations
  healthScore: number       // 0-100 score
  healthLabel: string       // Czech label for score
}
```

### Health Score Ranges

| Score | Label | Description |
|-------|-------|-------------|
| 80-100 | Vynikajici | Excellent financial health |
| 60-79 | Dobry | Good, minor improvements possible |
| 40-59 | Potrebuje pozornost | Needs attention |
| 0-39 | Rizikovy | High risk, action required |

---

## Prompt Building

### Main Function

```typescript
// lib/ai-prompts.ts
export function buildPromptForSection(
  section: string,
  context: SectionContext
): string
```

### Context Interfaces

Each section receives specific context data:

#### Dashboard Context
```typescript
interface DashboardContext {
  year: number
  month: number
  totalIncome: number
  totalExpenses: number
  totalInvestments: number
  balance: number
  previousBalance: number
  savingsRate: number
  topCategories: Array<{ name: string; amount: number }>
  activeLoansCount: number
  totalLoanPayments: number
}
```

#### Expenses Context
```typescript
interface ExpensesContext {
  year: number
  month: number
  totalExpenses: number
  previousExpenses: number
  categories: Array<{
    name: string
    amount: number
    previousAmount: number
    percentChange: number
  }>
  averageMonthlyExpenses: number
}
```

#### Income Context
```typescript
interface IncomeContext {
  year: number
  month: number
  totalIncome: number
  previousIncome: number
  sources: Array<{
    name: string
    amount: number
    previousAmount: number
    percentOfTotal: number
  }>
  incomeStability: number  // Variance indicator
}
```

#### Investments Context
```typescript
interface InvestmentsContext {
  year: number
  month: number
  monthlyInvestment: number
  totalInvested: number
  types: Array<{
    name: string
    monthlyAmount: number
    totalInvested: number
    annualRate: number
    projectedValue: number
  }>
  diversificationScore: number
}
```

#### Goals Context
```typescript
interface GoalsContext {
  year: number
  month: number
  goals: Array<{
    name: string
    currentAmount: number
    targetAmount: number
    progress: number
    isEmergency: boolean
  }>
  emergencyFundStatus: {
    current: number
    recommended: number
    percentComplete: number
  }
  averageMonthlyExpenses: number
}
```

#### Loans Context
```typescript
interface LoansContext {
  year: number
  month: number
  monthlyIncome: number
  monthlyExpenses: number
  availableBudget: number
  activeLoans: Array<{
    name: string
    remainingAmount: number
    monthlyPayment: number
    interestRate: number
  }>
  totalLoanPayments: number
  debtToIncomeRatio: number
}
```

---

## Prompt Templates

Prompts are written in Czech (without diacritics for reliability).

### Example: Expenses Prompt

```
Analyzuj mesicni vydaje rodiny za ${month}/${year}.

Data:
- Celkove vydaje: ${totalExpenses} Kc
- Predchozi mesic: ${previousExpenses} Kc
- Zmena: ${percentChange}%

Kategorie:
${categories.map(c => `- ${c.name}: ${c.amount} Kc (${c.percentChange}%)`).join('\n')}

Prumerny mesicni vydaj: ${averageMonthlyExpenses} Kc

Odpovez ve formatu JSON:
{
  "summary": "1-2 vety shrnuti",
  "patterns": ["vzorec 1", "vzorec 2", "vzorec 3"],
  "recommendations": ["doporuceni 1", "doporuceni 2", "doporuceni 3"],
  "healthScore": cislo 0-100,
  "healthLabel": "Vynikajici|Dobry|Potrebuje pozornost|Rizikovy"
}

Pravidla:
- Pouzij ceske vyrazy bez diakritiky
- Bud konkretni a prakticky
- Zameř se na zlepseni financniho zdravi rodiny
- healthScore: 80+ je vynikajici, 60-79 dobry, 40-59 potrebuje pozornost, pod 40 rizikovy
```

---

## API Implementation

### Insight Generation Route

```typescript
// app/api/ai-insights/route.ts

export async function POST(request: Request) {
  const { section, year, month, forceRefresh } = await request.json()

  // 1. Check cache (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedInsight(section, year, month)
    if (cached && !isStale(cached)) {
      return Response.json({ ...cached, cached: true })
    }
  }

  // 2. Gather context data
  const context = await gatherContextForSection(section, year, month)

  // 3. Build prompt
  const prompt = buildPromptForSection(section, context)

  // 4. Call OpenAI
  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    input: prompt
  })

  // 5. Parse response
  const insights = parseInsightResponse(response.output_text)

  // 6. Cache result
  await cacheInsight(section, year, month, insights)

  // 7. Return
  return Response.json({
    section,
    insights,
    generatedAt: new Date().toISOString(),
    cached: false
  })
}
```

### Response Parsing

```typescript
// lib/ai-prompts.ts

export function parseInsightResponse(output: string): InsightResponse {
  // Extract JSON from response
  const jsonMatch = output.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in response')
  }

  const parsed = JSON.parse(jsonMatch[0])

  // Validate required fields
  return {
    summary: parsed.summary || '',
    patterns: parsed.patterns || [],
    recommendations: parsed.recommendations || [],
    healthScore: Number(parsed.healthScore) || 50,
    healthLabel: parsed.healthLabel || 'Dobry'
  }
}
```

---

## Caching Strategy

### Two-Level Cache

1. **Database Cache (Persistent)**
   - Survives server restarts
   - Stored in `CachedInsight` table
   - Keyed by `[section, year, month]`

2. **In-Memory Cache (Fast)**
   - 1-hour TTL
   - Quick retrieval
   - Falls back to database cache

### Cache Flow

```
Request arrives
      │
      ▼
┌─────────────────┐
│ Check Memory    │──── Hit ────► Return immediately
│ Cache           │
└────────┬────────┘
         │ Miss
         ▼
┌─────────────────┐
│ Check Database  │──── Hit ────► Load to memory, return
│ Cache           │
└────────┬────────┘
         │ Miss
         ▼
┌─────────────────┐
│ Generate Fresh  │
│ (OpenAI API)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store in Both   │──── Return fresh result
│ Caches          │
└─────────────────┘
```

### Stale-While-Revalidate

The UI shows cached content immediately while fetching fresh data in the background:

```typescript
// In AiInsightCard component

useEffect(() => {
  // 1. Try to show cached immediately
  const showCached = async () => {
    const cached = await fetchCachedInsight(section, year, month)
    if (cached) {
      setInsight(cached)
      setIsStale(true)
    }
  }
  showCached()

  // 2. Refresh in background
  const refresh = async () => {
    const fresh = await generateInsight(section, year, month)
    setInsight(fresh)
    setIsStale(false)
  }
  refresh()
}, [section, year, month])
```

---

## Error Handling

### API Errors

```typescript
try {
  const response = await openai.responses.create({...})
} catch (error) {
  if (error.status === 429) {
    // Rate limited - return cached or default
    return getCachedOrDefault(section)
  }
  if (error.status === 401) {
    // Invalid API key
    console.error('Invalid OpenAI API key')
    throw new Error('AI service unavailable')
  }
  throw error
}
```

### Fallback Response

```typescript
const defaultInsight: InsightResponse = {
  summary: 'Momentalne neni mozne vygenerovat analyzu.',
  patterns: [],
  recommendations: ['Zkuste to prosim pozdeji.'],
  healthScore: 50,
  healthLabel: 'Neni k dispozici'
}
```

---

## Cost Optimization

### Strategies Used

1. **Aggressive Caching**
   - Cache for entire month (data doesn't change frequently)
   - Only regenerate on explicit refresh

2. **Efficient Prompts**
   - Concise, structured prompts
   - Request specific JSON format
   - Avoid verbose instructions

3. **Model Selection**
   - GPT-5 mini (cost-effective)
   - Sufficient for financial analysis tasks

4. **Background Prefetching**
   - InsightsPrefetcher component
   - Load insights during navigation
   - Prevents on-demand API calls

### Estimated Usage

| Action | API Calls | Frequency |
|--------|-----------|-----------|
| Page load (cached) | 0 | Common |
| Monthly data change | 1 per section | Rare |
| Manual refresh | 1 | User-initiated |
| New month | 6 (all sections) | Monthly |

---

## Executive Summary

Special consolidated insight combining all sections:

```typescript
// app/api/ai-insights/executive-summary/route.ts

export async function GET(request: Request) {
  const { year, month } = getParams(request)

  // Gather comprehensive context
  const context = {
    ...await getDashboardContext(year, month),
    ...await getExpensesContext(year, month),
    ...await getIncomeContext(year, month),
    ...await getInvestmentsContext(year, month),
    ...await getGoalsContext(year, month),
    ...await getLoansContext(year, month)
  }

  const prompt = buildExecutiveSummary(context)

  // Generate consolidated insight
  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    input: prompt
  })

  return Response.json(parseInsightResponse(response.output_text))
}
```

---

## Testing

### Mock OpenAI for Tests

```typescript
// In test setup
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    responses: {
      create: jest.fn().mockResolvedValue({
        output_text: JSON.stringify({
          summary: 'Test summary',
          patterns: ['Pattern 1'],
          recommendations: ['Recommendation 1'],
          healthScore: 75,
          healthLabel: 'Dobry'
        })
      })
    }
  }))
}))
```

### Testing Prompts

```typescript
describe('buildPromptForSection', () => {
  it('includes all context data for expenses', () => {
    const context = {
      year: 2024,
      month: 6,
      totalExpenses: 50000,
      categories: [{ name: 'Potraviny', amount: 10000 }]
    }

    const prompt = buildPromptForSection('expenses', context)

    expect(prompt).toContain('50000')
    expect(prompt).toContain('Potraviny')
    expect(prompt).toContain('JSON')
  })
})
```

---

## Adding New Insight Sections

1. **Define Context Interface**
   ```typescript
   // lib/ai-prompts.ts
   interface NewSectionContext {
     year: number
     month: number
     // Add relevant fields
   }
   ```

2. **Create Prompt Builder**
   ```typescript
   function buildNewSectionPrompt(context: NewSectionContext): string {
     return `
       Analyzuj ${context.dataDescription}...

       Data:
       ${formatContextData(context)}

       Odpovez ve formatu JSON:
       ${JSON_TEMPLATE}
     `
   }
   ```

3. **Add to Section Handler**
   ```typescript
   // In buildPromptForSection
   case 'newSection':
     return buildNewSectionPrompt(context)
   ```

4. **Create UI Component**
   ```tsx
   <AiInsightCard
     section="newSection"
     year={year}
     month={month}
   />
   ```

5. **Add to InsightsPrefetcher**
   ```tsx
   <InsightsPrefetcher
     sections={[..., 'newSection']}
     year={year}
     month={month}
   />
   ```
