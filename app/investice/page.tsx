'use client'

import { useState, useMemo } from 'react'
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
import { formatCurrency, parseCurrencyInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Check, X, Pencil, Trash2, TrendingUp, Calculator } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { InvestmentsPageData, InvestmentTypeWithAmount } from '@/lib/types'

// Chart colors
const CHART_COLORS = ['#2563EB', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4']

export default function InvestmentsPage() {
  // Data fetching
  const { data, loading, period, setPeriod, refetch } = useMonthlyData<InvestmentsPageData>({
    endpoint: '/api/investments',
  })

  // Edit state - investments have more fields so we manage them directly
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editTotalInvested, setEditTotalInvested] = useState('')
  const [editAnnualRate, setEditAnnualRate] = useState('')
  const [editYears, setEditYears] = useState('')
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')

  // Edit handlers
  const handleEditStart = (type: InvestmentTypeWithAmount) => {
    setEditingId(type.id)
    setEditValue(type.investment?.amount?.toString() || '')
    setEditTotalInvested(type.totalInvested?.toString() || '')
    setEditAnnualRate(type.annualRate ? (type.annualRate * 100).toString() : '')
    setEditYears(type.investmentYears?.toString() || '')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditValue('')
    setEditTotalInvested('')
    setEditAnnualRate('')
    setEditYears('')
  }

  const handleEditSave = async (typeId: string) => {
    const amount = parseCurrencyInput(editValue)

    try {
      // Save monthly investment amount
      if (amount !== null) {
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
      }

      // Save investment type settings
      const totalInvested = editTotalInvested ? parseFloat(editTotalInvested) : null
      const annualRate = editAnnualRate ? parseFloat(editAnnualRate) / 100 : null
      const investmentYears = editYears ? parseInt(editYears) : null

      await fetch('/api/investments/types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: typeId, totalInvested, annualRate, investmentYears }),
      })

      handleEditCancel()
      refetch()
    } catch (error) {
      console.error('Failed to save investment:', error)
    }
  }

  // Name editing
  const handleNameEditStart = (type: InvestmentTypeWithAmount) => {
    setEditingNameId(type.id)
    setEditNameValue(type.name)
  }

  const handleNameEditCancel = () => {
    setEditingNameId(null)
    setEditNameValue('')
  }

  const handleNameEditSave = async (typeId: string) => {
    if (!editNameValue.trim()) {
      handleNameEditCancel()
      return
    }

    await fetch('/api/investments/types', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: typeId, name: editNameValue.trim() }),
    })

    handleNameEditCancel()
    refetch()
  }

  // Add/Delete handlers
  const handleAddType = async (name: string) => {
    await fetch('/api/investments/types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    refetch()
  }

  const handleDeleteType = async (typeId: string) => {
    await fetch(`/api/investments/types?id=${typeId}`, { method: 'DELETE' })
    refetch()
  }

  // Calculations
  const totalMonthlyInvestments = data?.types.reduce(
    (sum, t) => sum + (t.investment?.amount || 0),
    0
  ) || 0

  const totalInvested = data?.types.reduce(
    (sum, t) => sum + (t.totalInvested || 0),
    0
  ) || 0

  // Investments with projection data
  const investmentsWithProjections = useMemo(() => {
    if (!data) return []
    return data.types.filter(
      (t) => t.totalInvested && t.annualRate && t.investmentYears && t.totalInvested > 0
    )
  }, [data])

  // Chart data
  const chartData = useMemo(() => {
    if (investmentsWithProjections.length === 0) return []

    const maxYears = Math.max(...investmentsWithProjections.map((t) => t.investmentYears || 0))
    const result: Array<{ year: number; [key: string]: number }> = []

    for (let year = 0; year <= maxYears; year++) {
      const point: { year: number; [key: string]: number } = { year }

      investmentsWithProjections.forEach((type) => {
        const years = type.investmentYears || 0
        if (year <= years) {
          const monthlyRate = (type.annualRate || 0) / 12
          const months = year * 12
          const monthlyContribution = type.investment?.amount || 0
          const initialAmount = type.totalInvested || 0

          const principalFV = initialAmount * Math.pow(1 + monthlyRate, months)
          const contributionsFV = months > 0
            ? monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
            : 0

          point[type.name] = Math.round(principalFV + contributionsFV)
        }
      })

      result.push(point)
    }

    return result
  }, [investmentsWithProjections])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Investice"
        period={period}
        onPeriodChange={(year, month) => setPeriod({ year, month })}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="opacity-0 animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#37474F]/10">
                <TrendingUp className="h-6 w-6 text-[#37474F]" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Měsíční investice</div>
                <div className="font-mono-numbers text-2xl font-semibold text-[#37474F]">
                  {formatCurrency(totalMonthlyInvestments, false)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-fade-in stagger-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1B5E20]/10">
                <Calculator className="h-6 w-6 text-[#1B5E20]" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Celkem investováno</div>
                <div className="font-mono-numbers text-2xl font-semibold text-[#1B5E20]">
                  {formatCurrency(totalInvested, false)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investments Table */}
      <Card className="opacity-0 animate-fade-in stagger-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Investice podle typu</CardTitle>
            <AddItemDialog
              title="Přidat nový typ investice"
              buttonLabel="Přidat typ"
              inputLabel="Název typu"
              inputPlaceholder="např. ETF, Akcie"
              onAdd={handleAddType}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={3} columns={7} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Měsíční</TableHead>
                  <TableHead className="text-right">Celkem</TableHead>
                  <TableHead className="text-right">Výnos</TableHead>
                  <TableHead className="text-right">Roky</TableHead>
                  <TableHead className="w-28"></TableHead>
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
                            if (e.key === 'Enter') handleNameEditSave(type.id)
                            if (e.key === 'Escape') handleNameEditCancel()
                          }}
                          onBlur={() => handleNameEditSave(type.id)}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-primary"
                          onClick={() => handleNameEditStart(type)}
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
                          className="h-8 w-24 text-right font-mono-numbers ml-auto"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(type.id)
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                        />
                      ) : (
                        <span
                          className={cn(
                            'font-mono-numbers cursor-pointer hover:text-primary',
                            type.investment?.amount ? 'text-[#37474F]' : 'text-muted-foreground'
                          )}
                          onClick={() => handleEditStart(type)}
                        >
                          {type.investment?.amount
                            ? formatCurrency(type.investment.amount, false)
                            : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === type.id ? (
                        <Input
                          value={editTotalInvested}
                          onChange={(e) => setEditTotalInvested(e.target.value)}
                          className="h-8 w-24 text-right font-mono-numbers ml-auto"
                          placeholder="0"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(type.id)
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                        />
                      ) : (
                        <span className={cn(
                          'font-mono-numbers',
                          type.totalInvested ? 'text-[#1B5E20]' : 'text-muted-foreground'
                        )}>
                          {type.totalInvested ? formatCurrency(type.totalInvested, false) : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === type.id ? (
                        <Input
                          value={editAnnualRate}
                          onChange={(e) => setEditAnnualRate(e.target.value)}
                          className="h-8 w-16 text-right font-mono-numbers ml-auto"
                          placeholder="7"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(type.id)
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                        />
                      ) : (
                        <span className={cn(
                          'font-mono-numbers',
                          type.annualRate ? '' : 'text-muted-foreground'
                        )}>
                          {type.annualRate ? `${(type.annualRate * 100).toFixed(1)}%` : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === type.id ? (
                        <Input
                          value={editYears}
                          onChange={(e) => setEditYears(e.target.value)}
                          className="h-8 w-14 text-right font-mono-numbers ml-auto"
                          placeholder="10"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(type.id)
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                        />
                      ) : (
                        <span className={cn(
                          'font-mono-numbers',
                          type.investmentYears ? '' : 'text-muted-foreground'
                        )}>
                          {type.investmentYears ? `${type.investmentYears}` : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === type.id ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditSave(type.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEditCancel}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditStart(type)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Smazat typ investice?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Opravdu chcete smazat typ &quot;{type.name}&quot;? Tato akce smaže i všechny záznamy investic tohoto typu.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteType(type.id)} className="bg-destructive text-white hover:bg-destructive/90">
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

      {/* Investment Projections Chart */}
      {investmentsWithProjections.length > 0 && (
        <Card className="opacity-0 animate-fade-in stagger-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Projekce růstu investic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DC" />
                  <XAxis dataKey="year" tickFormatter={(v) => `${v}. rok`} stroke="#6B6B6B" fontSize={12} />
                  <YAxis
                    tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()}
                    stroke="#6B6B6B"
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value) || 0, false), '']}
                    labelFormatter={(label) => `${label}. rok`}
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E3DC', borderRadius: '4px' }}
                  />
                  <Legend />
                  {investmentsWithProjections.map((type, index) => (
                    <Line
                      key={type.id}
                      type="monotone"
                      dataKey={type.name}
                      name={type.name}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Summary per investment */}
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {investmentsWithProjections.map((type, index) => {
                const years = type.investmentYears || 0
                const finalData = chartData.find((d) => d.year === years)
                const finalValue = finalData ? finalData[type.name] : 0
                const totalContributions = (type.totalInvested || 0) + (type.investment?.amount || 0) * 12 * years
                const totalGain = finalValue - totalContributions

                return (
                  <div
                    key={type.id}
                    className="rounded-lg border p-4"
                    style={{ borderLeftColor: CHART_COLORS[index % CHART_COLORS.length], borderLeftWidth: 4 }}
                  >
                    <div className="font-medium">{type.name}</div>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Konečná hodnota:</span>
                        <span className="font-mono-numbers font-semibold text-[#1B5E20]">{formatCurrency(finalValue, false)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Celkový vklad:</span>
                        <span className="font-mono-numbers">{formatCurrency(totalContributions, false)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Zisk z úroků:</span>
                        <span className="font-mono-numbers text-[#1B5E20]">+{formatCurrency(totalGain, false)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state for projections */}
      {investmentsWithProjections.length === 0 && data && data.types.length > 0 && (
        <Card className="opacity-0 animate-fade-in stagger-3">
          <CardContent className="py-12 text-center">
            <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              Pro zobrazení projekcí růstu nastavte u investic celkovou částku, očekávaný výnos a horizont.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Klikněte na ikonu <Pencil className="inline h-4 w-4" /> pro úpravu investice.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
