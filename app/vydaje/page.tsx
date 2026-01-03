'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { AddItemDialog } from '@/components/add-item-dialog'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useMonthlyData } from '@/lib/hooks'
import { useDoubleInlineEdit } from '@/lib/hooks/use-inline-edit'
import { formatCurrency, parseCurrencyInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Check, X, Pencil, Trash2 } from 'lucide-react'
import type { ExpensesPageData, CategoryWithExpense } from '@/lib/types'

export default function ExpensesPage() {
  // Data fetching with period management
  const { data, loading, period, setPeriod, refetch } = useMonthlyData<ExpensesPageData>({
    endpoint: '/api/expenses',
  })

  // Inline editing state
  const {
    editingId,
    editValue,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditValue,
    editingNameId,
    editNameValue,
    startNameEdit,
    cancelNameEdit,
    saveNameEdit,
    setEditNameValue,
  } = useDoubleInlineEdit({
    onSaveValue: async (categoryId, value) => {
      const amount = parseCurrencyInput(value)
      if (amount === null) return

      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          year: period.year,
          month: period.month,
          amount,
        }),
      })
    },
    onSaveName: async (categoryId, name) => {
      await fetch('/api/expenses/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: categoryId, name }),
      })
    },
    onSaveSuccess: refetch,
  })

  // Handlers
  const handleAddCategory = async (name: string) => {
    await fetch('/api/expenses/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    refetch()
  }

  const handleDeleteCategory = async (categoryId: string) => {
    await fetch(`/api/expenses/categories?id=${categoryId}`, {
      method: 'DELETE',
    })
    refetch()
  }

  const handleEditStart = (cat: CategoryWithExpense) => {
    startEdit(cat.id, cat.expense?.amount)
    startNameEdit(cat.id, cat.name)
  }

  const handleEditCancel = () => {
    cancelEdit()
    cancelNameEdit()
  }

  const handleEditSave = async (id: string) => {
    await saveNameEdit(id)
    await saveEdit(id)
  }

  const totalExpenses = data?.categories.reduce(
    (sum, cat) => sum + (cat.expense?.amount || 0),
    0
  ) || 0

  return (
    <div className="space-y-8">
      <PageHeader
        title="Výdaje"
        period={period}
        onPeriodChange={(year, month) => setPeriod({ year, month })}
      />

      <Card className="opacity-0 animate-fade-in stagger-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Výdaje podle kategorií</CardTitle>
            <div className="flex items-center gap-4">
              <div className="font-mono-numbers text-lg font-semibold">
                Celkem: {formatCurrency(totalExpenses, false)}
              </div>
              <AddItemDialog
                title="Přidat novou kategorii"
                buttonLabel="Přidat kategorii"
                inputLabel="Název kategorie"
                inputPlaceholder="např. Dovolená"
                onAdd={handleAddCategory}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.categories.map((cat, index) => (
                  <TableRow key={cat.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {editingId === cat.id ? (
                        <Input
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="h-8 w-full max-w-[200px]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(cat.id)
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                        />
                      ) : (
                        <span>{cat.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === cat.id ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 w-32 text-right font-mono-numbers ml-auto"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(cat.id)
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                        />
                      ) : (
                        <span
                          className={cn(
                            'font-mono-numbers',
                            cat.expense?.amount ? '' : 'text-muted-foreground'
                          )}
                        >
                          {cat.expense?.amount
                            ? formatCurrency(cat.expense.amount, false)
                            : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === cat.id ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditSave(cat.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleEditCancel}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditStart(cat)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Smazat kategorii?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Opravdu chcete smazat kategorii &quot;{cat.name}&quot;? Tato akce
                                  smaže i všechny záznamy výdajů v této kategorii a nelze ji vzít zpět.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                  Smazat
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
