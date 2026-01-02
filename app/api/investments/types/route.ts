import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const types = await prisma.investmentType.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(types)
  } catch (error) {
    console.error('Error fetching investment types:', error)
    return NextResponse.json({ error: 'Failed to fetch investment types' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, totalInvested, annualRate, investmentYears } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const maxOrder = await prisma.investmentType.aggregate({
      _max: { order: true },
    })

    const type = await prisma.investmentType.create({
      data: {
        name,
        order: (maxOrder._max.order || 0) + 1,
        totalInvested: totalInvested || null,
        annualRate: annualRate || null,
        investmentYears: investmentYears || null,
      },
    })

    return NextResponse.json(type)
  } catch (error) {
    console.error('Error creating investment type:', error)
    return NextResponse.json({ error: 'Failed to create investment type' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, name, totalInvested, annualRate, investmentYears } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (totalInvested !== undefined) updateData.totalInvested = totalInvested
    if (annualRate !== undefined) updateData.annualRate = annualRate
    if (investmentYears !== undefined) updateData.investmentYears = investmentYears

    const type = await prisma.investmentType.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(type)
  } catch (error) {
    console.error('Error updating investment type:', error)
    return NextResponse.json({ error: 'Failed to update investment type' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.investmentType.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting investment type:', error)
    return NextResponse.json({ error: 'Failed to delete investment type' }, { status: 500 })
  }
}
