import { PrismaClient } from '../lib/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create expense categories
  const categories = [
    { name: 'Potraviny', icon: 'shopping-cart', order: 1 },
    { name: 'Bydleni', icon: 'home', order: 2 },
    { name: 'Energie', icon: 'zap', order: 3 },
    { name: 'Doprava', icon: 'car', order: 4 },
    { name: 'Obleceni', icon: 'shirt', order: 5 },
    { name: 'Zdravi', icon: 'heart', order: 6 },
    { name: 'Vzdelavani', icon: 'book', order: 7 },
    { name: 'Zabava', icon: 'gamepad', order: 8 },
    { name: 'Restaurace', icon: 'utensils', order: 9 },
    { name: 'Komunikace', icon: 'phone', order: 10 },
    { name: 'Pojisteni', icon: 'shield', order: 11 },
    { name: 'Deti', icon: 'baby', order: 12 },
    { name: 'Domacnost', icon: 'lamp', order: 13 },
    { name: 'Osobni', icon: 'user', order: 14 },
    { name: 'Ostatni', icon: 'more-horizontal', order: 15 },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }
  console.log('Created categories')

  // Create income sources
  const incomeSources = [
    { name: 'Zapfloor', order: 1 },
    { name: 'Rodicovska', order: 2 },
    { name: 'Hosting', order: 3 },
    { name: 'Matthew', order: 4 },
    { name: 'Mamka energie', order: 5 },
    { name: 'Matthew na domacnost', order: 6 },
    { name: 'Maruska najem', order: 7 },
  ]

  for (const src of incomeSources) {
    await prisma.incomeSource.upsert({
      where: { name: src.name },
      update: {},
      create: src,
    })
  }
  console.log('Created income sources')

  // Get created records for reference
  const allCategories = await prisma.category.findMany()
  const allSources = await prisma.incomeSource.findMany()

  const getCategoryId = (name: string) => allCategories.find((c) => c.name === name)?.id
  const getSourceId = (name: string) => allSources.find((s) => s.name === name)?.id

  // Sample expense data for current month
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Sample monthly expenses (realistic Czech family budget)
  const sampleExpenses: Record<string, number> = {
    Potraviny: 15000,
    Bydleni: 18000,
    Energie: 5500,
    Doprava: 4000,
    Obleceni: 2000,
    Zdravi: 1500,
    Vzdelavani: 3000,
    Zabava: 2500,
    Restaurace: 3000,
    Komunikace: 1200,
    Pojisteni: 2500,
    Deti: 4000,
    Domacnost: 1500,
    Osobni: 1000,
    Ostatni: 2000,
  }

  // Create expenses for last 6 months with some variation
  for (let i = 0; i < 6; i++) {
    let month = currentMonth - i
    let year = currentYear
    if (month <= 0) {
      month += 12
      year -= 1
    }

    for (const [catName, baseAmount] of Object.entries(sampleExpenses)) {
      const categoryId = getCategoryId(catName)
      if (!categoryId) continue

      // Add some random variation (-15% to +15%)
      const variation = 1 + (Math.random() * 0.3 - 0.15)
      const amount = Math.round(baseAmount * variation)

      await prisma.expense.upsert({
        where: {
          categoryId_year_month: { categoryId, year, month },
        },
        update: { amount },
        create: { categoryId, year, month, amount },
      })
    }
  }
  console.log('Created sample expenses')

  // Create income data for current month
  const incomeData = [
    { sourceName: 'Zapfloor', amount: 200000 },
    { sourceName: 'Rodicovska', amount: 6250 },
    { sourceName: 'Hosting', amount: 4000 },
    { sourceName: 'Matthew', amount: 65000 },
    { sourceName: 'Mamka energie', amount: 3000 },
    { sourceName: 'Matthew na domacnost', amount: 10000 },
    { sourceName: 'Maruska najem', amount: 10000 },
  ]

  for (const income of incomeData) {
    const sourceId = getSourceId(income.sourceName)
    if (sourceId) {
      await prisma.income.upsert({
        where: {
          sourceId_year_month: { sourceId, year: currentYear, month: currentMonth },
        },
        update: { amount: income.amount },
        create: { sourceId, year: currentYear, month: currentMonth, amount: income.amount },
      })
    }
  }
  console.log('Created income data')

  // Create investment types
  const investmentTypes = [
    {
      name: 'Zlato',
      order: 1,
      totalInvested: 90000,
      annualRate: 0.09,
      investmentYears: 10,
    },
    {
      name: 'Penzijni',
      order: 2,
      totalInvested: 24721,
      annualRate: 0.07,
      investmentYears: 23,
    },
    {
      name: 'Hotovost',
      order: 3,
      totalInvested: null,
      annualRate: null,
      investmentYears: null,
    },
  ]

  for (const type of investmentTypes) {
    await prisma.investmentType.upsert({
      where: { name: type.name },
      update: {
        totalInvested: type.totalInvested,
        annualRate: type.annualRate,
        investmentYears: type.investmentYears,
      },
      create: type,
    })
  }
  console.log('Created investment types')

  // Get investment types for reference
  const allInvestmentTypes = await prisma.investmentType.findMany()
  const getInvestmentTypeId = (name: string) => allInvestmentTypes.find((t) => t.name === name)?.id

  // Create monthly investment data
  const monthlyInvestments = [
    { typeName: 'Zlato', amount: 10000 },
    { typeName: 'Penzijni', amount: 3000 },
    { typeName: 'Hotovost', amount: 45000 },
  ]

  for (const inv of monthlyInvestments) {
    const typeId = getInvestmentTypeId(inv.typeName)
    if (typeId) {
      await prisma.investment.upsert({
        where: {
          typeId_year_month: { typeId, year: currentYear, month: currentMonth },
        },
        update: { amount: inv.amount },
        create: { typeId, year: currentYear, month: currentMonth, amount: inv.amount },
      })
    }
  }
  console.log('Created investment data')

  // Create saving goals
  await prisma.savingGoal.upsert({
    where: { id: 'emergency-fund' },
    update: {
      currentAmount: 45000,
    },
    create: {
      id: 'emergency-fund',
      name: 'Nouzovy fond',
      targetAmount: 200000,
      currentAmount: 45000,
      isEmergency: true,
      order: 1,
    },
  })

  await prisma.savingGoal.upsert({
    where: { id: 'vacation-fund' },
    update: {
      currentAmount: 5000,
    },
    create: {
      id: 'vacation-fund',
      name: 'Dovolena',
      targetAmount: 60000,
      currentAmount: 5000,
      isEmergency: false,
      order: 2,
    },
  })
  console.log('Created saving goals')

  // Clear and recreate fund transactions
  await prisma.fundTransaction.deleteMany({})

  await prisma.fundTransaction.createMany({
    data: [
      { savingGoalId: 'emergency-fund', amount: 10000, description: 'Mesicni vklad' },
      { savingGoalId: 'emergency-fund', amount: 10000, description: 'Mesicni vklad' },
      { savingGoalId: 'vacation-fund', amount: 5000, description: 'Useteno z bonusu' },
    ],
  })
  console.log('Created fund transactions')

  // Active loans (currently none)
  // Uncomment and modify if you want to seed loans:
  // await prisma.activeLoan.upsert({
  //   where: { id: 'hypoteka' },
  //   update: {},
  //   create: {
  //     id: 'hypoteka',
  //     name: 'Hypoteka',
  //     type: 'MORTGAGE',
  //     originalAmount: 3000000,
  //     remainingAmount: 2500000,
  //     interestRate: 5.5,
  //     monthlyPayment: 18000,
  //     startDate: new Date('2023-01-01'),
  //     termMonths: 360,
  //   },
  // })
  console.log('No active loans to seed')

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
