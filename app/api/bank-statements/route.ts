import { prisma } from '@/lib/db'
import {
  successResponse,
  errorResponse,
  badRequestResponse,
} from '@/lib/api'
import { parseBankStatement } from '@/lib/bank-statement'
import type { ParsedBankStatement } from '@/lib/types'

/**
 * GET /api/bank-statements - Fetch all bank statement uploads
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where = status ? { status } : {}

    const uploads = await prisma.bankStatementUpload.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Parse the JSON parsedData field
    const result = uploads.map((upload: { parsedData: string | null; [key: string]: unknown }) => ({
      ...upload,
      parsedData: upload.parsedData ? JSON.parse(upload.parsedData) as ParsedBankStatement : null,
    }))

    return successResponse(result)
  } catch (error) {
    console.error('Error fetching bank statements:', error)
    return errorResponse('Failed to fetch bank statements')
  }
}

/**
 * POST /api/bank-statements - Upload and parse a bank statement PDF
 */
export async function POST(request: Request) {
  try {
    // Handle multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return badRequestResponse('Nebyl nahrán žádný soubor')
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return badRequestResponse('Podporovány jsou pouze PDF soubory')
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Fetch categories, income sources, and user accounts for parsing
    const [categories, incomeSources, userAccounts] = await Promise.all([
      prisma.category.findMany({ orderBy: { order: 'asc' } }),
      prisma.incomeSource.findMany({ orderBy: { order: 'asc' } }),
      prisma.userBankAccount.findMany({ where: { isActive: true } }),
    ])

    // Parse the bank statement
    const parsedStatement = await parseBankStatement(
      buffer,
      categories,
      incomeSources,
      userAccounts.map((a: { accountNumber: string }) => a.accountNumber)
    )

    // Determine statement period (MM/YYYY)
    const periodDate = new Date(parsedStatement.metadata.periodEnd || parsedStatement.metadata.periodStart)
    const statementPeriod = `${(periodDate.getMonth() + 1).toString().padStart(2, '0')}/${periodDate.getFullYear()}`

    // Save to database
    const upload = await prisma.bankStatementUpload.create({
      data: {
        filename: file.name,
        statementPeriod,
        accountNumber: parsedStatement.metadata.accountNumber || null,
        bankName: parsedStatement.metadata.bankName || null,
        accountType: parsedStatement.metadata.accountType || null,
        startingBalance: parsedStatement.metadata.startingBalance || null,
        endingBalance: parsedStatement.metadata.endingBalance || null,
        totalCredits: parsedStatement.metadata.totalCredits || null,
        totalDebits: parsedStatement.metadata.totalDebits || null,
        transactionCount: parsedStatement.transactions.length,
        status: 'pending',
        parsedData: JSON.stringify(parsedStatement),
      },
    })

    return successResponse({
      id: upload.id,
      filename: upload.filename,
      statementPeriod: upload.statementPeriod,
      status: upload.status,
      parsedData: parsedStatement,
    }, 201)
  } catch (error) {
    console.error('Error parsing bank statement:', error)
    return errorResponse(`Chyba při zpracování výpisu: ${error instanceof Error ? error.message : 'Neznámá chyba'}`)
  }
}

/**
 * DELETE /api/bank-statements - Delete a bank statement upload
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return badRequestResponse('Chybí ID výpisu')
    }

    await prisma.bankStatementUpload.delete({
      where: { id },
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error('Error deleting bank statement:', error)
    return errorResponse('Failed to delete bank statement')
  }
}
