import { isClaudeCliAvailable, callClaudeForJson } from '@/lib/claude'
import type { RawTransaction } from './transaction-extractor'
import type { Category, IncomeSource, ParsedTransaction, TransactionType } from '@/lib/types'

// Check if Claude CLI is available (uses Max subscription, no API charges)
const claudeCliAvailable = isClaudeCliAvailable()

// Response type for Claude transaction categorization
interface TransactionCategorizationResponse {
  transactions: Array<{
    id: string
    transactionType: 'expense' | 'income' | 'transfer' | 'unknown'
    categoryName: string | null
    incomeSourceName: string | null
    confidence: number
    reasoning: string
  }>
}

type TransactionCategorization = TransactionCategorizationResponse['transactions'][0]

/**
 * Build system prompt for transaction categorization
 */
function buildCategorizationSystemPrompt(
  categories: Category[],
  incomeSources: IncomeSource[]
): string {
  return `Jsi finanční asistent specializující se na kategorizaci bankovních transakcí pro českou domácnost.

ÚKOL: Kategorizuj každou transakci do správné kategorie výdajů nebo zdroje příjmu.

DOSTUPNÉ KATEGORIE VÝDAJŮ:
${categories.map(c => `- ${c.name}`).join('\n')}

DOSTUPNÉ ZDROJE PŘÍJMŮ:
${incomeSources.map(s => `- ${s.name}`).join('\n')}

PRAVIDLA:
1. Záporné částky (výdaje) přiřaď do KATEGORIE VÝDAJŮ
2. Kladné částky (příjmy) přiřaď do ZDROJE PŘÍJMU
3. Převody mezi vlastními účty označ jako "transfer"
4. U každé transakce uveď míru jistoty (confidence) 0-1
5. Pokud si nejsi jistý, použij kategorii "Ostatní" nebo zdroj "Ostatní"

TIPY PRO KATEGORIZACI:
- "Trvalý příkaz" na vysokou částku + majitel jména = pravděpodobně "Bydlení" (nájem)
- "Fitko", "Gym", "Sport" = "Zdraví" nebo "Osobní"
- "Potraviny", "Albert", "Billa", "Lidl", "Kaufland", "Tesco" = "Potraviny"
- "Restaurace", "McDonald", "KFC", "Pizzerie" = "Restaurace"
- "Alza", "Mall", "CZC" = záleží na kontextu, často "Domácnost" nebo "Osobní"
- "RED RAT", "H&M", "Zara" = "Oblečení"
- "Lékárna", "Doktor", "Nemocnice" = "Zdraví"
- "ČEZ", "PRE", "Innogy", "Plyn" = "Energie"
- "O2", "Vodafone", "T-Mobile" = "Komunikace"
- "Pojišťovna", "Insurance" = "Pojištění"
- "Příchozí úhrada" s vysokou částkou = pravděpodobně "Mzda"
- "Příchozí úhrada" s nízkou částkou = může být "Ostatní" nebo "Bonusy"

DŮLEŽITÉ: Použij PŘESNĚ názvy kategorií a zdrojů příjmů ze seznamu výše!

Vrať odpověď jako JSON v tomto formátu:
{
  "transactions": [
    {
      "id": "tx-0",
      "transactionType": "expense|income|transfer|unknown",
      "categoryName": "název kategorie nebo null",
      "incomeSourceName": "název zdroje příjmu nebo null",
      "confidence": 0.0-1.0,
      "reasoning": "krátké vysvětlení"
    }
  ]
}`
}

/**
 * Build user prompt with transactions to categorize
 */
function buildCategorizationUserPrompt(transactions: { id: string; description: string; amount: number }[]): string {
  return `Kategorizuj následující transakce:

${transactions.map(t => `ID: ${t.id}
Popis: ${t.description}
Částka: ${t.amount.toLocaleString('cs-CZ')} Kč
---`).join('\n')}

Vrať kategorizaci pro každou transakci jako JSON.`
}

/**
 * Categorize transactions using AI (Claude CLI)
 */
export async function categorizeTransactionsWithAI(
  transactions: RawTransaction[],
  categories: Category[],
  incomeSources: IncomeSource[]
): Promise<Map<string, TransactionCategorization>> {
  const results = new Map<string, TransactionCategorization>()

  // If Claude CLI is not available, use fallback categorization
  if (!claudeCliAvailable) {
    console.log('Claude CLI not available, using fallback categorization')
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i]
      const id = `tx-${i}`
      results.set(id, fallbackCategorize(tx, categories, incomeSources, id))
    }
    return results
  }

  // Prepare transactions for AI (batch if needed)
  const txForAI = transactions.map((tx, i) => ({
    id: `tx-${i}`,
    description: tx.description + (tx.counterAccountName ? ` (${tx.counterAccountName})` : ''),
    amount: tx.amount,
  }))

  // Process in batches of 20 to avoid token limits
  const BATCH_SIZE = 20

  for (let i = 0; i < txForAI.length; i += BATCH_SIZE) {
    const batch = txForAI.slice(i, i + BATCH_SIZE)

    try {
      console.log(`Categorizing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(txForAI.length / BATCH_SIZE)} via Claude CLI...`)

      const parsed = await callClaudeForJson<TransactionCategorizationResponse>(
        buildCategorizationSystemPrompt(categories, incomeSources),
        buildCategorizationUserPrompt(batch),
        { timeout: 120000 } // 2 minute timeout
      )

      if (parsed?.transactions) {
        for (const tx of parsed.transactions) {
          results.set(tx.id, tx)
        }
      }
    } catch (error) {
      console.error('AI categorization error:', error)
      // Fallback for failed batch
      for (const tx of batch) {
        const rawTx = transactions[parseInt(tx.id.replace('tx-', ''))]
        results.set(tx.id, fallbackCategorize(rawTx, categories, incomeSources, tx.id))
      }
    }
  }

  return results
}

/**
 * Fallback categorization without AI
 */
function fallbackCategorize(
  tx: RawTransaction,
  categories: Category[],
  incomeSources: IncomeSource[],
  id: string
): TransactionCategorization {
  const description = tx.description.toLowerCase()
  const counterName = tx.counterAccountName?.toLowerCase() || ''

  // Determine transaction type
  let transactionType: TransactionType = tx.amount >= 0 ? 'income' : 'expense'

  // Check for transfers
  if (
    description.includes('převod mezi') ||
    description.includes('vnitřní převod') ||
    description.includes('splátka kreditní karty')
  ) {
    transactionType = 'transfer'
  }

  // Categorize expenses
  let categoryName: string | null = null
  let incomeSourceName: string | null = null
  let confidence = 0.5

  if (transactionType === 'expense') {
    // Pattern matching for categories
    const categoryPatterns: Record<string, RegExp[]> = {
      'Potraviny': [/potraviny/i, /albert/i, /billa/i, /lidl/i, /kaufland/i, /tesco/i, /penny/i],
      'Restaurace': [/restaurace/i, /mcdonald/i, /kfc/i, /pizza/i, /burger/i, /sendvic/i, /sendvič/i],
      'Doprava': [/doprava/i, /benzín/i, /nafta/i, /čerpací/i, /shell/i, /omv/i, /mol/i, /parkování/i],
      'Oblečení': [/red rat/i, /h&m/i, /zara/i, /reserved/i, /c&a/i, /oblečení/i],
      'Zdraví': [/lékárna/i, /pharmacy/i, /doktor/i, /nemocnice/i, /fitko/i, /fitness/i, /gym/i, /protein/i, /creatin/i],
      'Bydlení': [/nájem/i, /bydlení/i, /hypotéka/i],
      'Energie': [/čez/i, /pre/i, /innogy/i, /plyn/i, /energie/i, /elektřina/i],
      'Komunikace': [/o2/i, /vodafone/i, /t-mobile/i, /telefon/i, /internet/i],
      'Pojištění': [/pojišťovna/i, /insurance/i, /pojištění/i],
      'Zábava': [/kino/i, /divadlo/i, /koncert/i, /netflix/i, /spotify/i, /hry/i],
      'Domácnost': [/ikea/i, /hornbach/i, /obi/i, /baumax/i, /domácnost/i],
      'Vzdělávání': [/škola/i, /kurz/i, /vzdělání/i, /kniha/i],
      'Děti': [/dětské/i, /hračky/i, /školka/i],
    }

    for (const [catName, patterns] of Object.entries(categoryPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(description) || pattern.test(counterName)) {
          categoryName = catName
          confidence = 0.7
          break
        }
      }
      if (categoryName) break
    }

    // Default to 'Ostatní' if no match
    if (!categoryName) {
      categoryName = 'Ostatní'
      confidence = 0.3
    }

    // Verify category exists
    const matchedCategory = categories.find(c => c.name === categoryName)
    if (!matchedCategory) {
      categoryName = categories.find(c => c.name === 'Ostatní')?.name || categories[0]?.name || 'Ostatní'
    }
  } else if (transactionType === 'income') {
    // Categorize income
    if (tx.amount > 20000) {
      incomeSourceName = 'Mzda'
      confidence = 0.7
    } else if (tx.amount > 5000) {
      incomeSourceName = 'Bonusy'
      confidence = 0.5
    } else {
      incomeSourceName = 'Ostatní'
      confidence = 0.4
    }

    // Verify source exists
    const matchedSource = incomeSources.find(s => s.name === incomeSourceName)
    if (!matchedSource) {
      incomeSourceName = incomeSources.find(s => s.name === 'Ostatní')?.name || incomeSources[0]?.name || 'Ostatní'
    }
  }

  return {
    id,
    transactionType,
    categoryName,
    incomeSourceName,
    confidence,
    reasoning: 'Automatická kategorizace na základě klíčových slov',
  }
}

/**
 * Convert raw transactions to parsed transactions with AI categorization
 */
export async function processTransactions(
  rawTransactions: RawTransaction[],
  categories: Category[],
  incomeSources: IncomeSource[],
  userAccounts: string[] // Account numbers to exclude as internal transfers
): Promise<ParsedTransaction[]> {
  // Get AI categorizations
  const categorizations = await categorizeTransactionsWithAI(rawTransactions, categories, incomeSources)

  // Map categories and income sources by name for lookup
  const categoryByName = new Map(categories.map(c => [c.name, c]))
  const incomeSourceByName = new Map(incomeSources.map(s => [s.name, s]))

  // Convert to ParsedTransaction format
  return rawTransactions.map((tx, i) => {
    const id = `tx-${i}`
    const categorization = categorizations.get(id)

    // Check if counter account is user's own account
    const isInternalTransfer = tx.counterAccountNumber
      ? userAccounts.some(acc => tx.counterAccountNumber?.includes(acc.split('/')[0]))
      : false

    // Lookup category/source IDs
    const category = categorization?.categoryName
      ? categoryByName.get(categorization.categoryName)
      : null
    const incomeSource = categorization?.incomeSourceName
      ? incomeSourceByName.get(categorization.incomeSourceName)
      : null

    return {
      id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      counterAccountNumber: tx.counterAccountNumber,
      counterAccountName: tx.counterAccountName,
      variableSymbol: tx.variableSymbol,
      constantSymbol: tx.constantSymbol,
      specificSymbol: tx.specificSymbol,
      transactionType: (categorization?.transactionType || (tx.amount >= 0 ? 'income' : 'expense')) as TransactionType,
      suggestedCategoryId: category?.id || null,
      suggestedCategoryName: categorization?.categoryName || null,
      suggestedIncomeSourceId: incomeSource?.id || null,
      suggestedIncomeSourceName: categorization?.incomeSourceName || null,
      confidence: categorization?.confidence || 0.5,
      isInternalTransfer: isInternalTransfer || categorization?.transactionType === 'transfer',
      isDuplicate: false, // Will be set by duplicate detection
      duplicateReason: null,
      excluded: isInternalTransfer || categorization?.transactionType === 'transfer',
      excludeReason: isInternalTransfer ? 'Převod mezi vlastními účty' : null,
    }
  })
}
