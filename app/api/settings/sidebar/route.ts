import { prisma } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api'

export async function GET() {
  try {
    const settings = await prisma.householdSettings.findUnique({
      where: { id: 'default' },
      select: { sidebarExpanded: true },
    })

    return successResponse({
      expanded: settings?.sidebarExpanded ?? false,
    })
  } catch (error) {
    console.error('Error fetching sidebar state:', error)
    return errorResponse('Failed to fetch sidebar state')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { expanded } = body

    if (typeof expanded !== 'boolean') {
      return errorResponse('Invalid value: expanded must be a boolean')
    }

    const settings = await prisma.householdSettings.upsert({
      where: { id: 'default' },
      update: { sidebarExpanded: expanded },
      create: {
        id: 'default',
        sidebarExpanded: expanded,
      },
    })

    return successResponse({
      expanded: settings.sidebarExpanded,
    })
  } catch (error) {
    console.error('Error saving sidebar state:', error)
    return errorResponse('Failed to save sidebar state')
  }
}
