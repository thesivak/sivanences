import { PrismaClient } from '../lib/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clear existing expenses and categories first
  await prisma.expense.deleteMany({})
  await prisma.category.deleteMany({})
  console.log('Cleared existing expenses and categories')

  // Create expense categories
  const categories = [
    { name: 'Potraviny + domacnost', icon: 'shopping-cart', order: 1 },
    { name: 'Mamka splatka', icon: 'heart', order: 2 },
    { name: 'Pipalovi', icon: 'users', order: 3 },
    { name: 'Joshuar', icon: 'user', order: 4 },
    { name: 'Imran', icon: 'user', order: 5 },
    { name: 'Posilovna', icon: 'dumbbell', order: 6 },
    { name: 'Apple', icon: 'smartphone', order: 7 },
    { name: 'Cez elektrina', icon: 'zap', order: 8 },
    { name: 'Voda', icon: 'droplet', order: 9 },
    { name: 'Sara skola', icon: 'graduation-cap', order: 10 },
    { name: 'Miriam obedy', icon: 'utensils', order: 11 },
    { name: 'Vodafone', icon: 'phone', order: 12 },
    { name: 'Vodafone - Matthew', icon: 'phone', order: 13 },
    { name: '1Password', icon: 'lock', order: 14 },
    { name: 'YouTube Premium', icon: 'play', order: 15 },
    { name: 'Depilace', icon: 'sparkles', order: 16 },
    { name: 'Filtry', icon: 'filter', order: 17 },
    { name: 'Alza iPhone - Matthew', icon: 'smartphone', order: 18 },
    { name: 'Adobe - Matthew', icon: 'palette', order: 19 },
    { name: 'AI tools', icon: 'bot', order: 20 },
    { name: 'Digital Ocean', icon: 'cloud', order: 21 },
    { name: 'Alza Dell monitor', icon: 'monitor', order: 22 },
    { name: 'Alza iPad - Matthew', icon: 'tablet', order: 23 },
    { name: 'Alza Apple Studio display', icon: 'monitor', order: 24 },
    { name: 'Alza Macbook', icon: 'laptop', order: 25 },
    { name: 'Alza Macbook - Matthew', icon: 'laptop', order: 26 },
    { name: 'CSSZ zaloha', icon: 'building', order: 27 },
    { name: 'CPZP zaloha', icon: 'shield', order: 28 },
    { name: 'CPZP splatky', icon: 'shield', order: 29 },
    { name: 'CSSZ splatky', icon: 'building', order: 30 },
    { name: 'iDoklad', icon: 'file-text', order: 31 },
    { name: 'Laravel Forge', icon: 'server', order: 32 },
    { name: 'Resend', icon: 'mail', order: 33 },
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

  // Monthly expenses
  const sampleExpenses: Record<string, number> = {
    'Potraviny + domacnost': 48000,
    'Mamka splatka': 10000,
    'Pipalovi': 500,
    'Joshuar': 1000,
    'Imran': 10050,
    'Posilovna': 1500,
    'Apple': 1217,
    'Cez elektrina': 3000,
    'Voda': 3000,
    'Sara skola': 4000,
    'Miriam obedy': 1000,
    'Vodafone': 2500,
    'Vodafone - Matthew': 800,
    '1Password': 180,
    'YouTube Premium': 179,
    'Depilace': 500,
    'Filtry': 2660,
    'Alza iPhone - Matthew': 832,
    'Adobe - Matthew': 450,
    'AI tools': 6000,
    'Digital Ocean': 900,
    'Alza Dell monitor': 1103,
    'Alza iPad - Matthew': 617,
    'Alza Apple Studio display': 957,
    'Alza Macbook': 2800,
    'Alza Macbook - Matthew': 1608,
    'CSSZ zaloha': 13561,
    'CPZP zaloha': 5700,
    'CPZP splatky': 1500,
    'CSSZ splatky': 1313,
    'iDoklad': 480,
    'Laravel Forge': 400,
    'Resend': 500,
  }

  // Create expenses for current month with exact amounts
  for (const [catName, amount] of Object.entries(sampleExpenses)) {
    const categoryId = getCategoryId(catName)
    if (!categoryId) continue

    await prisma.expense.upsert({
      where: {
        categoryId_year_month: { categoryId, year: currentYear, month: currentMonth },
      },
      update: { amount },
      create: { categoryId, year: currentYear, month: currentMonth, amount },
    })
  }
  console.log('Created expenses')

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

  // Clear active loans and create new ones
  await prisma.activeLoan.deleteMany({})

  // Car leasing - Leasing ČS
  await prisma.activeLoan.create({
    data: {
      name: 'Leasing auta',
      type: 'CONSUMER',
      originalAmount: 1731824.8,
      remainingAmount: 1674034.22,
      interestRate: 5.59,
      monthlyPayment: 22415,
      startDate: new Date('2025-08-06'),
      termMonths: 96, // 8 years to Aug 2033
    },
  })

  // House renovations loan - Buřinka
  await prisma.activeLoan.create({
    data: {
      name: 'Rekonstrukce domu',
      type: 'CONSUMER',
      originalAmount: 2500000,
      remainingAmount: 2490066.2,
      interestRate: 4.99,
      monthlyPayment: 16609,
      startDate: new Date('2025-07-15'),
      termMonths: 240, // 20 years to July 2045
    },
  })

  console.log('Created active loans')

  // Household settings
  await prisma.householdSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      totalMembers: 4,
      dependentChildren: 2,
      adults: 2,
    },
  })
  console.log('Created household settings')

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
