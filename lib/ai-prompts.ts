// AI Prompt Templates for Claude Code headless mode
// All prompts request JSON output in Czech (without diacritics)

export type InsightSection = 'dashboard' | 'expenses' | 'income' | 'investments' | 'goals' | 'loans'

export interface InsightResponse {
  summary: string
  patterns: string[]
  recommendations: string[]
  healthScore: number
  healthLabel: 'Vynikajici' | 'Dobry' | 'Potrebuje pozornost' | 'Rizikovy'
}

// Base template that all section prompts extend
const BASE_PROMPT = `Jsi financni poradce pro ceskou rodinu. Analyzuj nasledujici financni data a poskytni uzitecne postrehy.

PRAVIDLA:
- Pis cesky bez diakritiky (pouzij "vydaje" ne "výdaje")
- Mena je Kc (ceske koruny)
- Bud konkretni a akcne orientovany
- Odpovez POUZE validnim JSON objektem, zadny dalsi text pred ani za JSON

POZADOVANY FORMAT ODPOVEDI:
{
  "summary": "Strucne zhodnoceni situace (1-2 vety)",
  "patterns": ["Vzorec 1", "Vzorec 2", "Vzorec 3"],
  "recommendations": ["Doporuceni 1", "Doporuceni 2", "Doporuceni 3"],
  "healthScore": 75,
  "healthLabel": "Dobry"
}

healthLabel hodnoty podle healthScore:
- "Vynikajici" pro 85-100
- "Dobry" pro 65-84
- "Potrebuje pozornost" pro 40-64
- "Rizikovy" pro 0-39

`

// Context interfaces for each section
export interface DashboardContext {
  year: number
  month: number
  totalIncome: number
  totalExpenses: number
  totalInvestments: number
  balance: number
  savingRate: number
  incomeChange: number
  expenseChange: number
  topExpenses: Array<{ name: string; amount: number }>
  savingGoals: Array<{ name: string; currentAmount: number; targetAmount: number | null; progress: number }>
  historicalTrend: Array<{ year: number; month: number; expenses: number; income: number }>
}

export interface ExpensesContext {
  year: number
  month: number
  totalExpenses: number
  categories: Array<{ name: string; amount: number; percentOfTotal: number }>
  categoryComparisons: Array<{ name: string; currentAmount: number; averageAmount: number; deviation: number }>
  monthlyTrend: Array<{ year: number; month: number; total: number }>
}

export interface IncomeContext {
  year: number
  month: number
  totalIncome: number
  sources: Array<{ name: string; amount: number; percentOfTotal: number }>
  activeSources: number
  primarySource: { name: string; percent: number }
  incomeHistory: Array<{ year: number; month: number; total: number }>
  averageIncome: number
  minIncome: number
  maxIncome: number
}

export interface InvestmentsContext {
  year: number
  month: number
  totalMonthlyInvestments: number
  totalInvested: number
  investmentRate: number
  types: Array<{
    name: string
    monthlyAmount: number
    totalInvested: number | null
    annualRate: number | null
    investmentYears: number | null
    projectedFinalValue: number | null
    projectedGain: number | null
  }>
  yearlyTotal: number
  yearlyAverage: number
  monthlyExpenses: number
  investToExpenseRatio: number
  emergencyFundStatus: string
}

export interface GoalsContext {
  totalGoals: number
  totalSaved: number
  averageProgress: number
  goals: Array<{
    name: string
    isEmergency: boolean
    currentAmount: number
    targetAmount: number | null
    progress: number
    recommendedTarget?: number
  }>
  emergencyFundStatus: string
  emergencyMonthsCovered: number
  availableForSaving: number
}

export interface LoansContext {
  monthlyIncome: number
  monthlyExpenses: number
  disposableIncome: number
  savedScenarios: Array<{
    name: string
    amount: number
    interestRate: number
    termMonths: number
    monthlyPayment: number
    verdictLabel: string
  }>
  currentDebtToIncomeRatio: number
  safetyMargin: number
}

// Executive summary context - combines insights from all sections
export interface ExecutiveSummaryContext {
  year: number
  month: number
  sectionInsights: {
    expenses?: InsightResponse
    income?: InsightResponse
    investments?: InsightResponse
    goals?: InsightResponse
    loans?: InsightResponse
  }
}

export type ContextType =
  | DashboardContext
  | ExpensesContext
  | IncomeContext
  | InvestmentsContext
  | GoalsContext
  | LoansContext

// Format month name without diacritics for prompts
function getMonthNameNoDiacritics(month: number): string {
  const months = [
    'Leden', 'Unor', 'Brezen', 'Duben', 'Kveten', 'Cerven',
    'Cervenec', 'Srpen', 'Zari', 'Rijen', 'Listopad', 'Prosinec'
  ]
  return months[month - 1] || ''
}

function formatPeriod(year: number, month: number): string {
  return `${getMonthNameNoDiacritics(month)} ${year}`
}

// Section-specific prompt builders
function buildDashboardPrompt(context: DashboardContext): string {
  const topExpensesList = context.topExpenses
    .map((e, i) => `${i + 1}. ${e.name}: ${e.amount} Kc`)
    .join('\n')

  const goalsList = context.savingGoals
    .map(g => `- ${g.name}: ${g.currentAmount}/${g.targetAmount || 'bez cile'} Kc (${g.progress.toFixed(0)}%)`)
    .join('\n')

  const trendList = context.historicalTrend
    .map(h => `${h.month}/${h.year}: Vydaje ${h.expenses} Kc, Prijmy ${h.income} Kc`)
    .join('\n')

  return `${BASE_PROMPT}
SEKCE: Hlavni prehled mesicniho rozpoctu

DATA ZA ${formatPeriod(context.year, context.month)}:
- Celkove prijmy: ${context.totalIncome} Kc
- Celkove vydaje: ${context.totalExpenses} Kc
- Investice: ${context.totalInvestments} Kc
- Bilance: ${context.balance} Kc
- Mira usporeni: ${context.savingRate.toFixed(1)}%

POROVNANI S MINULYM MESICEM:
- Prijmy: ${context.incomeChange > 0 ? '+' : ''}${context.incomeChange.toFixed(1)}%
- Vydaje: ${context.expenseChange > 0 ? '+' : ''}${context.expenseChange.toFixed(1)}%

TOP 5 VYDAJOVYCH KATEGORII:
${topExpensesList}

SPORICI CILE:
${goalsList || '- Zadne cile'}

HISTORICKY TREND (poslednich 6 mesicu):
${trendList || '- Nedostatek dat'}

Zamer se na: celkove financni zdravi, vyrazne zmeny, a prioritni akce.`
}

function buildExpensesPrompt(context: ExpensesContext): string {
  const categoriesList = context.categories
    .map(c => `- ${c.name}: ${c.amount} Kc (${c.percentOfTotal.toFixed(1)}%)`)
    .join('\n')

  const comparisonsList = context.categoryComparisons
    .map(c => `- ${c.name}: ${c.currentAmount} Kc vs prumer ${c.averageAmount.toFixed(0)} Kc (${c.deviation > 0 ? '+' : ''}${c.deviation.toFixed(1)}%)`)
    .join('\n')

  const trendList = context.monthlyTrend
    .map(m => `${m.month}/${m.year}: ${m.total} Kc`)
    .join('\n')

  return `${BASE_PROMPT}
SEKCE: Analyza vydaju

DATA ZA ${formatPeriod(context.year, context.month)}:
Celkove vydaje: ${context.totalExpenses} Kc

VYDAJE PODLE KATEGORII:
${categoriesList || '- Zadne vydaje'}

POROVNANI S PRUMEREM (poslednich 6 mesicu):
${comparisonsList || '- Nedostatek historickych dat'}

MESIC-PO-MESICI VYVOJ:
${trendList || '- Nedostatek dat'}

Zamer se na: neobvykle vysoke vydaje, moznosti uspor, kategorie s nejvetsim potencialem ke snizeni.`
}

function buildIncomePrompt(context: IncomeContext): string {
  const sourcesList = context.sources
    .map(s => `- ${s.name}: ${s.amount} Kc (${s.percentOfTotal.toFixed(1)}%)`)
    .join('\n')

  const historyList = context.incomeHistory
    .map(h => `${h.month}/${h.year}: ${h.total} Kc`)
    .join('\n')

  return `${BASE_PROMPT}
SEKCE: Analyza prijmu

DATA ZA ${formatPeriod(context.year, context.month)}:
Celkove prijmy: ${context.totalIncome} Kc

PRIJMY PODLE ZDROJE:
${sourcesList || '- Zadne prijmy'}

DIVERZIFIKACE PRIJMU:
- Pocet aktivnich zdroju: ${context.activeSources}
- Hlavni zdroj: ${context.primarySource.name} (${context.primarySource.percent.toFixed(1)}% celkovych prijmu)

HISTORICKY VYVOJ (6 mesicu):
${historyList || '- Nedostatek dat'}

STABILITA:
- Prumerny mesicni prijem: ${context.averageIncome.toFixed(0)} Kc
- Nejnizsi mesic: ${context.minIncome} Kc
- Nejvyssi mesic: ${context.maxIncome} Kc

Zamer se na: stabilitu prijmu, diverzifikaci, a potencial pro zvyseni.`
}

function buildInvestmentsPrompt(context: InvestmentsContext): string {
  const typesList = context.types
    .map(t => {
      let line = `- ${t.name}: mesicne ${t.monthlyAmount} Kc`
      if (t.totalInvested) {
        line += `, celkem vlozeno ${t.totalInvested} Kc`
      }
      if (t.annualRate) {
        line += `, vynos ${(t.annualRate * 100).toFixed(1)}%`
      }
      if (t.investmentYears) {
        line += `, horizont ${t.investmentYears} let`
      }
      if (t.projectedFinalValue && t.projectedGain) {
        line += `\n  PROJEKCE: konecna hodnota ${t.projectedFinalValue} Kc (zisk ${t.projectedGain} Kc)`
      }
      return line
    })
    .join('\n')

  const typesWithProjections = context.types.filter(t => t.projectedFinalValue)
  const totalProjectedValue = typesWithProjections.reduce((sum, t) => sum + (t.projectedFinalValue || 0), 0)
  const totalProjectedGain = typesWithProjections.reduce((sum, t) => sum + (t.projectedGain || 0), 0)

  return `${BASE_PROMPT}
SEKCE: Analyza investic

DATA ZA ${formatPeriod(context.year, context.month)}:
Celkove mesicni investice: ${context.totalMonthlyInvestments} Kc
Celkem jiz investovano: ${context.totalInvested} Kc
Pomer investic k prijmum: ${context.investmentRate.toFixed(1)}%

INVESTICE PODLE TYPU:
${typesList || '- Zadne investice'}

${typesWithProjections.length > 0 ? `SOUHRNNA PROJEKCE VSECH INVESTIC:
- Ocekavana konecna hodnota: ${totalProjectedValue} Kc
- Ocekavany celkovy zisk z uroku: ${totalProjectedGain} Kc
` : ''}
ROCNI SOUHRN (${context.year}):
- Celkem investovano letos: ${context.yearlyTotal} Kc
- Prumerny mesicni vklad: ${context.yearlyAverage.toFixed(0)} Kc

POROVNANI S VYDAJI:
- Mesicni vydaje: ${context.monthlyExpenses} Kc
- Pomer investice/vydaje: ${context.investToExpenseRatio.toFixed(2)}

OBECNE DOPORUCENI PRO CESKO:
- Doporuceny podil investic: 10-20% cistych prijmu
- Nouzovy fond: ${context.emergencyFundStatus}

Zamer se na: dostatecnost investic, diverzifikaci portfolia, dlouhodobe cile, a silu slozeneho uroceni.`
}

function buildGoalsPrompt(context: GoalsContext): string {
  const goalsList = context.goals
    .map(g => `
- ${g.name}${g.isEmergency ? ' (NOUZOVY FOND)' : ''}:
  Aktualne: ${g.currentAmount} Kc
  Cil: ${g.targetAmount ? g.targetAmount + ' Kc' : 'Neni stanoven'}
  Progres: ${g.progress.toFixed(0)}%${g.isEmergency && g.recommendedTarget ? `
  Doporuceno: ${g.recommendedTarget.toFixed(0)} Kc (3x mesicni vydaje)` : ''}`)
    .join('\n')

  return `${BASE_PROMPT}
SEKCE: Analyza sporicich cilu

CELKOVY STAV:
- Pocet cilu: ${context.totalGoals}
- Celkem nasporeno: ${context.totalSaved} Kc
- Prumerna mira plneni: ${context.averageProgress.toFixed(0)}%

JEDNOTLIVE CILE:
${goalsList || '- Zadne cile'}

NOUZOVY FOND:
- Status: ${context.emergencyFundStatus}
- Aktualni pokryti: ${context.emergencyMonthsCovered.toFixed(1)} mesicu vydaju
- Doporucene pokryti: 3-6 mesicu

MESICNI KAPACITA PRO SPORENI:
- Volne prostredky po vydajich: ${context.availableForSaving} Kc

Zamer se na: prioritizaci cilu, tempo sporeni, a strategii pro dosazeni cilu.`
}

function buildExecutiveSummaryPrompt(context: ExecutiveSummaryContext): string {
  const { sectionInsights } = context

  const formatSection = (name: string, insight?: InsightResponse) => {
    if (!insight) return `${name}: Nedostupne`
    return `${name} (zdravi: ${insight.healthScore}/100 - ${insight.healthLabel}):
  Shrnutí: ${insight.summary}
  Vzorce: ${insight.patterns.join('; ')}
  Doporuceni: ${insight.recommendations.join('; ')}`
  }

  return `${BASE_PROMPT}
SEKCE: Vykonny souhrn - prehled vsech financnich oblasti

Tvym ukolem je vytvorit VYKONNY SOUHRN, ktery shrne vsechny nasledujici detailni analyzy do jednoho konzistentniho prehledu.

ANALYZY JEDNOTLIVYCH SEKCI:

1. VYDAJE:
${formatSection('Vydaje', sectionInsights.expenses)}

2. PRIJMY:
${formatSection('Prijmy', sectionInsights.income)}

3. INVESTICE:
${formatSection('Investice', sectionInsights.investments)}

4. SPORICI CILE:
${formatSection('Cile', sectionInsights.goals)}

5. PUJCKY:
${formatSection('Pujcky', sectionInsights.loans)}

INSTRUKCE PRO VYKONNY SOUHRN:
- Zamer se na CELKOVY financni obraz, ne na jednotlive detaily
- Identifikuj NEJDULEZITEJSI 2-3 vzorce naprec vsemi sekcemi
- Navrhni 2-3 PRIORITNI akce, ktere maji nejvetsi dopad
- Urcil celkove financni zdravi na zaklade vsech sekci
- Bud strucny a akcne orientovany

Celkove healthScore vypocitej jako vazeny prumer vsech sekci (vydaje 25%, prijmy 25%, investice 20%, cile 15%, pujcky 15%).`
}

function buildLoansPrompt(context: LoansContext): string {
  const scenariosList = context.savedScenarios
    .map(s => `
- ${s.name}:
  Vyse: ${s.amount} Kc
  Sazba: ${(s.interestRate * 100).toFixed(2)}%
  Doba: ${s.termMonths} mesicu
  Mesicni splatka: ${s.monthlyPayment.toFixed(0)} Kc
  Verdikt: ${s.verdictLabel}`)
    .join('\n')

  return `${BASE_PROMPT}
SEKCE: Analyza pujcek a jejich dopadu na rozpocet

AKTUALNI FINANCNI SITUACE:
- Mesicni prijmy: ${context.monthlyIncome} Kc
- Mesicni vydaje: ${context.monthlyExpenses} Kc
- Volne prostredky: ${context.disposableIncome} Kc

${context.savedScenarios.length > 0 ? `ULOZENE SCENARE PUJCEK:${scenariosList}` : 'ZADNE ULOZENE SCENARE PUJCEK'}

CESKE UVEROVE PROSTREDI:
- Aktualni prumerna sazba hypotek: 4.9%
- Aktualni prumerna sazba spotrebitelskych uveru: 8.9%
- Doporuceny pomer splatek k prijmum: max 30-35%

STRESS TESTY:
- Aktualni zatizeni: ${context.currentDebtToIncomeRatio.toFixed(1)}%
- Rezerva pro neocekavane vydaje: ${context.safetyMargin} Kc

Zamer se na: schopnost splaceni, optimalni vysi pujcky, a rizika.`
}

// Main export function
export function buildPromptForSection(section: InsightSection, context: ContextType): string {
  switch (section) {
    case 'dashboard':
      return buildDashboardPrompt(context as DashboardContext)
    case 'expenses':
      return buildExpensesPrompt(context as ExpensesContext)
    case 'income':
      return buildIncomePrompt(context as IncomeContext)
    case 'investments':
      return buildInvestmentsPrompt(context as InvestmentsContext)
    case 'goals':
      return buildGoalsPrompt(context as GoalsContext)
    case 'loans':
      return buildLoansPrompt(context as LoansContext)
    default:
      throw new Error(`Unknown section: ${section}`)
  }
}

// Export executive summary prompt builder
export function buildExecutiveSummary(context: ExecutiveSummaryContext): string {
  return buildExecutiveSummaryPrompt(context)
}

// Parse Claude's JSON response
export function parseInsightResponse(output: string): InsightResponse {
  // Try to extract JSON from the output (Claude might add extra text)
  const jsonMatch = output.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in response')
  }

  const parsed = JSON.parse(jsonMatch[0])

  // Validate required fields
  if (!parsed.summary || !Array.isArray(parsed.patterns) || !Array.isArray(parsed.recommendations)) {
    throw new Error('Invalid response structure')
  }

  // Ensure healthScore is a number
  const healthScore = typeof parsed.healthScore === 'number' ? parsed.healthScore : 50

  // Validate and set healthLabel
  const validLabels = ['Vynikajici', 'Dobry', 'Potrebuje pozornost', 'Rizikovy'] as const
  const healthLabel = validLabels.includes(parsed.healthLabel)
    ? parsed.healthLabel
    : getHealthLabel(healthScore)

  return {
    summary: parsed.summary,
    patterns: parsed.patterns.slice(0, 5), // Max 5 patterns
    recommendations: parsed.recommendations.slice(0, 5), // Max 5 recommendations
    healthScore,
    healthLabel,
  }
}

// Helper to derive health label from score
function getHealthLabel(score: number): InsightResponse['healthLabel'] {
  if (score >= 85) return 'Vynikajici'
  if (score >= 65) return 'Dobry'
  if (score >= 40) return 'Potrebuje pozornost'
  return 'Rizikovy'
}
