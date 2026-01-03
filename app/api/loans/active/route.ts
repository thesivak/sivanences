import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateLoan } from '@/lib/loan'
import { invalidateInsightsCache } from '@/lib/api'

// Calculate remaining balance based on payments made since start date
function calculateCurrentBalance(
  originalAmount: number,
  interestRate: number,
  termMonths: number,
  startDate: Date
): { remainingBalance: number; paymentsMade: number; monthsRemaining: number } {
  const now = new Date()
  const start = new Date(startDate)

  // Calculate months elapsed since start
  const monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())

  const paymentsMade = Math.max(0, Math.min(monthsElapsed, termMonths))
  const monthsRemaining = Math.max(0, termMonths - paymentsMade)

  if (paymentsMade >= termMonths) {
    return { remainingBalance: 0, paymentsMade, monthsRemaining: 0 }
  }

  if (paymentsMade === 0) {
    return { remainingBalance: originalAmount, paymentsMade, monthsRemaining }
  }

  // Calculate amortization to find current balance
  const loanResult = calculateLoan({
    amount: originalAmount,
    annualRate: interestRate / 100, // Convert from percentage
    termMonths,
  })

  // Get balance after payments made
  const remainingBalance = loanResult.amortization[paymentsMade - 1]?.balance ?? 0

  return { remainingBalance, paymentsMade, monthsRemaining }
}

export async function GET() {
  try {
    const loans = await prisma.activeLoan.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Calculate current balance for each loan
    const loansWithBalance = loans.map(loan => {
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

    return NextResponse.json(loansWithBalance)
  } catch (error) {
    console.error('Error fetching active loans:', error)
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      type,
      originalAmount,
      interestRate,
      monthlyPayment,
      startDate,
      termMonths,
    } = body

    if (!name || !originalAmount || !interestRate || !monthlyPayment || !startDate || !termMonths) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const loan = await prisma.activeLoan.create({
      data: {
        name,
        type: type || 'CONSUMER',
        originalAmount,
        remainingAmount: originalAmount, // Will be calculated on GET
        interestRate,
        monthlyPayment,
        startDate: new Date(startDate),
        termMonths,
      },
    })

    // Invalidate AI insights cache when loans change
    await invalidateInsightsCache()

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Error creating active loan:', error)
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Convert startDate if provided
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate)
    }

    const loan = await prisma.activeLoan.update({
      where: { id },
      data: updateData,
    })

    // Invalidate AI insights cache when loans change
    await invalidateInsightsCache()

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Error updating active loan:', error)
    return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.activeLoan.delete({
      where: { id },
    })

    // Invalidate AI insights cache when loans change
    await invalidateInsightsCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting active loan:', error)
    return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 })
  }
}
