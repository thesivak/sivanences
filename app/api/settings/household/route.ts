import { prisma } from '@/lib/db'
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api'

export async function GET() {
  try {
    const settings = await prisma.householdSettings.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      // Return default settings if none exist
      return successResponse({
        id: 'default',
        totalMembers: 1,
        dependentChildren: 0,
        adults: 1,
        emergencyFundTarget: null,
        emergencyFundMonths: 3,
      })
    }

    return successResponse(settings)
  } catch (error) {
    console.error('Error fetching household settings:', error)
    return errorResponse('Failed to fetch household settings')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { totalMembers, dependentChildren, adults, emergencyFundTarget, emergencyFundMonths } = body

    if (
      totalMembers === undefined ||
      dependentChildren === undefined ||
      adults === undefined
    ) {
      return badRequestResponse('Missing required fields: totalMembers, dependentChildren, adults')
    }

    // Validate values
    if (totalMembers < 1 || dependentChildren < 0 || adults < 1) {
      return badRequestResponse('Invalid values: totalMembers >= 1, dependentChildren >= 0, adults >= 1')
    }

    if (dependentChildren + adults !== totalMembers) {
      return badRequestResponse('dependentChildren + adults must equal totalMembers')
    }

    // Validate emergency fund settings
    // User can set either a custom target OR use months-based calculation, not both
    const hasCustomTarget = emergencyFundTarget !== undefined && emergencyFundTarget !== null

    if (hasCustomTarget && emergencyFundTarget < 0) {
      return badRequestResponse('emergencyFundTarget must be positive')
    }

    // Only validate months if no custom target is set
    if (!hasCustomTarget && emergencyFundMonths !== undefined && emergencyFundMonths !== null) {
      if (emergencyFundMonths < 1 || emergencyFundMonths > 12) {
        return badRequestResponse('emergencyFundMonths must be between 1 and 12')
      }
    }

    // When custom target is set, months is ignored (stored as default 3)
    // When months is set, target is null
    const settings = await prisma.householdSettings.upsert({
      where: { id: 'default' },
      update: {
        totalMembers,
        dependentChildren,
        adults,
        emergencyFundTarget: hasCustomTarget ? emergencyFundTarget : null,
        emergencyFundMonths: hasCustomTarget ? 3 : (emergencyFundMonths ?? 3),
      },
      create: {
        id: 'default',
        totalMembers,
        dependentChildren,
        adults,
        emergencyFundTarget: hasCustomTarget ? emergencyFundTarget : null,
        emergencyFundMonths: hasCustomTarget ? 3 : (emergencyFundMonths ?? 3),
      },
    })

    // Invalidate AI insights cache when household settings change
    await prisma.aIInsightsCache.deleteMany({})

    return successResponse(settings)
  } catch (error) {
    console.error('Error saving household settings:', error)
    return errorResponse('Failed to save household settings')
  }
}
