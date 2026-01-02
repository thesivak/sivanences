import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

    const types = await prisma.investmentType.findMany({
      orderBy: { order: 'asc' },
      include: {
        investments: {
          where: { year, month },
          take: 1,
        },
      },
    })

    const result = {
      year,
      month,
      types: types.map((t) => ({
        id: t.id,
        name: t.name,
        order: t.order,
        investment: t.investments[0] || null,
      })),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching investments:', error)
    return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { typeId, year, month, amount } = body

    if (!typeId || !year || !month || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const investment = await prisma.investment.upsert({
      where: {
        typeId_year_month: { typeId, year, month },
      },
      update: { amount },
      create: { typeId, year, month, amount },
    })

    return NextResponse.json(investment)
  } catch (error) {
    console.error('Error saving investment:', error)
    return NextResponse.json({ error: 'Failed to save investment' }, { status: 500 })
  }
}
