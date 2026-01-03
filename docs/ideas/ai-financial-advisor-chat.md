# AI Financial Advisor Chat

## Overview

An interactive chat feature that allows users to have conversations with an AI about their finances. The AI has full context of the user's financial situation from the database and can answer personalized questions.

## Motivation

We already have comprehensive financial data in the database:
- Monthly income/expenses across 15 categories
- 12 months of historical data for trends
- Savings goals with progress tracking
- Investment portfolios with growth projections
- Active loans with stress testing capability
- Household composition (adults, children)
- Health score algorithm (0-100)

This data can power a conversational AI that gives personalized financial advice.

## Example User Questions

### Budgeting & Spending
- "Kde utracím nejvíc?" (Where do I spend the most?)
- "Jak snížit výdaje o 5000 Kc mesícne?" (How to cut 5000 Kc/month?)
- "Je moje útrata za restaurace normální?" (Is my restaurant spending normal?)

### Borrowing & Debt
- "Kolik si muzu rozumne pujcit?" (How much can I reasonably borrow?)
- "Mám predcasne splatit hypotéku?" (Should I pay off mortgage early?)
- "Zvládnu novou splátku 8000 Kc?" (Can I handle a new 8000 Kc payment?)

### Savings & Goals
- "Jak rychle dosáhnu svého cíle?" (How fast will I reach my goal?)
- "Mám dost v nouzovém fondu?" (Do I have enough in emergency fund?)
- "Kolik bych mel sporit mesícne?" (How much should I save monthly?)

### Investments
- "Jaký je výhled mých investic za 10 let?" (What's my 10-year investment outlook?)
- "Mel bych zvýšit investice?" (Should I increase investments?)

### What-If Scenarios
- "Co když prijdu o práci?" (What if I lose my job?)
- "Zvládnu hypotéku, když klesne príjem o 20%?" (Can I handle mortgage with 20% income drop?)

## Technical Architecture

### API Structure

```typescript
// app/api/ai/chat/route.ts
POST /api/ai/chat
{
  message: string,
  conversationHistory: Message[],
  year: number,
  month: number
}

// Response
{
  response: string,
  dataUsed: string[],  // transparency: what data was consulted
  suggestions?: ActionSuggestion[]  // optional follow-up actions
}
```

### UI Mockup

```
+-----------------------------------------------------+
|                   Chat Interface                     |
|  +---------------------------------------------+    |
|  | AI: Jak vám mohu pomoci s financemi?        |    |
|  +---------------------------------------------+    |
|  +---------------------------------------------+    |
|  | User: Kolik si muzu pujcit na auto?         |    |
|  +---------------------------------------------+    |
|  +---------------------------------------------+    |
|  | AI: Na základe vašich financí...            |    |
|  |    - Príjem: 85 000 Kc                      |    |
|  |    - Volné prostredky: 12 000 Kc            |    |
|  |    - Doporucená max. splátka: 8 500 Kc      |    |
|  |    Muzete si pujcit cca 350 000 Kc...       |    |
|  +---------------------------------------------+    |
|                                                      |
|  [____________________________________] [Odeslat]   |
+-----------------------------------------------------+
```

## Design Decisions

### 1. Conversation Memory

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| Stateless | Each message independent | Simple | No context |
| Session-based | Remember last N messages | Good UX | Memory management |
| Persistent | Stored in DB | Full history | Storage, complexity |

**Recommendation:** Start with session-based (last 10 messages).

### 2. Data Freshness

- Always fetch live data for each response for accuracy
- Cache the financial snapshot at conversation start for consistency within session

### 3. Suggested Actions

The AI could suggest actionable buttons:
```
"Chcete, abych vám vytvoril rozpocet na snížení výdaju?"
[Ano, vytvor rozpocet] [Ne, díky]
```

### 4. Guardrails

The AI should:
- NOT give specific investment advice (legal reasons)
- NOT guarantee outcomes
- Clearly state it's AI assistance, not professional advice
- Refuse off-topic questions
- Always respond in Czech

### 5. UI Placement Options

| Option | Pros | Cons |
|--------|------|------|
| Dedicated `/poradce` page | Focused experience | Extra navigation |
| Floating chat widget | Always accessible | Screen clutter |
| Sidebar panel | Contextual | Limited space |

## Differentiation from Current Insights

| Current Insights | Chat Advisor |
|------------------|--------------|
| Pre-generated analysis | Interactive Q&A |
| Fixed structure | Free-form conversation |
| Overview focus | Specific questions |
| Monthly refresh | Real-time responses |

The chat complements rather than replaces the insights dashboard.

## Implementation Phases

### Phase 1 - MVP
- Simple chat interface on dedicated page
- Financial context injection using existing `gatherFinancialData()`
- Basic Q&A capability
- Czech language throughout
- Session-based conversation memory

### Phase 2 - Enhanced
- Conversation history persistence
- Suggested questions based on financial state
- Action suggestions (create goal, adjust budget)
- "Show me the numbers" transparency feature

### Phase 3 - Advanced
- What-if simulations in chat
- Goal planning wizard
- Budget optimization suggestions
- Integration with loan calculator
- Voice input support

## Privacy Considerations

- Data is sent to OpenAI for processing
- Add disclaimer: "Data je zpracována pres OpenAI API"
- Consider adding option to see exactly what data is shared
- Local-first architecture means data stays on user's machine

## Open Questions

1. Should conversation history persist across sessions?
2. Should the AI be able to create/modify data (goals, budgets)?
3. What's the ideal UI placement for the chat?
4. Any specific topics that need extra disclaimers?

## Related

- Existing AI insights: `app/api/ai/insights/route.ts`
- Financial data gathering: `gatherFinancialData()` function
- Health score calculation: `calculateHealthScore()` function
