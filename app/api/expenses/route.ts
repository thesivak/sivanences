import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        expenses: {
          where: { year, month },
        },
      },
    })

    return NextResponse.json({
      year,
      month,
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        order: cat.order,
        expense: cat.expenses[0] || null,
      })),
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { categoryId, year, month, amount } = body

    if (!categoryId || !year || !month || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upsert the expense (replace if exists)
    const expense = await prisma.expense.upsert({
      where: {
        categoryId_year_month: { categoryId, year, month },
      },
      update: { amount },
      create: { categoryId, year, month, amount },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error saving expense:', error)
    return NextResponse.json({ error: 'Failed to save expense' }, { status: 500 })
  }
}
