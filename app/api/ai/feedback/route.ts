import { prisma } from '@/lib/db'
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { insightType, insightId, isPositive } = body

    if (!insightType || isPositive === undefined) {
      return badRequestResponse('Missing required fields: insightType, isPositive')
    }

    if (!['overview', 'category', 'suggestion'].includes(insightType)) {
      return badRequestResponse('insightType must be one of: overview, category, suggestion')
    }

    const feedback = await prisma.aIFeedback.create({
      data: {
        insightType,
        insightId: insightId || null,
        isPositive,
      },
    })

    return successResponse(feedback)
  } catch (error) {
    console.error('Error saving AI feedback:', error)
    return errorResponse('Failed to save feedback')
  }
}

export async function GET() {
  try {
    const feedback = await prisma.aIFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Aggregate feedback stats
    const stats = {
      overview: { positive: 0, negative: 0 },
      category: { positive: 0, negative: 0 },
      suggestion: { positive: 0, negative: 0 },
    }

    feedback.forEach((f) => {
      const type = f.insightType as keyof typeof stats
      if (stats[type]) {
        if (f.isPositive) {
          stats[type].positive++
        } else {
          stats[type].negative++
        }
      }
    })

    return successResponse({
      feedback,
      stats,
    })
  } catch (error) {
    console.error('Error fetching AI feedback:', error)
    return errorResponse('Failed to fetch feedback')
  }
}
