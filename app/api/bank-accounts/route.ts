import { prisma } from '@/lib/db'
import {
  successResponse,
  errorResponse,
  badRequestResponse,
} from '@/lib/api'

/**
 * GET /api/bank-accounts - Fetch all user bank accounts
 */
export async function GET() {
  try {
    const accounts = await prisma.userBankAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(accounts)
  } catch (error) {
    console.error('Error fetching bank accounts:', error)
    return errorResponse('Failed to fetch bank accounts')
  }
}

/**
 * POST /api/bank-accounts - Create a new user bank account
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, accountNumber, bankCode, iban, accountType } = body

    if (!name || !accountNumber || !accountType) {
      return badRequestResponse('Chybí povinná pole: name, accountNumber, accountType')
    }

    // Validate account type
    const validTypes = ['checking', 'savings', 'credit_card', 'business', 'investment']
    if (!validTypes.includes(accountType)) {
      return badRequestResponse(`Neplatný typ účtu. Povolené hodnoty: ${validTypes.join(', ')}`)
    }

    // Check if account already exists
    const existing = await prisma.userBankAccount.findUnique({
      where: { accountNumber },
    })

    if (existing) {
      return badRequestResponse('Účet s tímto číslem již existuje')
    }

    const account = await prisma.userBankAccount.create({
      data: {
        name,
        accountNumber,
        bankCode: bankCode || null,
        iban: iban || null,
        accountType,
        isActive: true,
      },
    })

    return successResponse(account, 201)
  } catch (error) {
    console.error('Error creating bank account:', error)
    return errorResponse('Failed to create bank account')
  }
}

/**
 * PATCH /api/bank-accounts - Update a user bank account
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, name, accountNumber, bankCode, iban, accountType, isActive } = body

    if (!id) {
      return badRequestResponse('Chybí ID účtu')
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber
    if (bankCode !== undefined) updateData.bankCode = bankCode
    if (iban !== undefined) updateData.iban = iban
    if (accountType !== undefined) {
      const validTypes = ['checking', 'savings', 'credit_card', 'business', 'investment']
      if (!validTypes.includes(accountType)) {
        return badRequestResponse(`Neplatný typ účtu. Povolené hodnoty: ${validTypes.join(', ')}`)
      }
      updateData.accountType = accountType
    }
    if (isActive !== undefined) updateData.isActive = isActive

    const account = await prisma.userBankAccount.update({
      where: { id },
      data: updateData,
    })

    return successResponse(account)
  } catch (error) {
    console.error('Error updating bank account:', error)
    return errorResponse('Failed to update bank account')
  }
}

/**
 * DELETE /api/bank-accounts - Delete a user bank account
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return badRequestResponse('Chybí ID účtu')
    }

    await prisma.userBankAccount.delete({
      where: { id },
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error('Error deleting bank account:', error)
    return errorResponse('Failed to delete bank account')
  }
}
