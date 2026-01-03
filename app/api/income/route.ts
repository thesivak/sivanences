import { prisma } from '@/lib/db'
import {
  getPeriodFromRequest,
  successResponse,
  errorResponse,
  badRequestResponse,
} from '@/lib/api'

export async function GET(request: Request) {
  const { year, month } = getPeriodFromRequest(request)

  try {
    const sources = await prisma.incomeSource.findMany({
      orderBy: { order: 'asc' },
      include: {
        incomes: {
          where: { year, month },
        },
      },
    })

    return successResponse({
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
    return errorResponse('Failed to fetch income')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sourceId, year, month, amount } = body

    if (!sourceId || !year || !month || amount === undefined) {
      return badRequestResponse()
    }

    const income = await prisma.income.upsert({
      where: {
        sourceId_year_month: { sourceId, year, month },
      },
      update: { amount },
      create: { sourceId, year, month, amount },
    })

    return successResponse(income)
  } catch (error) {
    console.error('Error saving income:', error)
    return errorResponse('Failed to save income')
  }
}
