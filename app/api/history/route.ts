import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const months = parseInt(searchParams.get('months') || '12')

  try {
    // Get monthly totals for the last N months
    const now = new Date()
    const startYear = now.getFullYear() - Math.floor(months / 12)
    const startMonth = now.getMonth() + 1 - (months % 12)

    const expenses = await prisma.expense.groupBy({
      by: ['year', 'month'],
      _sum: { amount: true },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    })

    const incomes = await prisma.income.groupBy({
      by: ['year', 'month'],
      _sum: { amount: true },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    })

    // Create a map of all months with data
    const monthlyData: Record<string, { income: number; expenses: number }> = {}

    incomes.forEach((i: { year: number; month: number; _sum: { amount: number | null } }) => {
      const key = `${i.year}-${i.month}`
      if (!monthlyData[key]) {
        monthlyData[key] = { income: 0, expenses: 0 }
      }
      monthlyData[key].income = i._sum.amount || 0
    })

    expenses.forEach((e: { year: number; month: number; _sum: { amount: number | null } }) => {
      const key = `${e.year}-${e.month}`
      if (!monthlyData[key]) {
        monthlyData[key] = { income: 0, expenses: 0 }
      }
      monthlyData[key].expenses = e._sum.amount || 0
    })

    // Convert to array and sort
    const history = Object.entries(monthlyData)
      .map(([key, data]) => {
        const [year, month] = key.split('-').map(Number)
        return {
          year,
          month,
          income: data.income,
          expenses: data.expenses,
          balance: data.income - data.expenses,
        }
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.month - b.month
      })
      .slice(-months)

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
