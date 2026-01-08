import { prisma } from '@/lib/db'
import { getPeriodFromRequest, successResponse, errorResponse } from '@/lib/api'
import { isClaudeCliAvailable, callClaudeForJson } from '@/lib/claude'
import { createHash } from 'crypto'
import type { AIInsightsResponse, HealthScore } from '@/lib/types'

// Check if Claude CLI is available for AI calls (uses Max subscription, no API charges)
// Falls back to demo mode if CLI is not available
const claudeCliAvailable = isClaudeCliAvailable()

// Response type for Claude AI insights
interface ClaudeAIInsightsResponse {
  overview: {
    healthScore: {
      score: number
      label: 'výborné' | 'dobré' | 'uspokojivé' | 'rizikové' | 'kritické'
      description: string
    }
    narrative: string
    highlights: string[]
    warnings: string[]
    suggestions: Array<{
      id: string
      text: string
      impact: 'vysoký' | 'střední' | 'nízký'
    }>
  }
  categories: Array<{
    categoryName: string
    insight: string
    trend: 'up' | 'down' | 'stable'
    benchmarkComparison: string | null
  }>
}

// Transform array-based categories to record format
function transformCategoriesToRecord(
  categoriesArray: ClaudeAIInsightsResponse['categories']
): Record<string, { insight: string; trend: 'up' | 'down' | 'stable'; benchmarkComparison?: string }> {
  const result: Record<string, { insight: string; trend: 'up' | 'down' | 'stable'; benchmarkComparison?: string }> = {}
  for (const cat of categoriesArray) {
    result[cat.categoryName] = {
      insight: cat.insight,
      trend: cat.trend,
      benchmarkComparison: cat.benchmarkComparison || undefined,
    }
  }
  return result
}

// Generate a hash of the financial data for cache invalidation
function generateDataHash(data: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16)
}

// Gather all financial data for the AI prompt
async function gatherFinancialData(year: number, month: number) {
  const [
    expenses,
    incomes,
    investments,
    savingGoals,
    activeLoans,
    householdSettings,
    historicalExpenses,
  ] = await Promise.all([
    // Current month expenses
    prisma.expense.findMany({
      where: { year, month },
      include: { category: true },
    }),
    // Current month income
    prisma.income.findMany({
      where: { year, month },
      include: { source: true },
    }),
    // Current month investments
    prisma.investment.findMany({
      where: { year, month },
      include: { type: true },
    }),
    // Saving goals
    prisma.savingGoal.findMany({
      orderBy: { order: 'asc' },
    }),
    // Active loans
    prisma.activeLoan.findMany(),
    // Household settings
    prisma.householdSettings.findUnique({
      where: { id: 'default' },
    }),
    // Historical expenses (last 12 months for trend analysis)
    prisma.expense.findMany({
      where: {
        OR: Array.from({ length: 12 }, (_, i) => {
          let m = month - i - 1
          let y = year
          while (m <= 0) {
            m += 12
            y -= 1
          }
          return { year: y, month: m }
        }),
      },
      include: { category: true },
    }),
  ])

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
  const totalInvestments = investments.reduce((sum, i) => sum + i.amount, 0)
  const totalLoanPayments = activeLoans.reduce((sum, l) => sum + l.monthlyPayment, 0)
  const balance = totalIncome - totalExpenses - totalInvestments - totalLoanPayments

  // Emergency fund is tracked via saving goals marked as isEmergency
  const emergencyFundGoal = savingGoals.find(g => g.isEmergency)
  const emergencyFundBalance = emergencyFundGoal?.currentAmount ?? 0

  // Group expenses by category for analysis
  const expensesByCategory = expenses.map((e) => ({
    category: e.category.name,
    amount: e.amount,
  }))

  // Group income by source
  const incomeBySource = incomes.map((i) => ({
    source: i.source.name,
    amount: i.amount,
  }))

  // Calculate 3-month averages for anomaly detection
  const categoryAverages: Record<string, number> = {}
  const categoryHistory: Record<string, number[]> = {}

  historicalExpenses.forEach((e) => {
    if (!categoryHistory[e.category.name]) {
      categoryHistory[e.category.name] = []
    }
    categoryHistory[e.category.name].push(e.amount)
  })

  Object.entries(categoryHistory).forEach(([cat, amounts]) => {
    const last3 = amounts.slice(0, 3)
    categoryAverages[cat] = last3.length > 0 ? last3.reduce((a, b) => a + b, 0) / last3.length : 0
  })

  // Saving goals with progress
  // Use household settings for emergency fund target calculation
  const emergencyFundMonths = householdSettings?.emergencyFundMonths ?? 3
  const calculatedEmergencyTarget = totalExpenses * emergencyFundMonths
  const userDefinedEmergencyTarget = householdSettings?.emergencyFundTarget
  const effectiveEmergencyTarget = userDefinedEmergencyTarget ?? calculatedEmergencyTarget

  const goalsWithProgress = savingGoals.map((goal) => {
    // For emergency fund, prioritize household settings custom target over goal's targetAmount
    const effectiveTarget = goal.isEmergency
      ? userDefinedEmergencyTarget ?? goal.targetAmount ?? calculatedEmergencyTarget
      : goal.targetAmount

    return {
      name: goal.name,
      currentAmount: goal.currentAmount,
      targetAmount: effectiveTarget,
      isEmergency: goal.isEmergency,
      progress: effectiveTarget ? (goal.currentAmount / effectiveTarget) * 100 : 0,
      recommendedTarget: goal.isEmergency ? effectiveEmergencyTarget : undefined,
      userDefinedTarget: goal.isEmergency ? userDefinedEmergencyTarget : undefined,
    }
  })

  // Investment projections
  const investmentProjections = investments.map((inv) => {
    const type = inv.type
    if (type.totalInvested && type.annualRate && type.investmentYears) {
      const futureValue =
        type.totalInvested * Math.pow(1 + type.annualRate, type.investmentYears)
      return {
        name: type.name,
        currentMonthly: inv.amount,
        totalInvested: type.totalInvested,
        projectedValue: Math.round(futureValue),
        years: type.investmentYears,
        annualRate: type.annualRate,
      }
    }
    return {
      name: type.name,
      currentMonthly: inv.amount,
    }
  })

  // Active loans summary
  const loansSummary = activeLoans.map((loan) => {
    const monthsSinceStart = Math.floor(
      (Date.now() - new Date(loan.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
    const paymentsMade = Math.min(monthsSinceStart, loan.termMonths)
    const monthsRemaining = loan.termMonths - paymentsMade

    return {
      name: loan.name,
      type: loan.type,
      originalAmount: loan.originalAmount,
      remainingAmount: loan.remainingAmount,
      monthlyPayment: loan.monthlyPayment,
      interestRate: loan.interestRate,
      monthsRemaining,
      paidOffPercent: ((loan.originalAmount - loan.remainingAmount) / loan.originalAmount) * 100,
    }
  })

  // Calculate total loan balance
  const totalLoanBalance = activeLoans.reduce((sum, l) => sum + l.remainingAmount, 0)

  return {
    period: { year, month },
    household: householdSettings || {
      totalMembers: 1,
      dependentChildren: 0,
      adults: 1,
      emergencyFundTarget: null,
      emergencyFundMonths: 3,
    },
    totalLoanBalance,
    summary: {
      totalIncome,
      totalExpenses,
      totalInvestments,
      totalLoanPayments,
      balance,
      savingsRate: totalIncome > 0 ? (balance / totalIncome) * 100 : 0,
    },
    emergencyFundStatus: {
      currentBalance: emergencyFundBalance,
      goalName: emergencyFundGoal?.name,
    },
    emergencyFund: {
      effectiveTarget: effectiveEmergencyTarget,
      userDefinedTarget: userDefinedEmergencyTarget,
      monthsOfExpenses: emergencyFundMonths,
    },
    expensesByCategory,
    incomeBySource,
    categoryAverages,
    goalsWithProgress,
    investmentProjections,
    loansSummary,
    hasHistoricalData: historicalExpenses.length > 0,
  }
}

// Calculate financial health score (0-100)
function calculateHealthScore(data: Awaited<ReturnType<typeof gatherFinancialData>>): HealthScore {
  const { summary, goalsWithProgress, loansSummary, totalLoanBalance } = data

  let score = 100
  const factors: string[] = []

  // 1. Budget Balance (max -30 points)
  // Positive balance is good, deficit is bad
  if (summary.balance < 0) {
    const deficitRatio = Math.abs(summary.balance) / summary.totalIncome
    const deduction = Math.min(30, deficitRatio * 100)
    score -= deduction
    factors.push('záporná bilance')
  }

  // 2. Savings Rate (max -25 points)
  // Target: 20% savings rate
  const savingsRate = summary.savingsRate
  if (savingsRate < 20) {
    const deduction = Math.min(25, (20 - savingsRate) * 1.25)
    score -= deduction
    if (savingsRate < 10) {
      factors.push('nízká míra úspor')
    }
  }

  // 3. Emergency Fund (max -25 points)
  // Target: 100% of goal (3-6 months expenses)
  const emergencyFund = goalsWithProgress.find(g => g.isEmergency)
  if (emergencyFund) {
    const progress = emergencyFund.progress
    if (progress < 100) {
      const deduction = Math.min(25, (100 - progress) * 0.25)
      score -= deduction
      if (progress < 50) {
        factors.push('nedostatečný nouzový fond')
      }
    }
  } else {
    // No emergency fund at all - significant deduction
    score -= 20
    factors.push('chybí nouzový fond')
  }

  // 4. Debt-to-Income Ratio (max -20 points)
  // Monthly loan payments as % of income
  if (summary.totalIncome > 0 && loansSummary.length > 0) {
    const totalMonthlyPayments = loansSummary.reduce((sum, l) => sum + l.monthlyPayment, 0)
    const debtRatio = (totalMonthlyPayments / summary.totalIncome) * 100
    if (debtRatio > 30) {
      const deduction = Math.min(20, (debtRatio - 30) * 0.5)
      score -= deduction
      if (debtRatio > 40) {
        factors.push('vysoké zadlužení')
      }
    }
  }

  // Ensure score stays within bounds
  score = Math.max(0, Math.min(100, Math.round(score)))

  // Determine label and description
  let label: HealthScore['label']
  let description: string

  if (score >= 85) {
    label = 'výborné'
    description = 'Vaše finance jsou ve výborném stavu. Udržujte současný kurz.'
  } else if (score >= 70) {
    label = 'dobré'
    description = factors.length > 0
      ? `Dobré finanční zdraví s prostorem pro zlepšení: ${factors.join(', ')}.`
      : 'Dobré finanční zdraví s prostorem pro optimalizaci.'
  } else if (score >= 50) {
    label = 'uspokojivé'
    description = factors.length > 0
      ? `Uspokojivé, ale doporučujeme řešit: ${factors.join(', ')}.`
      : 'Uspokojivé finanční zdraví, zvažte optimalizaci.'
  } else if (score >= 30) {
    label = 'rizikové'
    description = factors.length > 0
      ? `Rizikový stav financí. Prioritně řešte: ${factors.join(', ')}.`
      : 'Rizikový stav financí vyžadující pozornost.'
  } else {
    label = 'kritické'
    description = factors.length > 0
      ? `Kritický stav financí! Okamžitě řešte: ${factors.join(', ')}.`
      : 'Kritický stav financí vyžadující okamžitou akci.'
  }

  return { score, label, description }
}

// Build the system prompt for the AI
function buildSystemPrompt() {
  return `Jsi profesionální finanční poradce pro českou rodinu. Analyzuješ měsíční finanční data a poskytuje cenné postřehy.

DŮLEŽITÉ: Odpověz POUZE jako validní JSON objekt. Žádný jiný text.

POKYNY:
1. VŠE piš v češtině - profesionálním, bankovním stylem
2. Nepoužívej emoji
3. Buď konkrétní s čísly a procenty
4. Zaměř se na konstruktivní rady, ne kritiku
5. Rozumíš kontextu české domácnosti (např. "Matthew na domácnost" je příspěvek partnera)

Vrať odpověď jako JSON v tomto formátu:
{
  "overview": {
    "healthScore": {
      "score": 0-100,
      "label": "výborné|dobré|uspokojivé|rizikové|kritické",
      "description": "krátký popis finančního zdraví a hlavních faktorů"
    },
    "narrative": "2-3 věty shrnující celkové finanční zdraví",
    "highlights": ["klíčový bod 1", "klíčový bod 2", "klíčový bod 3"],
    "warnings": ["varování pokud jsou, jinak prázdné pole"],
    "suggestions": [
      {"id": "sug1", "text": "doporučení", "impact": "vysoký|střední|nízký"}
    ]
  },
  "categories": [
    {
      "categoryName": "název kategorie",
      "insight": "postřeh o kategorii",
      "trend": "up|down|stable",
      "benchmarkComparison": "srovnání s českým průměrem nebo null"
    }
  ]
}

PRAVIDLA PRO HEALTH SCORE:
- 85-100: "výborné" - skvělé finanční zdraví
- 70-84: "dobré" - dobré s prostorem pro zlepšení
- 50-69: "uspokojivé" - vyžaduje pozornost
- 30-49: "rizikové" - vyžaduje zásah
- 0-29: "kritické" - okamžitá akce nutná

Hodnotící faktory:
- Bilance příjmů a výdajů (kladná = +, záporná = -)
- Míra úspor (ideál 20%+)
- Stav nouzového fondu (ideál 100% cíle)
- Zadlužení (splátky < 30% příjmů = OK)

PRAVIDLA PRO ANALÝZU:
- Nouzový fond pod 80% cíle = prioritizuj jeho doplnění
- Nouzový fond je sledován jako spořicí cíl označený jako "NOUZOVÝ FOND"
- Pokud výdaje > příjmy, konstruktivně navrhni řešení
- Anomálie = změna >20% oproti 3měsíčnímu průměru
- Srovnej s českými benchmarky: potraviny ~3500 Kč/os., bydlení ~25% příjmů

DŮLEŽITÉ PRO SROZUMITELNOST:
- Vždy uveď kontext procent, např. "míra úspor 37% příjmů" nebo "splátky tvoří 25% příjmů"
- Nikdy nepíš jen "37%" bez vysvětlení, z čeho je to procento počítáno
- U porovnání s cílem piš "11% z cílové částky" ne jen "11%"`
}

// Build the user prompt with financial data
function buildUserPrompt(data: Awaited<ReturnType<typeof gatherFinancialData>>) {
  const czechMonths = [
    'ledna', 'února', 'března', 'dubna', 'května', 'června',
    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'
  ]

  return `Analyzuj finanční data za ${czechMonths[data.period.month - 1]} ${data.period.year}:

DOMÁCNOST:
- Počet členů: ${data.household.totalMembers}
- Dospělí: ${data.household.adults}
- Závislé děti: ${data.household.dependentChildren}

SOUHRN:
- Celkové příjmy: ${data.summary.totalIncome.toLocaleString('cs-CZ')} Kč
- Celkové výdaje: ${data.summary.totalExpenses.toLocaleString('cs-CZ')} Kč
- Celkové investice: ${data.summary.totalInvestments.toLocaleString('cs-CZ')} Kč
- Splátky půjček: ${data.summary.totalLoanPayments.toLocaleString('cs-CZ')} Kč
- Měsíční přebytek: ${data.summary.balance.toLocaleString('cs-CZ')} Kč (příjmy - výdaje - investice - splátky)
- Míra úspor: ${data.summary.savingsRate.toFixed(1)}% (přebytek / příjmy × 100)

NOUZOVÝ FOND:
- Aktuální stav: ${data.emergencyFundStatus.currentBalance.toLocaleString('cs-CZ')} Kč${data.emergencyFundStatus.goalName ? ` (fond: "${data.emergencyFundStatus.goalName}")` : ' (žádný nouzový fond nevytvořen)'}
- Cílová částka: ${data.emergencyFund.effectiveTarget.toLocaleString('cs-CZ')} Kč${data.emergencyFund.userDefinedTarget ? ' (uživatelem definováno)' : ` (${data.emergencyFund.monthsOfExpenses}× měsíční výdaje)`}

VÝDAJE PO KATEGORIÍCH:
${data.expensesByCategory.map((e) => `- ${e.category}: ${e.amount.toLocaleString('cs-CZ')} Kč`).join('\n')}

3MĚSÍČNÍ PRŮMĚRY (pro detekci anomálií):
${Object.entries(data.categoryAverages).map(([cat, avg]) => `- ${cat}: ${Math.round(avg).toLocaleString('cs-CZ')} Kč`).join('\n')}

PŘÍJMY:
${data.incomeBySource.map((i) => `- ${i.source}: ${i.amount.toLocaleString('cs-CZ')} Kč`).join('\n')}

SPOŘICÍ CÍLE:
${data.goalsWithProgress.map((g) =>
  `- ${g.name}${g.isEmergency ? ' (NOUZOVÝ FOND)' : ''}: ${g.currentAmount.toLocaleString('cs-CZ')} / ${g.targetAmount?.toLocaleString('cs-CZ') || 'bez cíle'} Kč (${g.progress.toFixed(0)}%)`
).join('\n')}

INVESTICE:
${data.investmentProjections.map((i) => {
  if ('projectedValue' in i && i.projectedValue) {
    return `- ${i.name}: měsíčně ${i.currentMonthly.toLocaleString('cs-CZ')} Kč, celkem investováno ${i.totalInvested?.toLocaleString('cs-CZ')} Kč, projekce za ${i.years} let: ${i.projectedValue.toLocaleString('cs-CZ')} Kč (${((i.annualRate || 0) * 100).toFixed(0)}% p.a.)`
  }
  return `- ${i.name}: ${i.currentMonthly.toLocaleString('cs-CZ')} Kč`
}).join('\n') || 'Žádné investice'}

AKTIVNÍ PŮJČKY:
${data.loansSummary.length > 0 ? data.loansSummary.map((l) =>
  `- ${l.name}: zbývá ${l.remainingAmount.toLocaleString('cs-CZ')} Kč, splátka ${l.monthlyPayment.toLocaleString('cs-CZ')} Kč/měs, splaceno ${l.paidOffPercent.toFixed(0)}%, zbývá ${l.monthsRemaining} měsíců`
).join('\n') : 'Žádné aktivní půjčky'}

${!data.hasHistoricalData ? '\nPOZNÁMKA: Omezená historická data - zaměř se na benchmarky a cíle.' : ''}

Vrať analýzu jako JSON dle specifikované struktury.`
}

// Generate demo insights when OpenAI is not configured
function generateDemoInsights(data: Awaited<ReturnType<typeof gatherFinancialData>>) {
  const { summary, expensesByCategory, goalsWithProgress, loansSummary, household } = data

  // Calculate health score
  const healthScore = calculateHealthScore(data)

  // Calculate key metrics
  const savingsRate = summary.savingsRate
  const hasDeficit = summary.balance < 0
  const emergencyFund = goalsWithProgress.find(g => g.isEmergency)
  const emergencyFundProgress = emergencyFund?.progress || 0

  // Generate narrative based on data
  let narrative = ''
  if (hasDeficit) {
    narrative = `Tento měsíc máte výdaje vyšší než příjmy o ${Math.abs(summary.balance).toLocaleString('cs-CZ')} Kč. Doporučuji přehodnotit výdaje v některých kategoriích.`
  } else if (savingsRate > 20) {
    narrative = `Výborné finanční hospodaření! Míra úspor ${savingsRate.toFixed(1)} % příjmů je nadprůměrná. Celková bilance je ${summary.balance.toLocaleString('cs-CZ')} Kč.`
  } else if (savingsRate > 10) {
    narrative = `Dobré finanční hospodaření s mírou úspor ${savingsRate.toFixed(1)} % příjmů. Vaše bilance činí ${summary.balance.toLocaleString('cs-CZ')} Kč.`
  } else {
    narrative = `Vaše finanční situace je stabilní s bilancí ${summary.balance.toLocaleString('cs-CZ')} Kč. Míra úspor je ${savingsRate.toFixed(1)} % příjmů – zvažte možnosti navýšení.`
  }

  // Generate highlights
  const highlights: string[] = []
  highlights.push(`Celkové příjmy: ${summary.totalIncome.toLocaleString('cs-CZ')} Kč`)
  highlights.push(`Celkové výdaje: ${summary.totalExpenses.toLocaleString('cs-CZ')} Kč`)
  if (summary.totalInvestments > 0) {
    highlights.push(`Investováno: ${summary.totalInvestments.toLocaleString('cs-CZ')} Kč`)
  }

  // Generate warnings
  const warnings: string[] = []
  if (hasDeficit) {
    warnings.push('Výdaje převyšují příjmy - doporučuji provést revizi rozpočtu')
  }
  if (emergencyFund && emergencyFundProgress < 80) {
    warnings.push(`Nouzový fond je na ${emergencyFundProgress.toFixed(0)} % cílové částky - prioritizujte jeho doplnění`)
  }
  if (loansSummary.length > 0) {
    const totalLoanPayments = loansSummary.reduce((sum, l) => sum + l.monthlyPayment, 0)
    const loanRatio = (totalLoanPayments / summary.totalIncome) * 100
    if (loanRatio > 30) {
      warnings.push(`Splátky půjček tvoří ${loanRatio.toFixed(0)} % příjmů - zvažte refinancování`)
    }
  }

  // Generate suggestions
  const suggestions = []
  if (emergencyFund && emergencyFundProgress < 100) {
    suggestions.push({
      id: 'emergency',
      text: `Navyšte nouzový fond na 100 % cílové částky (chybí ${((emergencyFund.targetAmount || 0) - emergencyFund.currentAmount).toLocaleString('cs-CZ')} Kč)`,
      impact: emergencyFundProgress < 50 ? 'vysoký' as const : 'střední' as const,
    })
  }
  if (savingsRate < 20 && !hasDeficit) {
    suggestions.push({
      id: 'savings',
      text: 'Zvažte navýšení měsíčních úspor na 20 % příjmů',
      impact: 'střední' as const,
    })
  }

  // Generate category insights
  const categories: Record<string, { insight: string; trend: 'up' | 'down' | 'stable'; benchmarkComparison?: string }> = {}

  const foodExpense = expensesByCategory.find(e => e.category === 'Potraviny')
  if (foodExpense) {
    const perCapita = foodExpense.amount / household.totalMembers
    const benchmark = 3500
    const diff = ((perCapita - benchmark) / benchmark) * 100
    categories['Potraviny'] = {
      insight: `Výdaje na potraviny činí ${foodExpense.amount.toLocaleString('cs-CZ')} Kč, tedy ${perCapita.toLocaleString('cs-CZ')} Kč na osobu.`,
      trend: diff > 10 ? 'up' : diff < -10 ? 'down' : 'stable',
      benchmarkComparison: `Průměr české domácnosti je cca 3 500 Kč na osobu (${diff > 0 ? '+' : ''}${diff.toFixed(0)} % oproti průměru).`,
    }
  }

  const housingExpense = expensesByCategory.find(e => e.category === 'Bydlení')
  if (housingExpense && summary.totalIncome > 0) {
    const housingRatio = (housingExpense.amount / summary.totalIncome) * 100
    categories['Bydlení'] = {
      insight: `Náklady na bydlení tvoří ${housingRatio.toFixed(1)} % vašich příjmů.`,
      trend: housingRatio > 30 ? 'up' : housingRatio < 20 ? 'down' : 'stable',
      benchmarkComparison: `Doporučené maximum je 25–30 % příjmů.`,
    }
  }

  return {
    overview: {
      healthScore,
      narrative,
      highlights,
      warnings,
      suggestions,
    },
    categories,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const forceRefresh = searchParams.get('forceRefresh') === 'true'
  const { year, month } = getPeriodFromRequest(request)

  try {
    // OPTIMIZATION: Check cache FIRST before gathering data
    // Cache is invalidated when data changes, so we can trust it
    if (!forceRefresh) {
      const cached = await prisma.aIInsightsCache.findUnique({
        where: { id: 'default' },
      })

      if (cached) {
        const insights = JSON.parse(cached.overviewInsight)
        const categories = JSON.parse(cached.categoryInsights)

        return successResponse({
          overview: insights,
          categories,
          metadata: {
            generatedAt: cached.generatedAt.toISOString(),
            dataHash: cached.dataHash,
            isStale: false,
          },
        } as AIInsightsResponse)
      }
    }

    // No cache or force refresh - gather financial data
    const financialData = await gatherFinancialData(year, month)

    // Check if we have any data to analyze
    if (
      financialData.expensesByCategory.length === 0 &&
      financialData.incomeBySource.length === 0
    ) {
      return successResponse({
        overview: {
          healthScore: {
            score: 0,
            label: 'kritické' as const,
            description: 'Žádná data k vyhodnocení. Přidejte příjmy a výdaje.',
          },
          narrative: 'Zatím nemáte zadané žádné finanční údaje za tento měsíc.',
          highlights: ['Začněte přidáním příjmů a výdajů'],
          warnings: [],
          suggestions: [
            { id: 'start', text: 'Přidejte své měsíční příjmy a výdaje pro získání analýzy', impact: 'vysoký' as const }
          ],
        },
        categories: {},
        metadata: {
          generatedAt: new Date().toISOString(),
          dataHash: 'empty',
          isStale: false,
        },
      })
    }

    // Generate data hash for cache validation
    const dataHash = generateDataHash(financialData)

    // Generate new insights with Claude CLI (uses Max subscription) or use demo response
    let result: { overview: unknown; categories: unknown }

    if (!claudeCliAvailable) {
      // Generate demo response when Claude CLI is not available
      console.log('Claude CLI not available, using demo insights')
      result = generateDemoInsights(financialData)
    } else {
      // Use Claude CLI with Max subscription (no API charges!)
      console.log('Calling Claude via CLI (using Max subscription)...')
      const parsed = await callClaudeForJson<ClaudeAIInsightsResponse>(
        buildSystemPrompt(),
        buildUserPrompt(financialData),
        { timeout: 120000 } // 2 minute timeout for AI processing
      )

      // Transform categories array to record format
      result = {
        overview: parsed.overview,
        categories: transformCategoriesToRecord(parsed.categories),
      }
    }

    // Cache the result
    await prisma.aIInsightsCache.upsert({
      where: { id: 'default' },
      update: {
        overviewInsight: JSON.stringify(result.overview),
        categoryInsights: JSON.stringify(result.categories || {}),
        generatedAt: new Date(),
        dataHash,
      },
      create: {
        id: 'default',
        overviewInsight: JSON.stringify(result.overview),
        categoryInsights: JSON.stringify(result.categories || {}),
        generatedAt: new Date(),
        dataHash,
      },
    })

    return successResponse({
      overview: result.overview,
      categories: result.categories || {},
      metadata: {
        generatedAt: new Date().toISOString(),
        dataHash,
        isStale: false,
      },
    } as AIInsightsResponse)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error && 'cause' in error ? error.cause : undefined
    console.error('Error generating AI insights:', errorMessage, errorDetails, error)

    // Try to return stale cache on error
    const cached = await prisma.aIInsightsCache.findUnique({
      where: { id: 'default' },
    })

    if (cached) {
      const insights = JSON.parse(cached.overviewInsight)
      const categories = JSON.parse(cached.categoryInsights)

      return successResponse({
        overview: insights,
        categories,
        metadata: {
          generatedAt: cached.generatedAt.toISOString(),
          dataHash: cached.dataHash,
          isStale: true,
        },
      } as AIInsightsResponse)
    }

    return errorResponse('Failed to generate AI insights')
  }
}

// POST endpoint - redirects to GET with forceRefresh
export async function POST(request: Request) {
  // POST now just triggers a force refresh using the same logic as GET
  const { year, month } = getPeriodFromRequest(request)
  const url = new URL(request.url)
  url.searchParams.set('forceRefresh', 'true')
  url.searchParams.set('year', year.toString())
  url.searchParams.set('month', month.toString())

  // Create a new request with the modified URL
  const newRequest = new Request(url.toString(), {
    method: 'GET',
    headers: request.headers,
  })

  return GET(newRequest)
}
