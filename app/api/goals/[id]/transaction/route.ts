import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { amount, description } = body

    if (amount === undefined || amount === 0) {
      return NextResponse.json({ error: 'Amount is required and cannot be zero' }, { status: 400 })
    }

    // Create transaction and update goal in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.fundTransaction.create({
        data: {
          savingGoalId: id,
          amount,
          description: description || null,
        },
      })

      const goal = await tx.savingGoal.update({
        where: { id },
        data: {
          currentAmount: {
            increment: amount,
          },
        },
      })

      return { transaction, goal }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
