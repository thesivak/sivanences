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
import { Check, X, Pencil, Plus, TrendingUp, Trash2 } from 'lucide-react'
import { AiInsightCard } from '@/components/ai-insight-card'

interface IncomeSourceData {
  id: string
  name: string
  order: number
  income: {
    id: string
    amount: number
  } | null
}

interface IncomeData {
  year: number
  month: number
  sources: IncomeSourceData[]
}

export default function IncomePage() {
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [data, setData] = useState<IncomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [newSourceName, setNewSourceName] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/income?year=${period.year}&month=${period.month}`)
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Failed to fetch income:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleEditStart = (source: IncomeSourceData) => {
    setEditingId(source.id)
    setEditValue(source.income?.amount?.toString() || '')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleEditSave = async (sourceId: string) => {
    const amount = parseCurrencyInput(editValue)
    if (amount === null) {
      handleEditCancel()
      return
    }

    try {
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

      setEditingId(null)
      setEditValue('')
      fetchData()
    } catch (error) {
      console.error('Failed to save income:', error)
    }
  }

  const handleAddSource = async () => {
    if (!newSourceName.trim()) return

    try {
      await fetch('/api/income/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSourceName.trim() }),
      })

      setNewSourceName('')
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Failed to add source:', error)
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await fetch(`/api/income/sources?id=${sourceId}`, {
        method: 'DELETE',
      })
      fetchData()
    } catch (error) {
      console.error('Failed to delete source:', error)
    }
  }

  const handleEditNameStart = (source: IncomeSourceData) => {
    setEditingNameId(source.id)
    setEditNameValue(source.name)
  }

  const handleEditNameCancel = () => {
    setEditingNameId(null)
    setEditNameValue('')
  }

  const handleEditNameSave = async (sourceId: string) => {
    if (!editNameValue.trim()) {
      handleEditNameCancel()
      return
    }

    try {
      await fetch('/api/income/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sourceId,
          name: editNameValue.trim(),
        }),
      })

      setEditingNameId(null)
      setEditNameValue('')
      fetchData()
    } catch (error) {
      console.error('Failed to update source name:', error)
    }
  }

  const totalIncome = data?.sources.reduce((sum, src) => sum + (src.income?.amount || 0), 0) || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Prijmy</h1>
          <p className="mt-1 text-muted-foreground">{formatMonth(period.year, period.month)}</p>
        </div>
        <MonthSelector
          year={period.year}
          month={period.month}
          onChange={(year, month) => setPeriod({ year, month })}
        />
      </div>

      {/* Total Income Card */}
      <Card className="opacity-0 animate-fade-in">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1B5E20]/10">
                <TrendingUp className="h-6 w-6 text-[#1B5E20]" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Celkove prijmy</div>
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
            <CardTitle className="text-base font-medium">Prijmy podle zdroje</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Pridat zdroj
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Pridat novy zdroj prijmu</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="source-name">Nazev zdroje</Label>
                    <Input
                      id="source-name"
                      value={newSourceName}
                      onChange={(e) => setNewSourceName(e.target.value)}
                      placeholder="napr. Vedlejsi prijem"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSource()
                      }}
                    />
                  </div>
                  <Button onClick={handleAddSource} disabled={!newSourceName.trim()}>
                    Pridat
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Zdroj</TableHead>
                  <TableHead className="text-right">Castka</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.sources.map((source, index) => (
                  <TableRow key={source.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {editingNameId === source.id ? (
                        <Input
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="h-8 w-full max-w-[200px]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditNameSave(source.id)
                            if (e.key === 'Escape') handleEditNameCancel()
                          }}
                          onBlur={() => handleEditNameSave(source.id)}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-primary"
                          onClick={() => handleEditNameStart(source)}
                        >
                          {source.name}
                        </span>
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
                                <AlertDialogTitle>Smazat zdroj prijmu?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Opravdu chcete smazat zdroj &quot;{source.name}&quot;? Tato akce smaze i vsechny zaznamy prijmu z tohoto zdroje a nelze ji vzit zpet.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrusit</AlertDialogCancel>
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

      {/* AI Insights */}
      <AiInsightCard
        section="income"
        year={period.year}
        month={period.month}
        className="stagger-3"
      />
    </div>
  )
}
