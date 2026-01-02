import { NextResponse, NextRequest } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/db'
import {
  buildPromptForSection,
  parseInsightResponse,
  type InsightSection,
  type InsightResponse,
  type DashboardContext,
  type ExpensesContext,
  type IncomeContext,
  type InvestmentsContext,
  type GoalsContext,
  type LoansContext,
} from '@/lib/ai-prompts'

const validSections: InsightSection[] = ['dashboard', 'expenses', 'income', 'investments', 'goals', 'loans']

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API,
})

// In-memory cache with TTL
interface CacheEntry {
  data: AIInsightResult
  expiresAt: number
}

const insightCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 3600000 // 1 hour

interface AIInsightResult {
  section: InsightSection
  insights: InsightResponse
  generatedAt: string
  cached: boolean
}

interface InsightRequest {
  section: InsightSection
  year: number
  month: number
  forceRefresh?: boolean
}

function getCacheKey(section: string, year: number, month: number): string {
  return `${section}-${year}-${month}`
}

function getCachedInsight(key: string): AIInsightResult | null {
  const cached = insightCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, cached: true }
  }
  insightCache.delete(key)
  return null
}

// Generate insight using OpenAI GPT-5 mini via Responses API
async function generateInsight(prompt: string): Promise<string> {
  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    input: prompt,
  })

  return response.output_text?.trim() || ''
}

// Context gathering functions for each section
async function gatherDashboardContext(year: number, month: number): Promise<DashboardContext> {
  // Get current month data
  const [categories, incomeSources, investmentTypes, savingGoals] = await Promise.all([
    prisma.category.findMany({
      include: { expenses: { where: { year, month } } },
      orderBy: { order: 'asc' },
    }),
    prisma.incomeSource.findMany({
      include: { incomes: { where: { year, month } } },
      orderBy: { order: 'asc' },
    }),
    prisma.investmentType.findMany({
      include: { investments: { where: { year, month } } },
      orderBy: { order: 'asc' },
    }),
    prisma.savingGoal.findMany({ orderBy: { order: 'asc' } }),
  ])

  const totalExpenses = categories.reduce((sum, cat) => sum + (cat.expenses[0]?.amount || 0), 0)
  const totalIncome = incomeSources.reduce((sum, src) => sum + (src.incomes[0]?.amount || 0), 0)
  const totalInvestments = investmentTypes.reduce((sum, type) => sum + (type.investments[0]?.amount || 0), 0)

  // Previous month comparison
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const [prevExpenses, prevIncome] = await Promise.all([
    prisma.expense.aggregate({ where: { year: prevYear, month: prevMonth }, _sum: { amount: true } }),
    prisma.income.aggregate({ where: { year: prevYear, month: prevMonth }, _sum: { amount: true } }),
  ])

  const prevTotalExpenses = prevExpenses._sum.amount || 0
  const prevTotalIncome = prevIncome._sum.amount || 0

  // Historical trend (last 6 months)
  const historicalData = await prisma.$queryRaw<Array<{ year: number; month: number; expenses: number; income: number }>>`
    SELECT
      e.year, e.month,
      COALESCE(SUM(e.amount), 0) as expenses,
      COALESCE((SELECT SUM(i.amount) FROM Income i WHERE i.year = e.year AND i.month = e.month), 0) as income
    FROM Expense e
    GROUP BY e.year, e.month
    ORDER BY e.year DESC, e.month DESC
    LIMIT 6
  `

  // Top 5 expenses
  const topExpenses = categories
    .map((cat) => ({ name: cat.name, amount: cat.expenses[0]?.amount || 0 }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // Calculate saving rate
  const savingRate = totalIncome > 0 ? ((totalIncome - totalExpenses - totalInvestments) / totalIncome) * 100 : 0

  // Calculate change percentages
  const incomeChange = prevTotalIncome > 0 ? ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100 : 0
  const expenseChange = prevTotalExpenses > 0 ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : 0

  // Average monthly expenses for goals
  const avgExpensesData = await prisma.expense.groupBy({
    by: ['year', 'month'],
    _sum: { amount: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 3,
  })
  const avgMonthlyExpenses =
    avgExpensesData.reduce((sum, m) => sum + (m._sum.amount || 0), 0) / Math.max(avgExpensesData.length, 1)

  return {
    year,
    month,
    totalIncome,
    totalExpenses,
    totalInvestments,
    balance: totalIncome - totalExpenses - totalInvestments,
    savingRate,
    incomeChange,
    expenseChange,
    topExpenses,
    savingGoals: savingGoals.map((g) => ({
      name: g.name,
      currentAmount: g.currentAmount,
      targetAmount: g.targetAmount,
      progress: g.targetAmount ? (g.currentAmount / g.targetAmount) * 100 : 0,
    })),
    historicalTrend: historicalData.map((h) => ({
      year: Number(h.year),
      month: Number(h.month),
      expenses: Number(h.expenses),
      income: Number(h.income),
    })),
  }
}

async function gatherExpensesContext(year: number, month: number): Promise<ExpensesContext> {
  const categories = await prisma.category.findMany({
    include: { expenses: { where: { year, month } } },
    orderBy: { order: 'asc' },
  })

  const totalExpenses = categories.reduce((sum, cat) => sum + (cat.expenses[0]?.amount || 0), 0)

  // Get historical data for comparisons (last 6 months)
  const historicalExpenses = await prisma.expense.findMany({
    where: {
      OR: Array.from({ length: 6 }, (_, i) => {
        const d = new Date(year, month - 1 - i, 1)
        return { year: d.getFullYear(), month: d.getMonth() + 1 }
      }),
    },
    include: { category: true },
  })

  // Calculate averages per category
  const categoryAverages = new Map<string, { total: number; count: number }>()
  historicalExpenses.forEach((e) => {
    const current = categoryAverages.get(e.categoryId) || { total: 0, count: 0 }
    categoryAverages.set(e.categoryId, { total: current.total + e.amount, count: current.count + 1 })
  })

  // Monthly trend
  const monthlyTotals = await prisma.expense.groupBy({
    by: ['year', 'month'],
    _sum: { amount: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 6,
  })

  return {
    year,
    month,
    totalExpenses,
    categories: categories
      .map((cat) => ({
        name: cat.name,
        amount: cat.expenses[0]?.amount || 0,
        percentOfTotal: totalExpenses > 0 ? ((cat.expenses[0]?.amount || 0) / totalExpenses) * 100 : 0,
      }))
      .filter((c) => c.amount > 0),
    categoryComparisons: categories
      .map((cat) => {
        const avgData = categoryAverages.get(cat.id)
        const averageAmount = avgData ? avgData.total / avgData.count : 0
        const currentAmount = cat.expenses[0]?.amount || 0
        return {
          name: cat.name,
          currentAmount,
          averageAmount,
          deviation: averageAmount > 0 ? ((currentAmount - averageAmount) / averageAmount) * 100 : 0,
        }
      })
      .filter((c) => c.currentAmount > 0 || c.averageAmount > 0),
    monthlyTrend: monthlyTotals.map((m) => ({
      year: m.year,
      month: m.month,
      total: m._sum.amount || 0,
    })),
  }
}

async function gatherIncomeContext(year: number, month: number): Promise<IncomeContext> {
  const sources = await prisma.incomeSource.findMany({
    include: { incomes: { where: { year, month } } },
    orderBy: { order: 'asc' },
  })

  const totalIncome = sources.reduce((sum, src) => sum + (src.incomes[0]?.amount || 0), 0)
  const activeSources = sources.filter((s) => (s.incomes[0]?.amount || 0) > 0).length

  // Find primary source
  const sourceAmounts = sources
    .map((s) => ({ name: s.name, amount: s.incomes[0]?.amount || 0 }))
    .sort((a, b) => b.amount - a.amount)

  const primarySource = sourceAmounts[0] || { name: 'N/A', amount: 0 }

  // Historical data
  const incomeHistory = await prisma.income.groupBy({
    by: ['year', 'month'],
    _sum: { amount: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 6,
  })

  const historyTotals = incomeHistory.map((h) => h._sum.amount || 0)
  const averageIncome = historyTotals.length > 0 ? historyTotals.reduce((a, b) => a + b, 0) / historyTotals.length : 0
  const minIncome = historyTotals.length > 0 ? Math.min(...historyTotals) : 0
  const maxIncome = historyTotals.length > 0 ? Math.max(...historyTotals) : 0

  return {
    year,
    month,
    totalIncome,
    sources: sources
      .map((s) => ({
        name: s.name,
        amount: s.incomes[0]?.amount || 0,
        percentOfTotal: totalIncome > 0 ? ((s.incomes[0]?.amount || 0) / totalIncome) * 100 : 0,
      }))
      .filter((s) => s.amount > 0),
    activeSources,
    primarySource: {
      name: primarySource.name,
      percent: totalIncome > 0 ? (primarySource.amount / totalIncome) * 100 : 0,
    },
    incomeHistory: incomeHistory.map((h) => ({ year: h.year, month: h.month, total: h._sum.amount || 0 })),
    averageIncome,
    minIncome,
    maxIncome,
  }
}

async function gatherInvestmentsContext(year: number, month: number): Promise<InvestmentsContext> {
  const types = await prisma.investmentType.findMany({
    include: { investments: { where: { year, month } } },
    orderBy: { order: 'asc' },
  })

  const totalMonthlyInvestments = types.reduce((sum, type) => sum + (type.investments[0]?.amount || 0), 0)
  const totalInvested = types.reduce((sum, type) => sum + (type.totalInvested || 0), 0)

  // Get income for investment rate
  const income = await prisma.income.aggregate({
    where: { year, month },
    _sum: { amount: true },
  })
  const totalIncome = income._sum.amount || 0
  const investmentRate = totalIncome > 0 ? (totalMonthlyInvestments / totalIncome) * 100 : 0

  // Yearly totals
  const yearlyInvestments = await prisma.investment.aggregate({
    where: { year },
    _sum: { amount: true },
  })
  const yearlyTotal = yearlyInvestments._sum.amount || 0

  // Count months with data this year
  const monthsWithData = await prisma.investment.groupBy({
    by: ['month'],
    where: { year },
  })
  const yearlyAverage = monthsWithData.length > 0 ? yearlyTotal / monthsWithData.length : 0

  // Monthly expenses
  const expenses = await prisma.expense.aggregate({
    where: { year, month },
    _sum: { amount: true },
  })
  const monthlyExpenses = expenses._sum.amount || 0

  // Emergency fund status
  const emergencyGoal = await prisma.savingGoal.findFirst({ where: { isEmergency: true } })
  const avgMonthlyExpenses =
    (
      await prisma.expense.groupBy({
        by: ['year', 'month'],
        _sum: { amount: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 3,
      })
    ).reduce((sum, m) => sum + (m._sum.amount || 0), 0) / 3

  const emergencyTarget = avgMonthlyExpenses * 3
  const emergencyFundStatus = emergencyGoal
    ? emergencyGoal.currentAmount >= emergencyTarget
      ? 'Dostatecny'
      : `${((emergencyGoal.currentAmount / emergencyTarget) * 100).toFixed(0)}% cile`
    : 'Neni nastaven'

  // Calculate projection for each investment type
  const typesWithProjections = types.map((t) => {
    const monthlyAmount = t.investments[0]?.amount || 0
    let projectedFinalValue: number | null = null
    let projectedGain: number | null = null

    if (t.totalInvested && t.annualRate && t.investmentYears && t.totalInvested > 0) {
      const monthlyRate = t.annualRate / 12
      const months = t.investmentYears * 12
      const principalFV = t.totalInvested * Math.pow(1 + monthlyRate, months)
      const contributionsFV = months > 0
        ? monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
        : 0
      projectedFinalValue = Math.round(principalFV + contributionsFV)
      const totalContributions = t.totalInvested + monthlyAmount * 12 * t.investmentYears
      projectedGain = Math.round(projectedFinalValue - totalContributions)
    }

    return {
      name: t.name,
      monthlyAmount,
      totalInvested: t.totalInvested,
      annualRate: t.annualRate,
      investmentYears: t.investmentYears,
      projectedFinalValue,
      projectedGain,
    }
  })

  return {
    year,
    month,
    totalMonthlyInvestments,
    totalInvested,
    investmentRate,
    types: typesWithProjections,
    yearlyTotal,
    yearlyAverage,
    monthlyExpenses,
    investToExpenseRatio: monthlyExpenses > 0 ? totalMonthlyInvestments / monthlyExpenses : 0,
    emergencyFundStatus,
  }
}

async function gatherGoalsContext(year: number, month: number): Promise<GoalsContext> {
  const goals = await prisma.savingGoal.findMany({ orderBy: { order: 'asc' } })

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0)
  const goalsWithTargets = goals.filter((g) => g.targetAmount && g.targetAmount > 0)
  const averageProgress =
    goalsWithTargets.length > 0
      ? goalsWithTargets.reduce((sum, g) => sum + (g.currentAmount / (g.targetAmount || 1)) * 100, 0) /
        goalsWithTargets.length
      : 0

  // Calculate avg monthly expenses
  const avgExpensesData = await prisma.expense.groupBy({
    by: ['year', 'month'],
    _sum: { amount: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 3,
  })
  const avgMonthlyExpenses =
    avgExpensesData.reduce((sum, m) => sum + (m._sum.amount || 0), 0) / Math.max(avgExpensesData.length, 1)

  // Emergency fund status
  const emergencyGoal = goals.find((g) => g.isEmergency)
  const emergencyMonthsCovered = emergencyGoal && avgMonthlyExpenses > 0 ? emergencyGoal.currentAmount / avgMonthlyExpenses : 0

  const emergencyFundStatus =
    emergencyMonthsCovered >= 3 ? 'Dostatecny (3+ mesicu)' : `Nedostatecny (${emergencyMonthsCovered.toFixed(1)} mesicu)`

  // Available for saving
  const [income, expenses] = await Promise.all([
    prisma.income.aggregate({ where: { year, month }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { year, month }, _sum: { amount: true } }),
  ])
  const availableForSaving = (income._sum.amount || 0) - (expenses._sum.amount || 0)

  return {
    totalGoals: goals.length,
    totalSaved,
    averageProgress,
    goals: goals.map((g) => ({
      name: g.name,
      isEmergency: g.isEmergency,
      currentAmount: g.currentAmount,
      targetAmount: g.targetAmount,
      progress: g.targetAmount ? (g.currentAmount / g.targetAmount) * 100 : 0,
      recommendedTarget: g.isEmergency ? avgMonthlyExpenses * 3 : undefined,
    })),
    emergencyFundStatus,
    emergencyMonthsCovered,
    availableForSaving: Math.max(0, availableForSaving),
  }
}

async function gatherLoansContext(year: number, month: number): Promise<LoansContext> {
  // Get income and expenses
  const [income, expenses] = await Promise.all([
    prisma.income.aggregate({ where: { year, month }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { year, month }, _sum: { amount: true } }),
  ])

  const monthlyIncome = income._sum.amount || 0
  const monthlyExpenses = expenses._sum.amount || 0
  const disposableIncome = monthlyIncome - monthlyExpenses

  // Get saved loan scenarios
  const savedScenarios = await prisma.loanScenario.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return {
    monthlyIncome,
    monthlyExpenses,
    disposableIncome,
    savedScenarios: savedScenarios.map((s) => ({
      name: s.name,
      amount: s.amount,
      interestRate: s.interestRate,
      termMonths: s.termMonths,
      monthlyPayment: s.monthlyPayment,
      verdictLabel: s.verdictLabel || 'Neznamy',
    })),
    currentDebtToIncomeRatio: 0, // No current debt tracking
    safetyMargin: disposableIncome,
  }
}

// Main context gathering function
async function gatherContextForSection(
  section: InsightSection,
  year: number,
  month: number
): Promise<DashboardContext | ExpensesContext | IncomeContext | InvestmentsContext | GoalsContext | LoansContext> {
  switch (section) {
    case 'dashboard':
      return gatherDashboardContext(year, month)
    case 'expenses':
      return gatherExpensesContext(year, month)
    case 'income':
      return gatherIncomeContext(year, month)
    case 'investments':
      return gatherInvestmentsContext(year, month)
    case 'goals':
      return gatherGoalsContext(year, month)
    case 'loans':
      return gatherLoansContext(year, month)
    default:
      throw new Error(`Unknown section: ${section}`)
  }
}

// GET - Fetch cached insight from database (instant)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const section = searchParams.get('section') as InsightSection
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')

    // Validate params
    if (!section || !validSections.includes(section)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }
    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
    }

    // Fetch from database
    const cached = await prisma.cachedInsight.findUnique({
      where: {
        section_year_month: { section, year, month }
      }
    })

    if (!cached) {
      return NextResponse.json({ cached: null })
    }

    // Parse the stored JSON insights
    const insights: InsightResponse = JSON.parse(cached.insights)

    return NextResponse.json({
      cached: {
        section: cached.section,
        insights,
        generatedAt: cached.generatedAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Error fetching cached insight:', error)
    return NextResponse.json({ error: 'Failed to fetch cached insight' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body: InsightRequest = await request.json()
    const { section, year, month, forceRefresh } = body

    // Validate section
    if (!validSections.includes(section)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }

    // Check cache first (unless forceRefresh)
    const cacheKey = getCacheKey(section, year, month)
    if (!forceRefresh) {
      const cached = getCachedInsight(cacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }
    }

    // Gather context data
    const context = await gatherContextForSection(section, year, month)

    // Build prompt
    const prompt = buildPromptForSection(section, context)

    // Call OpenAI API
    let rawOutput: string
    try {
      rawOutput = await generateInsight(prompt)
    } catch (apiError) {
      console.error('OpenAI API error:', apiError)
      const error = apiError as Error & { status?: number; message?: string }
      if (error.status === 429) {
        return NextResponse.json({ error: 'Prilis mnoho pozadavku, zkuste pozdeji' }, { status: 429 })
      }
      if (error.status === 401) {
        return NextResponse.json({ error: 'Neplatny API klic' }, { status: 401 })
      }
      if (error.status === 404) {
        return NextResponse.json({ error: 'Model nenalezen - zkontrolujte nazev modelu' }, { status: 404 })
      }
      // Return the actual error message for debugging
      return NextResponse.json({
        error: 'Chyba pri volani AI API',
        details: error.message || String(apiError)
      }, { status: 500 })
    }

    // Parse JSON from output
    let insights: InsightResponse
    try {
      insights = parseInsightResponse(rawOutput)
    } catch {
      // If parsing fails, return a fallback response
      return NextResponse.json({
        error: 'Nepodarilo se zpracovat AI odpoved',
        rawOutput: rawOutput.substring(0, 500),
      }, { status: 500 })
    }

    // Build result and cache it (both in-memory and database)
    const generatedAt = new Date()
    const result: AIInsightResult = {
      section,
      insights,
      generatedAt: generatedAt.toISOString(),
      cached: false,
    }
    insightCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })

    // Save to database for persistent caching
    await prisma.cachedInsight.upsert({
      where: {
        section_year_month: { section, year, month }
      },
      update: {
        insights: JSON.stringify(insights),
        generatedAt,
      },
      create: {
        section,
        year,
        month,
        insights: JSON.stringify(insights),
        generatedAt,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating AI insights:', error)
    return NextResponse.json({ error: 'Chyba pri generovani AI postrehu' }, { status: 500 })
  }
}
