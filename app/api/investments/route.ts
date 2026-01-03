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
    const types = await prisma.investmentType.findMany({
      orderBy: { order: 'asc' },
      include: {
        investments: {
          where: { year, month },
          take: 1,
        },
      },
    })

    return successResponse({
      year,
      month,
      types: types.map((t) => ({
        id: t.id,
        name: t.name,
        order: t.order,
        totalInvested: t.totalInvested,
        annualRate: t.annualRate,
        investmentYears: t.investmentYears,
        investment: t.investments[0] || null,
      })),
    })
  } catch (error) {
    console.error('Error fetching investments:', error)
    return errorResponse('Failed to fetch investments')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { typeId, year, month, amount } = body

    if (!typeId || !year || !month || amount === undefined) {
      return badRequestResponse()
    }

    const investment = await prisma.investment.upsert({
      where: {
        typeId_year_month: { typeId, year, month },
      },
      update: { amount },
      create: { typeId, year, month, amount },
    })

    return successResponse(investment)
  } catch (error) {
    console.error('Error saving investment:', error)
    return errorResponse('Failed to save investment')
  }
}
