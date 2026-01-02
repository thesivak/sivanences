'use client'

import { useEffect, useState, useCallback } from 'react'
import { MonthSelector } from '@/components/month-selector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'
import { formatCurrency, formatMonth, getCurrentPeriod, parseCurrencyInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Check, X, Pencil, Trash2, Plus } from 'lucide-react'
import { AiInsightCard } from '@/components/ai-insight-card'

interface CategoryExpense {
  id: string
  name: string
  icon: string | null
  order: number
  expense: {
    id: string
    amount: number
  } | null
}

interface ExpensesData {
  year: number
  month: number
  categories: CategoryExpense[]
}

export default function ExpensesPage() {
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [data, setData] = useState<ExpensesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/expenses?year=${period.year}&month=${period.month}`)
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleEditStart = (cat: CategoryExpense) => {
    setEditingId(cat.id)
    setEditValue(cat.expense?.amount?.toString() || '')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleEditSave = async (categoryId: string) => {
    const amount = parseCurrencyInput(editValue)
    if (amount === null) {
      handleEditCancel()
      return
    }

    try {
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

      setEditingId(null)
      setEditValue('')
      fetchData()
    } catch (error) {
      console.error('Failed to save expense:', error)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await fetch(`/api/expenses/categories?id=${categoryId}`, {
        method: 'DELETE',
      })
      fetchData()
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const handleEditNameStart = (cat: CategoryExpense) => {
    setEditingNameId(cat.id)
    setEditNameValue(cat.name)
  }

  const handleEditNameCancel = () => {
    setEditingNameId(null)
    setEditNameValue('')
  }

  const handleEditNameSave = async (categoryId: string) => {
    if (!editNameValue.trim()) {
      handleEditNameCancel()
      return
    }

    try {
      await fetch('/api/expenses/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: categoryId,
          name: editNameValue.trim(),
        }),
      })

      setEditingNameId(null)
      setEditNameValue('')
      fetchData()
    } catch (error) {
      console.error('Failed to update category name:', error)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      setNewCategoryName('')
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Failed to add category:', error)
    }
  }

  const totalExpenses = data?.categories.reduce((sum, cat) => sum + (cat.expense?.amount || 0), 0) || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Vydaje</h1>
          <p className="mt-1 text-muted-foreground">{formatMonth(period.year, period.month)}</p>
        </div>
        <MonthSelector
          year={period.year}
          month={period.month}
          onChange={(year, month) => setPeriod({ year, month })}
        />
      </div>

      {/* Expenses Table */}
      <Card className="opacity-0 animate-fade-in stagger-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Vydaje podle kategorii</CardTitle>
            <div className="flex items-center gap-4">
              <div className="font-mono-numbers text-lg font-semibold">
                Celkem: {formatCurrency(totalExpenses, false)}
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Pridat kategorii
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pridat novou kategorii</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="category-name">Nazev kategorie</Label>
                      <Input
                        id="category-name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="napr. Dovolena"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCategory()
                        }}
                      />
                    </div>
                    <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                      Pridat
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead className="text-right">Castka</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.categories.map((cat, index) => (
                  <TableRow key={cat.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {editingNameId === cat.id ? (
                        <Input
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="h-8 w-full max-w-[200px]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditNameSave(cat.id)
                            if (e.key === 'Escape') handleEditNameCancel()
                          }}
                          onBlur={() => handleEditNameSave(cat.id)}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-primary"
                          onClick={() => handleEditNameStart(cat)}
                        >
                          {cat.name}
                        </span>
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
                                  Opravdu chcete smazat kategorii &quot;{cat.name}&quot;? Tato akce smaze i vsechny zaznamy vydaju v teto kategorii a nelze ji vzit zpet.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrusit</AlertDialogCancel>
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

      {/* AI Insights */}
      <AiInsightCard
        section="expenses"
        year={period.year}
        month={period.month}
        className="stagger-3"
      />
    </div>
  )
}
