import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

  try {
    // Get all categories with expenses for the month
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        expenses: {
          where: { year, month },
        },
      },
    })

    // Get all income sources with income for the month
    const incomeSources = await prisma.incomeSource.findMany({
      orderBy: { order: 'asc' },
      include: {
        incomes: {
          where: { year, month },
        },
      },
    })

    // Get all investment types with investments for the month
    const investmentTypes = await prisma.investmentType.findMany({
      orderBy: { order: 'asc' },
      include: {
        investments: {
          where: { year, month },
        },
      },
    })

    // Calculate totals
    const totalExpenses = categories.reduce((sum, cat) => {
      return sum + (cat.expenses[0]?.amount || 0)
    }, 0)

    const totalIncome = incomeSources.reduce((sum, src) => {
      return sum + (src.incomes[0]?.amount || 0)
    }, 0)

    const totalInvestments = investmentTypes.reduce((sum, type) => {
      return sum + (type.investments[0]?.amount || 0)
    }, 0)

    // Get previous month data for comparison
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year

    const prevExpenses = await prisma.expense.aggregate({
      where: { year: prevYear, month: prevMonth },
      _sum: { amount: true },
    })

    const prevIncome = await prisma.income.aggregate({
      where: { year: prevYear, month: prevMonth },
      _sum: { amount: true },
    })

    const prevInvestments = await prisma.investment.aggregate({
      where: { year: prevYear, month: prevMonth },
      _sum: { amount: true },
    })

    // Get saving goals
    const savingGoals = await prisma.savingGoal.findMany({
      orderBy: { order: 'asc' },
    })

    // Calculate 3-month average expenses for emergency fund recommendation
    const last3MonthsExpenses = await prisma.expense.groupBy({
      by: ['year', 'month'],
      _sum: { amount: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 3,
    })

    const avgMonthlyExpenses =
      last3MonthsExpenses.reduce((sum, m) => sum + (m._sum.amount || 0), 0) /
      Math.max(last3MonthsExpenses.length, 1)

    return NextResponse.json({
      year,
      month,
      totalIncome,
      totalExpenses,
      totalInvestments,
      balance: totalIncome - totalExpenses - totalInvestments,
      previousMonth: {
        totalIncome: prevIncome._sum.amount || 0,
        totalExpenses: prevExpenses._sum.amount || 0,
        totalInvestments: prevInvestments._sum.amount || 0,
      },
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        order: cat.order,
        expense: cat.expenses[0] || null,
      })),
      incomeSources: incomeSources.map((src) => ({
        id: src.id,
        name: src.name,
        order: src.order,
        income: src.incomes[0] || null,
      })),
      investmentTypes: investmentTypes.map((type) => ({
        id: type.id,
        name: type.name,
        order: type.order,
        investment: type.investments[0] || null,
      })),
      savingGoals: savingGoals.map((goal) => ({
        ...goal,
        progress: goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
        recommendedTarget: goal.isEmergency ? avgMonthlyExpenses * 3 : undefined,
      })),
      avgMonthlyExpenses,
    })
  } catch (error) {
    console.error('Error fetching summary:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
