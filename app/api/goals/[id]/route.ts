import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { invalidateInsightsCache } from '@/lib/api'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, currentAmount, targetAmount, isEmergency } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const goal = await prisma.savingGoal.update({
      where: { id },
      data: {
        name: name.trim(),
        currentAmount: currentAmount !== undefined ? currentAmount : undefined,
        targetAmount: targetAmount !== undefined ? targetAmount : undefined,
        isEmergency: isEmergency !== undefined ? isEmergency : undefined,
      },
    })

    // Invalidate AI insights cache when goals change
    await invalidateInsightsCache()

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Error updating goal:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.savingGoal.delete({
      where: { id },
    })

    // Invalidate AI insights cache when goals change
    await invalidateInsightsCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting goal:', error)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
