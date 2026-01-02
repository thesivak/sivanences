import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const sources = await prisma.incomeSource.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(sources)
  } catch (error) {
    console.error('Error fetching income sources:', error)
    return NextResponse.json({ error: 'Failed to fetch income sources' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const maxOrder = await prisma.incomeSource.aggregate({
      _max: { order: true },
    })

    const source = await prisma.incomeSource.create({
      data: {
        name,
        order: (maxOrder._max.order || 0) + 1,
      },
    })

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error creating income source:', error)
    return NextResponse.json({ error: 'Failed to create income source' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, name } = body

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 })
    }

    const source = await prisma.incomeSource.update({
      where: { id },
      data: { name },
    })

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error updating income source:', error)
    return NextResponse.json({ error: 'Failed to update income source' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // This will cascade delete all related income records due to onDelete: Cascade in schema
    await prisma.incomeSource.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting income source:', error)
    return NextResponse.json({ error: 'Failed to delete income source' }, { status: 500 })
  }
}
