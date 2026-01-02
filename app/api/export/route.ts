import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined

  try {
    // Fetch all data
    const [categories, incomeSources, investmentTypes, expenses, incomes, investments, goals] =
      await Promise.all([
        prisma.category.findMany({ orderBy: { order: 'asc' } }),
        prisma.incomeSource.findMany({ orderBy: { order: 'asc' } }),
        prisma.investmentType.findMany({ orderBy: { order: 'asc' } }),
        prisma.expense.findMany({
          where: year ? { year } : undefined,
          include: { category: true },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        }),
        prisma.income.findMany({
          where: year ? { year } : undefined,
          include: { source: true },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        }),
        prisma.investment.findMany({
          where: year ? { year } : undefined,
          include: { type: true },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        }),
        prisma.savingGoal.findMany({
          include: { transactions: true },
          orderBy: { order: 'asc' },
        }),
      ])

    if (format === 'csv') {
      // Generate CSV for expenses
      const expensesCsv = [
        'Rok;Mesic;Kategorie;Castka',
        ...expenses.map(
          (e) => `${e.year};${e.month};${e.category.name};${e.amount.toFixed(2).replace('.', ',')}`
        ),
      ].join('\n')

      // Generate CSV for income
      const incomeCsv = [
        'Rok;Mesic;Zdroj;Castka',
        ...incomes.map(
          (i) => `${i.year};${i.month};${i.source.name};${i.amount.toFixed(2).replace('.', ',')}`
        ),
      ].join('\n')

      // Generate CSV for investments
      const investmentsCsv = [
        'Rok;Mesic;Typ;Castka',
        ...investments.map(
          (i) => `${i.year};${i.month};${i.type.name};${i.amount.toFixed(2).replace('.', ',')}`
        ),
      ].join('\n')

      // Combine into a multi-section CSV
      const fullCsv = [
        '# VYDAJE',
        expensesCsv,
        '',
        '# PRIJMY',
        incomeCsv,
        '',
        '# INVESTICE',
        investmentsCsv,
        '',
        '# SPORICI CILE',
        'Nazev;Cilova castka;Aktualni castka;Nouzovy fond',
        ...goals.map(
          (g) =>
            `${g.name};${g.targetAmount?.toFixed(2).replace('.', ',') || ''};${g.currentAmount.toFixed(2).replace('.', ',')};${g.isEmergency ? 'Ano' : 'Ne'}`
        ),
      ].join('\n')

      return new NextResponse(fullCsv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="rozpocet-export-${year || 'all'}.csv"`,
        },
      })
    }

    // JSON format
    return NextResponse.json({
      exportDate: new Date().toISOString(),
      year: year || 'all',
      categories,
      incomeSources,
      investmentTypes,
      expenses: expenses.map((e) => ({
        year: e.year,
        month: e.month,
        category: e.category.name,
        amount: e.amount,
      })),
      incomes: incomes.map((i) => ({
        year: i.year,
        month: i.month,
        source: i.source.name,
        amount: i.amount,
      })),
      investments: investments.map((i) => ({
        year: i.year,
        month: i.month,
        type: i.type.name,
        amount: i.amount,
      })),
      savingGoals: goals.map((g) => ({
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        isEmergency: g.isEmergency,
        transactionCount: g.transactions.length,
      })),
    })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
