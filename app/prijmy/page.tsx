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
import { Check, X, Pencil, Trash2, TrendingUp } from 'lucide-react'
import type { IncomePageData, IncomeSourceWithAmount } from '@/lib/types'

export default function IncomePage() {
  // Data fetching with period management
  const { data, loading, period, setPeriod, refetch } = useMonthlyData<IncomePageData>({
    endpoint: '/api/income',
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
    onSaveValue: async (sourceId, value) => {
      const amount = parseCurrencyInput(value)
      if (amount === null) return

      await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          year: period.year,
          month: period.month,
          amount,
        }),
      })
    },
    onSaveName: async (sourceId, name) => {
      await fetch('/api/income/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sourceId, name }),
      })
    },
    onSaveSuccess: refetch,
  })

  // Handlers
  const handleAddSource = async (name: string) => {
    await fetch('/api/income/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    refetch()
  }

  const handleDeleteSource = async (sourceId: string) => {
    await fetch(`/api/income/sources?id=${sourceId}`, {
      method: 'DELETE',
    })
    refetch()
  }

  const handleEditStart = (source: IncomeSourceWithAmount) => {
    startEdit(source.id, source.income?.amount)
    startNameEdit(source.id, source.name)
  }

  const handleEditCancel = () => {
    cancelEdit()
    cancelNameEdit()
  }

  const handleEditSave = async (id: string) => {
    await saveNameEdit(id)
    await saveEdit(id)
  }

  const totalIncome = data?.sources.reduce(
    (sum, src) => sum + (src.income?.amount || 0),
    0
  ) || 0

  return (
    <div className="space-y-8">
      <PageHeader
        title="Příjmy"
        period={period}
        onPeriodChange={(year, month) => setPeriod({ year, month })}
      />

      {/* Total Income Card */}
      <Card className="opacity-0 animate-fade-in">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1B5E20]/10">
                <TrendingUp className="h-6 w-6 text-[#1B5E20]" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Celkové příjmy</div>
                <div className="font-mono-numbers text-2xl font-semibold text-[#1B5E20]">
                  {formatCurrency(totalIncome, false)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Table */}
      <Card className="opacity-0 animate-fade-in stagger-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Příjmy podle zdroje</CardTitle>
            <AddItemDialog
              title="Přidat nový zdroj příjmu"
              buttonLabel="Přidat zdroj"
              inputLabel="Název zdroje"
              inputPlaceholder="např. Vedlejší příjem"
              onAdd={handleAddSource}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={3} columns={4} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Zdroj</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.sources.map((source, index) => (
                  <TableRow key={source.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {editingId === source.id ? (
                        <Input
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="h-8 w-full max-w-[200px]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(source.id)
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                        />
                      ) : (
                        <span>{source.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === source.id ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 w-32 text-right font-mono-numbers ml-auto"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(source.id)
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                        />
                      ) : (
                        <span
                          className={cn(
                            'font-mono-numbers',
                            source.income?.amount ? 'text-[#1B5E20]' : 'text-muted-foreground'
                          )}
                        >
                          {source.income?.amount
                            ? formatCurrency(source.income.amount, false)
                            : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === source.id ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditSave(source.id)}
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
                            onClick={() => handleEditStart(source)}
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
                                <AlertDialogTitle>Smazat zdroj příjmu?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Opravdu chcete smazat zdroj &quot;{source.name}&quot;? Tato akce
                                  smaže i všechny záznamy příjmů z tohoto zdroje a nelze ji vzít zpět.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSource(source.id)}
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
