import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Get average monthly expenses for emergency fund recommendation
    const last3MonthsExpenses = await prisma.expense.groupBy({
      by: ['year', 'month'],
      _sum: { amount: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 3,
    })

    const avgMonthlyExpenses =
      last3MonthsExpenses.reduce((sum, m) => sum + (m._sum.amount || 0), 0) /
      Math.max(last3MonthsExpenses.length, 1)

    const goals = await prisma.savingGoal.findMany({
      orderBy: { order: 'asc' },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    })

    return NextResponse.json({
      goals: goals.map((goal) => ({
        ...goal,
        progress: goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
        recommendedTarget: goal.isEmergency ? avgMonthlyExpenses * 3 : undefined,
      })),
      avgMonthlyExpenses,
    })
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, targetAmount, isEmergency } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const maxOrder = await prisma.savingGoal.aggregate({
      _max: { order: true },
    })

    const goal = await prisma.savingGoal.create({
      data: {
        name,
        targetAmount: targetAmount || null,
        isEmergency: isEmergency || false,
        order: (maxOrder._max.order || 0) + 1,
      },
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}
