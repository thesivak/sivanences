import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateLoan } from '@/lib/loan'

// Calculate remaining balance based on payments made since start date
function calculateCurrentBalance(
  originalAmount: number,
  interestRate: number,
  termMonths: number,
  startDate: Date
): { remainingBalance: number; paymentsMade: number; monthsRemaining: number } {
  const now = new Date()
  const start = new Date(startDate)

  const monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())

  const paymentsMade = Math.max(0, Math.min(monthsElapsed, termMonths))
  const monthsRemaining = Math.max(0, termMonths - paymentsMade)

  if (paymentsMade >= termMonths) {
    return { remainingBalance: 0, paymentsMade, monthsRemaining: 0 }
  }

  const loanResult = calculateLoan({
    amount: originalAmount,
    annualRate: interestRate / 100,
    termMonths,
  })

  if (paymentsMade === 0) {
    return { remainingBalance: originalAmount, paymentsMade, monthsRemaining }
  }

  const remainingBalance = loanResult.amortization[paymentsMade - 1]?.balance ?? 0

  return { remainingBalance, paymentsMade, monthsRemaining }
}

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

    // Fetch household settings for emergency fund target
    const householdSettings = await prisma.householdSettings.findUnique({
      where: { id: 'default' },
    })

    // Get active loans with calculated balances
    const activeLoansRaw = await prisma.activeLoan.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const activeLoans = activeLoansRaw.map(loan => {
      const { remainingBalance, paymentsMade, monthsRemaining } = calculateCurrentBalance(
        loan.originalAmount,
        loan.interestRate,
        loan.termMonths,
        loan.startDate
      )

      return {
        ...loan,
        calculatedBalance: remainingBalance,
        paymentsMade,
        monthsRemaining,
        paidOffPercent: ((loan.originalAmount - remainingBalance) / loan.originalAmount) * 100,
      }
    })

    const totalLoanPayments = activeLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0)
    const totalLoanBalance = activeLoans.reduce((sum, loan) => sum + loan.calculatedBalance, 0)

    // Calculate previous month loan payments (loans that were active in previous month)
    const prevMonthDate = new Date(prevYear, prevMonth - 1, 1)
    const prevMonthLoanPayments = activeLoansRaw.reduce((sum, loan) => {
      const startDate = new Date(loan.startDate)
      // Only count if loan had started by the previous month
      if (startDate <= prevMonthDate) {
        return sum + loan.monthlyPayment
      }
      return sum
    }, 0)

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
      totalLoanPayments,
      totalLoanBalance,
      // Balance now includes loan payments
      balance: totalIncome - totalExpenses - totalInvestments - totalLoanPayments,
      previousMonth: {
        totalIncome: prevIncome._sum.amount || 0,
        totalExpenses: prevExpenses._sum.amount || 0,
        totalInvestments: prevInvestments._sum.amount || 0,
        totalLoanPayments: prevMonthLoanPayments,
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
      savingGoals: savingGoals.map((goal) => {
        // For emergency fund, use household settings target if available
        const effectiveTarget = goal.isEmergency && householdSettings?.emergencyFundTarget
          ? householdSettings.emergencyFundTarget
          : goal.targetAmount
        const emergencyFundMonths = householdSettings?.emergencyFundMonths ?? 3

        return {
          ...goal,
          targetAmount: effectiveTarget,
          progress: effectiveTarget ? (goal.currentAmount / effectiveTarget) * 100 : 0,
          recommendedTarget: goal.isEmergency ? avgMonthlyExpenses * emergencyFundMonths : undefined,
          emergencyFundMonths: goal.isEmergency ? emergencyFundMonths : undefined,
        }
      }),
      activeLoans,
      avgMonthlyExpenses,
    })
  } catch (error) {
    console.error('Error fetching summary:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
