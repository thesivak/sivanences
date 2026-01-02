import { NextResponse, NextRequest } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/db'
import {
  buildExecutiveSummary,
  parseInsightResponse,
  type InsightResponse,
  type InsightSection,
  type ExecutiveSummaryContext,
} from '@/lib/ai-prompts'

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API,
})

// Individual sections that make up the executive summary
const INDIVIDUAL_SECTIONS: InsightSection[] = ['expenses', 'income', 'investments', 'goals', 'loans']

interface AIInsightResult {
  section: string
  insights: InsightResponse
  generatedAt: string
  cached: boolean
  sectionsUsed: number
  sectionsTotal: number
}

// Generate insight using OpenAI
async function generateInsight(prompt: string): Promise<string> {
  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    input: prompt,
  })
  return response.output_text?.trim() || ''
}

// GET - Fetch cached executive summary from database
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')

    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
    }

    // Fetch executive summary cache
    const cached = await prisma.cachedInsight.findUnique({
      where: {
        section_year_month: { section: 'executive-summary', year, month }
      }
    })

    if (!cached) {
      return NextResponse.json({ cached: null })
    }

    const insights: InsightResponse = JSON.parse(cached.insights)

    return NextResponse.json({
      cached: {
        section: 'executive-summary',
        insights,
        generatedAt: cached.generatedAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Error fetching cached executive summary:', error)
    return NextResponse.json({ error: 'Failed to fetch cached insight' }, { status: 500 })
  }
}

// POST - Generate executive summary from cached individual section insights
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { year, month, forceRefresh } = body

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 })
    }

    // Check if we have a cached executive summary (unless forceRefresh)
    if (!forceRefresh) {
      const existingCache = await prisma.cachedInsight.findUnique({
        where: {
          section_year_month: { section: 'executive-summary', year, month }
        }
      })

      if (existingCache) {
        const insights: InsightResponse = JSON.parse(existingCache.insights)
        return NextResponse.json({
          section: 'executive-summary',
          insights,
          generatedAt: existingCache.generatedAt.toISOString(),
          cached: true,
          sectionsUsed: INDIVIDUAL_SECTIONS.length,
          sectionsTotal: INDIVIDUAL_SECTIONS.length,
        })
      }
    }

    // Fetch all individual section caches
    const sectionCaches = await prisma.cachedInsight.findMany({
      where: {
        year,
        month,
        section: { in: INDIVIDUAL_SECTIONS }
      }
    })

    // Build context from cached insights
    const sectionInsights: ExecutiveSummaryContext['sectionInsights'] = {}
    let sectionsFound = 0

    for (const cache of sectionCaches) {
      try {
        const insights: InsightResponse = JSON.parse(cache.insights)
        const section = cache.section as keyof typeof sectionInsights
        if (INDIVIDUAL_SECTIONS.includes(section as InsightSection)) {
          sectionInsights[section] = insights
          sectionsFound++
        }
      } catch {
        console.error(`Failed to parse cached insight for section ${cache.section}`)
      }
    }

    // If no sections have insights yet, return early with a message
    if (sectionsFound === 0) {
      return NextResponse.json({
        error: 'Zadne jednotlive sekce jeste nemaji postrehy. Nejprve navstivte jednotlive sekce.',
        sectionsUsed: 0,
        sectionsTotal: INDIVIDUAL_SECTIONS.length,
      }, { status: 400 })
    }

    // Build the executive summary context
    const context: ExecutiveSummaryContext = {
      year,
      month,
      sectionInsights,
    }

    // Generate executive summary prompt
    const prompt = buildExecutiveSummary(context)

    // Call OpenAI API
    let rawOutput: string
    try {
      rawOutput = await generateInsight(prompt)
    } catch (apiError) {
      console.error('OpenAI API error:', apiError)
      const error = apiError as Error & { status?: number; message?: string }
      if (error.status === 429) {
        return NextResponse.json({ error: 'Prilis mnoho pozadavku, zkuste pozdeji' }, { status: 429 })
      }
      if (error.status === 401) {
        return NextResponse.json({ error: 'Neplatny API klic' }, { status: 401 })
      }
      return NextResponse.json({
        error: 'Chyba pri volani AI API',
        details: error.message || String(apiError)
      }, { status: 500 })
    }

    // Parse JSON from output
    let insights: InsightResponse
    try {
      insights = parseInsightResponse(rawOutput)
    } catch {
      return NextResponse.json({
        error: 'Nepodarilo se zpracovat AI odpoved',
        rawOutput: rawOutput.substring(0, 500),
      }, { status: 500 })
    }

    // Cache the executive summary
    const generatedAt = new Date()
    await prisma.cachedInsight.upsert({
      where: {
        section_year_month: { section: 'executive-summary', year, month }
      },
      update: {
        insights: JSON.stringify(insights),
        generatedAt,
      },
      create: {
        section: 'executive-summary',
        year,
        month,
        insights: JSON.stringify(insights),
        generatedAt,
      },
    })

    const result: AIInsightResult = {
      section: 'executive-summary',
      insights,
      generatedAt: generatedAt.toISOString(),
      cached: false,
      sectionsUsed: sectionsFound,
      sectionsTotal: INDIVIDUAL_SECTIONS.length,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating executive summary:', error)
    return NextResponse.json({ error: 'Chyba pri generovani vykonneho souhrnu' }, { status: 500 })
  }
}
