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
    { name: 'Mzda', order: 1 },
    { name: 'Bonusy', order: 2 },
    { name: 'Ostatni', order: 3 },
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

  // Sample expense data for last 6 months
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

  // Create income data for last 6 months
  const mzdaId = getSourceId('Mzda')
  const bonusyId = getSourceId('Bonusy')

  for (let i = 0; i < 6; i++) {
    let month = currentMonth - i
    let year = currentYear
    if (month <= 0) {
      month += 12
      year -= 1
    }

    // Monthly salary
    if (mzdaId) {
      await prisma.income.upsert({
        where: {
          sourceId_year_month: { sourceId: mzdaId, year, month },
        },
        update: { amount: 85000 },
        create: { sourceId: mzdaId, year, month, amount: 85000 },
      })
    }

    // Quarterly bonuses
    if (bonusyId && month % 3 === 0) {
      await prisma.income.upsert({
        where: {
          sourceId_year_month: { sourceId: bonusyId, year, month },
        },
        update: { amount: 15000 },
        create: { sourceId: bonusyId, year, month, amount: 15000 },
      })
    }
  }
  console.log('Created sample income')

  // Create saving goals
  await prisma.savingGoal.upsert({
    where: { id: 'emergency-fund' },
    update: {},
    create: {
      id: 'emergency-fund',
      name: 'Nouzovy fond',
      targetAmount: 200000,
      currentAmount: 85000,
      isEmergency: true,
      order: 1,
    },
  })

  await prisma.savingGoal.upsert({
    where: { id: 'vacation-fund' },
    update: {},
    create: {
      id: 'vacation-fund',
      name: 'Dovolena',
      targetAmount: 60000,
      currentAmount: 25000,
      isEmergency: false,
      order: 2,
    },
  })

  await prisma.savingGoal.upsert({
    where: { id: 'car-fund' },
    update: {},
    create: {
      id: 'car-fund',
      name: 'Nove auto',
      targetAmount: 400000,
      currentAmount: 120000,
      isEmergency: false,
      order: 3,
    },
  })
  console.log('Created saving goals')

  // Add some fund transactions
  await prisma.fundTransaction.deleteMany({})

  await prisma.fundTransaction.createMany({
    data: [
      { savingGoalId: 'emergency-fund', amount: 10000, description: 'Mesicni vklad' },
      { savingGoalId: 'emergency-fund', amount: 10000, description: 'Mesicni vklad' },
      { savingGoalId: 'vacation-fund', amount: 5000, description: 'Useteno z bonusu' },
      { savingGoalId: 'car-fund', amount: 15000, description: 'Mesicni uspora' },
    ],
  })
  console.log('Created fund transactions')

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
