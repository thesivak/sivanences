'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatMonth, getCurrentPeriod, parseCurrencyInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Check, X, Pencil, Plus, TrendingUp, Trash2, Calculator } from 'lucide-react'
import { AiInsightCard } from '@/components/ai-insight-card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface InvestmentTypeData {
  id: string
  name: string
  order: number
  investment: {
    id: string
    amount: number
  } | null
}

interface InvestmentData {
  year: number
  month: number
  types: InvestmentTypeData[]
}

interface CompoundDataPoint {
  year: number
  value: number
  interest: number
}

export default function InvestmentsPage() {
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [data, setData] = useState<InvestmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [newTypeName, setNewTypeName] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  // Compound interest calculator state
  const [compoundInitial, setCompoundInitial] = useState('')
  const [compoundRate, setCompoundRate] = useState('')
  const [compoundYears, setCompoundYears] = useState('10')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/investments?year=${period.year}&month=${period.month}`)
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Failed to fetch investments:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleEditStart = (type: InvestmentTypeData) => {
    setEditingId(type.id)
    setEditValue(type.investment?.amount?.toString() || '')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleEditSave = async (typeId: string) => {
    const amount = parseCurrencyInput(editValue)
    if (amount === null) {
      handleEditCancel()
      return
    }

    try {
      await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeId,
          year: period.year,
          month: period.month,
          amount,
        }),
      })

      setEditingId(null)
      setEditValue('')
      fetchData()
    } catch (error) {
      console.error('Failed to save investment:', error)
    }
  }

  const handleAddType = async () => {
    if (!newTypeName.trim()) return

    try {
      await fetch('/api/investments/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeName.trim() }),
      })

      setNewTypeName('')
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Failed to add type:', error)
    }
  }

  const handleDeleteType = async (typeId: string) => {
    try {
      await fetch(`/api/investments/types?id=${typeId}`, {
        method: 'DELETE',
      })
      fetchData()
    } catch (error) {
      console.error('Failed to delete type:', error)
    }
  }

  const handleEditNameStart = (type: InvestmentTypeData) => {
    setEditingNameId(type.id)
    setEditNameValue(type.name)
  }

  const handleEditNameCancel = () => {
    setEditingNameId(null)
    setEditNameValue('')
  }

  const handleEditNameSave = async (typeId: string) => {
    if (!editNameValue.trim()) {
      handleEditNameCancel()
      return
    }

    try {
      await fetch('/api/investments/types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: typeId,
          name: editNameValue.trim(),
        }),
      })

      setEditingNameId(null)
      setEditNameValue('')
      fetchData()
    } catch (error) {
      console.error('Failed to update type name:', error)
    }
  }

  const totalInvestments = data?.types.reduce((sum, t) => sum + (t.investment?.amount || 0), 0) || 0

  // Calculate compound interest data
  const compoundData = useMemo((): CompoundDataPoint[] => {
    const initial = parseFloat(compoundInitial)
    const rate = parseFloat(compoundRate) / 100
    const years = parseInt(compoundYears)

    if (!initial || !rate || !years || initial <= 0 || rate <= 0 || years <= 0) {
      return []
    }

    const data: CompoundDataPoint[] = []
    for (let year = 0; year <= years; year++) {
      const value = initial * Math.pow(1 + rate, year)
      const interest = value - initial
      data.push({
        year,
        value: Math.round(value),
        interest: Math.round(interest),
      })
    }
    return data
  }, [compoundInitial, compoundRate, compoundYears])

  // Summary stats for compound interest
  const compoundSummary = useMemo(() => {
    if (compoundData.length === 0) return null
    const initial = parseFloat(compoundInitial)
    const final = compoundData[compoundData.length - 1]
    return {
      finalValue: final.value,
      totalInterest: final.interest,
      multiplier: (final.value / initial).toFixed(2),
    }
  }, [compoundData, compoundInitial])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Investice</h1>
          <p className="mt-1 text-muted-foreground">{formatMonth(period.year, period.month)}</p>
        </div>
        <MonthSelector
          year={period.year}
          month={period.month}
          onChange={(year, month) => setPeriod({ year, month })}
        />
      </div>

      {/* Total Investments Card */}
      <Card className="opacity-0 animate-fade-in">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#37474F]/10">
                <TrendingUp className="h-6 w-6 text-[#37474F]" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Celkove investice</div>
                <div className="font-mono-numbers text-2xl font-semibold text-[#37474F]">
                  {formatCurrency(totalInvestments, false)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investments Table */}
      <Card className="opacity-0 animate-fade-in stagger-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Investice podle typu</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Pridat typ
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Pridat novy typ investice</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="type-name">Nazev typu</Label>
                    <Input
                      id="type-name"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="napr. ETF, Akcie"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddType()
                      }}
                    />
                  </div>
                  <Button onClick={handleAddType} disabled={!newTypeName.trim()}>
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
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Castka</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.types.map((type, index) => (
                  <TableRow key={type.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {editingNameId === type.id ? (
                        <Input
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="h-8 w-full max-w-[200px]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditNameSave(type.id)
                            if (e.key === 'Escape') handleEditNameCancel()
                          }}
                          onBlur={() => handleEditNameSave(type.id)}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-primary"
                          onClick={() => handleEditNameStart(type)}
                        >
                          {type.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === type.id ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 w-32 text-right font-mono-numbers ml-auto"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(type.id)
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                        />
                      ) : (
                        <span
                          className={cn(
                            'font-mono-numbers',
                            type.investment?.amount ? 'text-[#37474F]' : 'text-muted-foreground'
                          )}
                        >
                          {type.investment?.amount
                            ? formatCurrency(type.investment.amount, false)
                            : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === type.id ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditSave(type.id)}
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
                            onClick={() => handleEditStart(type)}
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
                                <AlertDialogTitle>Smazat typ investice?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Opravdu chcete smazat typ &quot;{type.name}&quot;? Tato akce smaze i vsechny zaznamy investic tohoto typu a nelze ji vzit zpet.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrusit</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteType(type.id)}
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

      {/* Compound Interest Calculator */}
      <Card className="opacity-0 animate-fade-in stagger-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            Kalkulacka slozeneho uroku
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Inputs */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="compound-initial">Pocatecni investice (Kc)</Label>
                <Input
                  id="compound-initial"
                  type="number"
                  value={compoundInitial}
                  onChange={(e) => setCompoundInitial(e.target.value)}
                  placeholder="100000"
                  className="font-mono-numbers"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compound-rate">Rocni vynosnost (%)</Label>
                <Input
                  id="compound-rate"
                  type="number"
                  step="0.1"
                  value={compoundRate}
                  onChange={(e) => setCompoundRate(e.target.value)}
                  placeholder="7"
                  className="font-mono-numbers"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compound-years">Pocet let</Label>
                <Select value={compoundYears} onValueChange={setCompoundYears}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30].map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y} let
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary Stats */}
              {compoundSummary && (
                <div className="mt-6 space-y-3 rounded-lg border bg-muted/50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Konecna hodnota:</span>
                    <span className="font-mono-numbers font-semibold text-[#1B5E20]">
                      {formatCurrency(compoundSummary.finalValue, false)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Celkovy zisk:</span>
                    <span className="font-mono-numbers font-semibold text-[#1B5E20]">
                      {formatCurrency(compoundSummary.totalInterest, false)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nasobek investice:</span>
                    <span className="font-mono-numbers font-semibold">
                      {compoundSummary.multiplier}x
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="lg:col-span-2">
              {compoundData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={compoundData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DC" />
                      <XAxis
                        dataKey="year"
                        tickFormatter={(v) => `${v}. rok`}
                        stroke="#6B6B6B"
                        fontSize={12}
                      />
                      <YAxis
                        tickFormatter={(v) => {
                          if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
                          if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
                          return v.toString()
                        }}
                        stroke="#6B6B6B"
                        fontSize={12}
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value) || 0, false), 'Hodnota']}
                        labelFormatter={(label) => `${label}. rok`}
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E3DC',
                          borderRadius: '4px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Hodnota investice"
                        stroke="#1B5E20"
                        strokeWidth={2}
                        dot={{ fill: '#1B5E20', strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-80 items-center justify-center rounded-lg border border-dashed">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp className="mx-auto h-12 w-12 opacity-50" />
                    <p className="mt-2">Zadejte pocatecni investici a rocni vynosnost</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <AiInsightCard
        section="investments"
        year={period.year}
        month={period.month}
        className="stagger-4"
      />
    </div>
  )
}
