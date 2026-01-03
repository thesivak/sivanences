# AI Financial Overview Specification

## Overview

Add an AI-powered financial overview to the dashboard as the **hero section**, providing users with an intelligent summary of their financial health in **Czech language**. The AI uses OpenAI's GPT-5.2 mini model to analyze user financial data, compare against Czech household benchmarks, and provide actionable improvement suggestions.

---

## Data Model Changes

### New: Household Settings

Add a new `HouseholdSettings` model to store household composition for benchmark comparisons:

```prisma
model HouseholdSettings {
  id                String   @id @default("default")
  totalMembers      Int      @default(1)    // Total people in household
  dependentChildren Int      @default(0)    // Number of dependent children
  adults            Int      @default(1)    // Number of adults

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**UI Requirement:** Add a household settings section (likely in a Settings page or modal) where users can input:
- Total household members
- Number of dependent children
- Number of adults

This data enables meaningful comparison against ČSÚ (Czech Statistical Office) household benchmarks.

### New: AI Insights Cache

```prisma
model AIInsightsCache {
  id              String   @id @default("default")
  overviewInsight String   // Main overview (narrative + bullets)
  categoryInsights String  // JSON: { categoryId: insight }
  generatedAt     DateTime
  dataHash        String   // Hash of source data for invalidation

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### New: AI Feedback

```prisma
model AIFeedback {
  id           String   @id @default(cuid())
  insightType  String   // "overview" | "category" | "suggestion"
  insightId    String?  // Optional: category ID or suggestion identifier
  isPositive   Boolean  // true = thumbs up, false = thumbs down

  createdAt DateTime @default(now())
}
```

### Seed Update: Active Loans

Add realistic loan data to `prisma/seed.ts`:

```typescript
await prisma.activeLoan.upsert({
  where: { id: 'hypoteka' },
  update: {},
  create: {
    id: 'hypoteka',
    name: 'Hypotéka',
    type: 'MORTGAGE',
    originalAmount: 3000000,
    remainingAmount: 2500000,
    interestRate: 5.5,
    monthlyPayment: 18000,
    startDate: new Date('2023-01-01'),
    termMonths: 360,
  },
})
```

---

## API Design

### Endpoint: `/api/ai/insights`

**Method:** GET (for cached) / POST (for refresh)

**Query Parameters:**
- `month` (optional): Compare current month against this historical month
- `forceRefresh` (optional): Bypass cache and regenerate

**Response:** Streaming response (Server-Sent Events) for progressive text rendering

**Response Shape:**
```typescript
interface AIInsightsResponse {
  overview: {
    narrative: string        // Main summary paragraph in Czech
    highlights: string[]     // Bullet points
    warnings: string[]       // Flagged concerns
    suggestions: Suggestion[]
  }
  categories: {
    [categoryId: string]: {
      insight: string
      trend: 'up' | 'down' | 'stable'
      benchmarkComparison?: string
    }
  }
  metadata: {
    generatedAt: string
    dataHash: string
    isStale: boolean        // True if showing cached due to API failure
    comparisonMonth?: string // If comparing to historical month
  }
}

interface Suggestion {
  id: string
  text: string
  impact: 'vysoký' | 'střední' | 'nízký'
}
```

### Cache Invalidation Strategy

Since there's no Redis, use **timestamp comparison**:

1. Store `lastDataModified` timestamp (update on any expense/income/investment/loan change)
2. Store `lastInsightGenerated` timestamp in `AIInsightsCache`
3. On request: if `lastDataModified > lastInsightGenerated`, regenerate insights
4. If OpenAI API fails, return stale cache with `isStale: true`

**Invalidation triggers:**
- Any expense created/updated/deleted
- Any income created/updated/deleted
- Any investment change
- Any saving goal change
- Any loan change
- Household settings change

---

## AI Behavior Specification

### Language & Tone

- **All output in Czech** - professional, bank-advisor style
- Example tone: "Doporučuji zvážit navýšení nouzového fondu" (not casual)
- No emojis unless user data/preferences indicate otherwise

### Data Analysis Scope

The AI receives and analyzes:

1. **Current month data:**
   - All expenses by category with amounts
   - All income by source with amounts
   - Current investment allocations and projections
   - Saving goals with progress
   - Active loans with payments and balances

2. **Historical data (when available):**
   - Up to 12 months of expense history for trend detection
   - Income history for stability assessment

3. **Household context:**
   - Household composition (members, children, adults)
   - Income sources with contributor awareness (AI understands "Matthew na domácnost" as a household contribution)

4. **Benchmarks:**
   - Czech household spending averages from ČSÚ data
   - Adjusted for household composition

### Contributor Awareness

The AI understands household dynamics:
- Knows which income sources are personal vs. shared contributions
- Can provide insights like "Příspěvek od Matthew pokrývá 85% nákladů na bydlení"
- Treats all income as pooled for total calculations, but can break down by contributor

### Emergency Fund Hard Gate (Conditional)

Emergency fund (`isEmergency: true`) has special priority:

- If emergency fund is **below 80%** of target:
  - AI prioritizes emergency fund in all suggestions
  - Other saving goals are mentioned but deprioritized: "Dovolená: pozastaveno, prioritizujte nouzový fond"

- If emergency fund is **at or above 80%** of target:
  - Allow parallel goal progress
  - Still mention emergency fund completion as beneficial

### Hotovost (Cash) Handling

The "Hotovost" investment type is treated as **liquid reserves**, not investment:
- Counted toward emergency preparedness: "Máte likvidní rezervy na 3 měsíce výdajů"
- Not included in investment growth projections
- Considered available buffer for deficit months

### Loan/Debt Analysis

For active loans, provide both:

1. **Net worth focus:** "Vaše čisté jmění je X Kč, snížené o Y Kč nesplacených půjček"
2. **Cash flow focus:** "Splátky půjček spotřebují X% vašich příjmů"

### Investment Projections

Calculate and present future values:
- Use `annualRate` and `investmentYears` from InvestmentType
- Example: "Vaše investice do zlata bude mít hodnotu X Kč za 10 let při současné sazbě"
- Include compound interest calculations

### Spending Anomaly Detection

**Always flag** spending anomalies:
- Any category with >20% change from 3-month average
- Compare against Czech benchmarks where applicable
- Example: "Výdaje za restaurace vzrostly o 40% oproti průměru"

### Deficit Handling

When expenses > income, use **constructive framing**:
- Focus on solutions, not problems
- Example: "Pro vyrovnání rozpočtu zvažte snížení X nebo Y"
- Reference liquid reserves if available: "Váš deficit je kryt hotovostními rezervami na N měsíců"

### Cold Start Behavior (Limited History)

When user has less than 3 months of data:
- **Benchmark-heavy:** Compare against Czech household averages
- **Goal-centric:** Focus on progress toward saving goals
- **Forward-looking:** Project future outcomes at current rate
- Acknowledge limits: "S více daty budeme moci identifikovat trendy"

---

## Overview Structure

The main AI overview combines **narrative + bullet sections**:

```
┌─────────────────────────────────────────────────────────────┐
│  AI Finanční Přehled                              [Refresh] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Narrative paragraph - 2-3 sentences summarizing overall   │
│   financial health, key metrics, and standout observations] │
│                                                             │
│  ━━━ Klíčové body ━━━                                       │
│  • Bullet point 1                                           │
│  • Bullet point 2                                           │
│  • Bullet point 3                                           │
│                                                             │
│  ━━━ Upozornění ━━━                              (if any)   │
│  ⚠ Warning 1                                                │
│  ⚠ Warning 2                                                │
│                                                             │
│  ━━━ Doporučení ━━━                                         │
│  [Vysoký dopad] Suggestion text...            👍 👎         │
│  [Střední dopad] Suggestion text...           👍 👎         │
│  [Nízký dopad] Suggestion text...             👍 👎         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Expandable Category Cards

Below the overview, show category cards that expand on click:

```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ 🛒 Potraviny     │ │ 🏠 Bydlení       │ │ ⚡ Energie       │
│ 15,000 Kč    ▲5% │ │ 18,000 Kč    ─── │ │ 5,500 Kč    ▼2%  │
│ [Click to expand]│ │ [Click to expand]│ │ [Click to expand]│
└──────────────────┘ └──────────────────┘ └──────────────────┘

[Expanded state:]
┌─────────────────────────────────────────────────────────────┐
│ 🛒 Potraviny                                    15,000 Kč   │
├─────────────────────────────────────────────────────────────┤
│ Vaše výdaje za potraviny jsou o 12% vyšší než průměr        │
│ českých domácností vaší velikosti. Oproti minulému měsíci   │
│ jste utratili o 750 Kč více. Zvažte plánování nákupů...     │
│                                                     👍 👎   │
└─────────────────────────────────────────────────────────────┘
```

All category insights are **pre-loaded** with the main overview (single API call) for instant expansion.

---

## Historical Comparison Mode

When user selects a historical month:
- AI always analyzes **current month**
- Adds comparison context: "Ve srovnání s [selected month]..."
- Highlights significant differences

---

## UI Components

### Dashboard Integration

- **Position:** Hero section (first/largest element)
- **Loading:** Stream text progressively (word by word)
- **Refresh:** Manual refresh button (top right)
- **Stale indicator:** If showing cached insights after API failure, show timestamp and subtle indicator

### Feedback UI

Each suggestion and category insight has thumbs up/down:
- Clicking stores feedback to `AIFeedback` table
- No immediate effect on AI behavior (stored for future analysis)
- Visual confirmation on click (thumb fills in)

### Household Settings UI

Add to Settings page or as a modal accessible from dashboard:
- Input fields for total members, children, adults
- Save updates the HouseholdSettings record
- Triggers cache invalidation for AI insights

---

## Error Handling

### OpenAI API Unavailable

1. Attempt to fetch fresh insights
2. If fails, return cached insights with `isStale: true`
3. UI shows: "Vygenerováno před 2 hodinami" with subtle stale indicator
4. Refresh button remains available for retry

### No Data Available

If user has no expenses/income for current month:
- Show helpful onboarding message
- Suggest adding first expense/income
- No AI analysis attempted

### Rate Limiting

If OpenAI rate limits:
- Queue request for retry
- Return stale cache immediately
- Background retry with exponential backoff

---

## Czech Benchmarks Reference

Data source: ČSÚ Household Budget Survey ([csu.gov.cz](https://csu.gov.cz/household-budget-survey))

Key benchmark categories to compare:
- Food spending per capita
- Housing costs as % of income
- Transportation spending
- Utilities (energie)

Benchmarks should be:
- Adjusted for household composition (using HouseholdSettings)
- Updated periodically (annual ČSÚ publications)
- Stored as configuration, not hardcoded

---

## Implementation Notes

### OpenAI Integration

- Use GPT-5.2 mini model
- Use Context7 plugin to fetch latest OpenAI SDK documentation
- Implement streaming response handling
- System prompt should enforce Czech output and professional tone

### Performance Considerations

- Pre-load all category insights in single API call
- Cache aggressively with smart invalidation
- Stream responses for perceived performance
- Consider batching multiple months of historical data in single prompt

### Security

- Never expose raw API keys in frontend
- Validate all user inputs before including in prompts
- Sanitize AI outputs before rendering (prevent XSS)

---

## Out of Scope (v1)

- Conversational follow-up questions (future: chat interface)
- Automatic action execution from suggestions
- Push notifications for anomalies
- Multi-user/family member separate views
- Export AI insights to PDF/email
