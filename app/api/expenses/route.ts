import { prisma } from '@/lib/db'
import {
  getPeriodFromRequest,
  successResponse,
  errorResponse,
  badRequestResponse,
  invalidateInsightsCache,
} from '@/lib/api'

export async function GET(request: Request) {
  const { year, month } = getPeriodFromRequest(request)

  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        expenses: {
          where: { year, month },
        },
      },
    })

    return successResponse({
      year,
      month,
      categories: categories.map((cat: { id: string; name: string; icon: string; order: number; expenses: unknown[] }) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        order: cat.order,
        expense: cat.expenses[0] || null,
      })),
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return errorResponse('Failed to fetch expenses')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { categoryId, year, month, amount } = body

    if (!categoryId || !year || !month || amount === undefined) {
      return badRequestResponse()
    }

    const expense = await prisma.expense.upsert({
      where: {
        categoryId_year_month: { categoryId, year, month },
      },
      update: { amount },
      create: { categoryId, year, month, amount },
    })

    // Invalidate AI insights cache when expenses change
    await invalidateInsightsCache()

    return successResponse(expense)
  } catch (error) {
    console.error('Error saving expense:', error)
    return errorResponse('Failed to save expense')
  }
}
