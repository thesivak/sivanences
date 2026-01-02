import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

  try {
    const sources = await prisma.incomeSource.findMany({
      orderBy: { order: 'asc' },
      include: {
        incomes: {
          where: { year, month },
        },
      },
    })

    return NextResponse.json({
      year,
      month,
      sources: sources.map((src) => ({
        id: src.id,
        name: src.name,
        order: src.order,
        income: src.incomes[0] || null,
      })),
    })
  } catch (error) {
    console.error('Error fetching income:', error)
    return NextResponse.json({ error: 'Failed to fetch income' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sourceId, year, month, amount } = body

    if (!sourceId || !year || !month || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const income = await prisma.income.upsert({
      where: {
        sourceId_year_month: { sourceId, year, month },
      },
      update: { amount },
      create: { sourceId, year, month, amount },
    })

    return NextResponse.json(income)
  } catch (error) {
    console.error('Error saving income:', error)
    return NextResponse.json({ error: 'Failed to save income' }, { status: 500 })
  }
}
