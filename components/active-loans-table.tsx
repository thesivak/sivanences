'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency, formatPercent } from '@/lib/format'
import { Plus, Pencil, Trash2, CreditCard, Home, Wallet } from 'lucide-react'
import { AddLoanDialog } from './add-loan-dialog'

export interface ActiveLoanWithDetails {
  id: string
  name: string
  type: string
  originalAmount: number
  remainingAmount: number
  interestRate: number
  monthlyPayment: number
  startDate: string
  termMonths: number
  calculatedBalance: number
  paymentsMade: number
  monthsRemaining: number
  paidOffPercent: number
}

interface ActiveLoansTableProps {
  loans: ActiveLoanWithDetails[]
  loading: boolean
  onRefresh: () => void
}

export function ActiveLoansTable({ loans, loading, onRefresh }: ActiveLoansTableProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editLoan, setEditLoan] = useState<ActiveLoanWithDetails | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [loanToDelete, setLoanToDelete] = useState<ActiveLoanWithDetails | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleEdit = (loan: ActiveLoanWithDetails) => {
    setEditLoan(loan)
    setAddDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!loanToDelete) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/loans/active?id=${loanToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteDialogOpen(false)
        setLoanToDelete(null)
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to delete loan:', error)
    } finally {
      setDeleting(false)
    }
  }

  const totalMonthlyPayment = loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0)
  const totalRemainingBalance = loans.reduce((sum, loan) => sum + loan.calculatedBalance, 0)
  const totalOriginalAmount = loans.reduce((sum, loan) => sum + loan.originalAmount, 0)

  const getTypeIcon = (type: string) => {
    return type === 'MORTGAGE' ? (
      <Home className="h-4 w-4" />
    ) : (
      <CreditCard className="h-4 w-4" />
    )
  }

  const getTypeLabel = (type: string) => {
    return type === 'MORTGAGE' ? 'Hypoteka' : 'Uver'
  }

  return (
    <>
      <Card className="opacity-0 animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Aktivni pujcky
          </CardTitle>
          <Button onClick={() => { setEditLoan(null); setAddDialogOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Pridat pujcku
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : loans.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">Zatim nemáte žádné aktivní pujcky</p>
              <Button
                className="mt-4"
                onClick={() => { setEditLoan(null); setAddDialogOpen(true) }}
              >
                Pridat prvni pujcku
              </Button>
            </div>
          ) : (
            <>
              {/* Summary Row */}
              <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-4">
                <div>
                  <div className="text-sm text-muted-foreground">Celkove mesicni splatky</div>
                  <div className="font-mono-numbers text-xl font-semibold">
                    {formatCurrency(totalMonthlyPayment, false)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Zbyva splatit</div>
                  <div className="font-mono-numbers text-xl font-semibold">
                    {formatCurrency(totalRemainingBalance, false)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Celkem splaceno</div>
                  <div className="font-mono-numbers text-xl font-semibold text-[#1B5E20]">
                    {formatPercent((totalOriginalAmount - totalRemainingBalance) / totalOriginalAmount * 100)}
                  </div>
                </div>
              </div>

              {/* Loans Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazev</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="text-right">Zustatek</TableHead>
                    <TableHead className="text-right">Splatka</TableHead>
                    <TableHead className="text-right">Urok</TableHead>
                    <TableHead>Prubeh</TableHead>
                    <TableHead className="text-right">Zbyvá</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {getTypeIcon(loan.type)}
                          {getTypeLabel(loan.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-mono-numbers">
                          {formatCurrency(loan.calculatedBalance, false)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          z {formatCurrency(loan.originalAmount, false)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono-numbers">
                        {formatCurrency(loan.monthlyPayment, false)}
                      </TableCell>
                      <TableCell className="text-right font-mono-numbers">
                        {loan.interestRate.toFixed(1)} %
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <Progress value={loan.paidOffPercent} className="h-2" />
                          <div className="mt-1 text-xs text-muted-foreground">
                            {loan.paidOffPercent.toFixed(0)} % splaceno
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          {loan.monthsRemaining} mesicu
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ({Math.floor(loan.monthsRemaining / 12)} let)
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(loan)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => { setLoanToDelete(loan); setDeleteDialogOpen(true) }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <AddLoanDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={onRefresh}
        editLoan={editLoan}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat pujcku</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-muted-foreground">
              Opravdu chcete smazat pujcku{' '}
              <span className="font-medium text-foreground">{loanToDelete?.name}</span>?
              Tato akce je nevratna.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Zrusit
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Mazani...' : 'Smazat'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
