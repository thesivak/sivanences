import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const scenarios = await prisma.loanScenario.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(scenarios)
  } catch (error) {
    console.error('Error fetching loan scenarios:', error)
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      amount,
      interestRate,
      termMonths,
      type,
      monthlyPayment,
      totalPayment,
      totalInterest,
      verdictStatus,
      verdictLabel,
      verdictReason,
      budgetImpact,
      budgetIncome,
      budgetExpenses,
    } = body

    if (!amount || !interestRate || !termMonths || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const scenarioName =
      name ||
      `${type === 'MORTGAGE' ? 'Hypotéka' : 'Spotřebitelský úvěr'} - ${new Date().toLocaleDateString('cs-CZ')}`

    const scenario = await prisma.loanScenario.create({
      data: {
        name: scenarioName,
        amount,
        interestRate,
        termMonths,
        type,
        monthlyPayment,
        totalPayment,
        totalInterest,
        verdictStatus: verdictStatus || null,
        verdictLabel: verdictLabel || null,
        verdictReason: verdictReason || null,
        budgetImpact: budgetImpact || null,
        budgetIncome: budgetIncome || null,
        budgetExpenses: budgetExpenses || null,
      },
    })

    return NextResponse.json(scenario)
  } catch (error) {
    console.error('Error saving loan scenario:', error)
    return NextResponse.json({ error: 'Failed to save scenario' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, name } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const scenario = await prisma.loanScenario.update({
      where: { id },
      data: { name },
    })

    return NextResponse.json(scenario)
  } catch (error) {
    console.error('Error updating loan scenario:', error)
    return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.loanScenario.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting loan scenario:', error)
    return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 })
  }
}
