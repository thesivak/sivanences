'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatPercent } from '@/lib/format'
import {
  calculateLoan,
  evaluateLoan,
  runStressTests,
  CZECH_RATES,
  LOAN_TERMS,
  type LoanResult,
  type LoanVerdict,
  type StressTestResult,
  type SavedLoanScenario,
} from '@/lib/loan'
import { LoanHistorySidebar } from '@/components/loan-history-sidebar'
import { LoanCompareView } from '@/components/loan-compare-view'
import { cn } from '@/lib/utils'
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
} from 'lucide-react'
import { AiInsightCard } from '@/components/ai-insight-card'
import { getCurrentPeriod } from '@/lib/format'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

interface BudgetData {
  totalIncome: number
  totalExpenses: number
}

export default function LoansPage() {
  // Form state
  const [loanType, setLoanType] = useState<'mortgage' | 'consumer'>('mortgage')
  const [amount, setAmount] = useState('')
  const [ratePreset, setRatePreset] = useState('')
  const [customRate, setCustomRate] = useState('')
  const [termPreset, setTermPreset] = useState('')
  const [customTermMonths, setCustomTermMonths] = useState('')

  // Budget data
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null)

  // Calculation results
  const [result, setResult] = useState<LoanResult | null>(null)
  const [verdict, setVerdict] = useState<LoanVerdict | null>(null)
  const [stressTests, setStressTests] = useState<StressTestResult[]>([])

  // History state
  const [scenarios, setScenarios] = useState<SavedLoanScenario[]>([])
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([])

  // Fetch current budget data
  useEffect(() => {
    async function fetchBudget() {
      try {
        const res = await fetch('/api/summary')
        const data = await res.json()
        setBudgetData({
          totalIncome: data.totalIncome,
          totalExpenses: data.totalExpenses,
        })
      } catch (error) {
        console.error('Failed to fetch budget:', error)
      }
    }
    fetchBudget()
  }, [])

  // Fetch loan history
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/loans')
        const data = await res.json()
        setScenarios(data)
      } catch (error) {
        console.error('Failed to fetch loan history:', error)
      }
    }
    fetchHistory()
  }, [])

  // Get effective rate
  const effectiveRate = useMemo(() => {
    if (customRate) return parseFloat(customRate) / 100
    if (ratePreset) return parseFloat(ratePreset)
    return null
  }, [ratePreset, customRate])

  // Get effective term
  const effectiveTerm = useMemo(() => {
    if (customTermMonths) return parseInt(customTermMonths)
    if (termPreset) return parseInt(termPreset)
    return null
  }, [termPreset, customTermMonths])

  // Calculate loan
  const handleCalculate = async () => {
    const loanAmount = parseFloat(amount)
    if (!loanAmount || !effectiveRate || !effectiveTerm) return

    const loanResult = calculateLoan({
      amount: loanAmount,
      annualRate: effectiveRate,
      termMonths: effectiveTerm,
    })

    setResult(loanResult)

    let loanVerdict: LoanVerdict | null = null

    // Evaluate if budget data available
    if (budgetData && budgetData.totalIncome > 0) {
      loanVerdict = evaluateLoan(
        loanResult.monthlyPayment,
        budgetData.totalIncome,
        budgetData.totalExpenses
      )
      setVerdict(loanVerdict)

      // Run stress tests
      const tests = runStressTests(
        loanResult.monthlyPayment,
        budgetData.totalIncome,
        budgetData.totalExpenses,
        Math.ceil(effectiveTerm / 12)
      )
      setStressTests(tests)
    }

    // Auto-save to history
    try {
      const saveData = {
        amount: loanAmount,
        interestRate: effectiveRate,
        termMonths: effectiveTerm,
        type: loanType.toUpperCase(),
        monthlyPayment: loanResult.monthlyPayment,
        totalPayment: loanResult.totalPayment,
        totalInterest: loanResult.totalInterest,
        verdictStatus: loanVerdict?.status,
        verdictLabel: loanVerdict?.label,
        verdictReason: loanVerdict?.reason,
        budgetImpact: loanVerdict?.monthlyBudgetImpact,
        budgetIncome: budgetData?.totalIncome,
        budgetExpenses: budgetData?.totalExpenses,
      }

      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      })

      if (res.ok) {
        const newScenario = await res.json()
        setScenarios((prev) => [newScenario, ...prev])
      }
    } catch (error) {
      console.error('Failed to auto-save loan analysis:', error)
    }
  }

  // Prepare chart data for amortization
  const chartData = useMemo(() => {
    if (!result) return []
    // Sample every 12 months for readability
    return result.amortization
      .filter((_, i) => i % 12 === 0 || i === result.amortization.length - 1)
      .map((entry) => ({
        month: entry.month,
        year: Math.ceil(entry.month / 12),
        balance: Math.round(entry.balance),
        principal: Math.round(entry.principal),
        interest: Math.round(entry.interest),
      }))
  }, [result])

  // Prepare comparison data
  const comparisonData = useMemo(() => {
    if (!result || !budgetData) return []

    const months = effectiveTerm || 0
    const years = Math.ceil(months / 12)
    const data = []

    for (let year = 0; year <= years; year++) {
      const monthsElapsed = Math.min(year * 12, months)
      const withLoan = budgetData.totalIncome - budgetData.totalExpenses - result.monthlyPayment
      const withoutLoan = budgetData.totalIncome - budgetData.totalExpenses

      data.push({
        year,
        withLoan: withLoan * monthsElapsed,
        withoutLoan: withoutLoan * monthsElapsed,
      })
    }

    return data
  }, [result, budgetData, effectiveTerm])

  const getVerdictIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <CheckCircle className="h-5 w-5 text-[#1B5E20]" />
      case 'RISKY':
        return <AlertTriangle className="h-5 w-5 text-[#E65100]" />
      case 'NOT_RECOMMENDED':
        return <XCircle className="h-5 w-5 text-[#B71C1C]" />
      default:
        return null
    }
  }

  const getVerdictClass = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'verdict-available'
      case 'RISKY':
        return 'verdict-risky'
      case 'NOT_RECOMMENDED':
        return 'verdict-not-recommended'
      default:
        return ''
    }
  }

  // View a saved scenario
  const handleViewScenario = (scenario: SavedLoanScenario) => {
    setLoanType(scenario.type.toLowerCase() as 'mortgage' | 'consumer')
    setAmount(scenario.amount.toString())
    setCustomRate((scenario.interestRate * 100).toString())
    setRatePreset('')
    setCustomTermMonths(scenario.termMonths.toString())
    setTermPreset('')

    const loanResult = calculateLoan({
      amount: scenario.amount,
      annualRate: scenario.interestRate,
      termMonths: scenario.termMonths,
    })
    setResult(loanResult)

    if (scenario.verdictStatus) {
      setVerdict({
        status: scenario.verdictStatus,
        label: scenario.verdictLabel || '',
        reason: scenario.verdictReason || '',
        monthlyBudgetImpact: scenario.budgetImpact || 0,
      })
    } else {
      setVerdict(null)
    }

    if (scenario.budgetIncome && scenario.budgetExpenses && scenario.verdictStatus) {
      const tests = runStressTests(
        loanResult.monthlyPayment,
        scenario.budgetIncome,
        scenario.budgetExpenses,
        Math.ceil(scenario.termMonths / 12)
      )
      setStressTests(tests)
    } else {
      setStressTests([])
    }
  }

  // Delete a scenario
  const handleDeleteScenario = async (id: string) => {
    try {
      const res = await fetch(`/api/loans?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setScenarios((prev) => prev.filter((s) => s.id !== id))
        setSelectedCompareIds((prev) => prev.filter((i) => i !== id))
      }
    } catch (error) {
      console.error('Failed to delete scenario:', error)
    }
  }

  // Toggle scenario for comparison
  const handleToggleCompare = (id: string) => {
    setSelectedCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id)
      }
      if (prev.length < 2) {
        return [...prev, id]
      }
      return prev
    })
  }

  // Edit scenario name
  const handleEditScenario = async (id: string, newName: string) => {
    try {
      const res = await fetch('/api/loans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName }),
      })
      if (res.ok) {
        const updated = await res.json()
        setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      }
    } catch (error) {
      console.error('Failed to update scenario:', error)
    }
  }

  const rates = loanType === 'mortgage' ? CZECH_RATES.mortgage : CZECH_RATES.consumer

  // Get scenarios for comparison
  const compareScenarios = selectedCompareIds.length === 2
    ? [
        scenarios.find((s) => s.id === selectedCompareIds[0])!,
        scenarios.find((s) => s.id === selectedCompareIds[1])!,
      ] as [SavedLoanScenario, SavedLoanScenario]
    : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Analyza pujcek</h1>
        <p className="mt-1 text-muted-foreground">
          Vyhodnoceni dostupnosti a dopadu pujcky na vas rozpocet
        </p>
      </div>

      {/* Compare View */}
      {compareScenarios && (
        <LoanCompareView
          scenarios={compareScenarios}
          onClose={() => setSelectedCompareIds([])}
        />
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Input Form */}
        <Card className="col-span-3 opacity-0 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              Parametry pujcky
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Loan Type */}
            <div className="space-y-2">
              <Label>Typ pujcky</Label>
              <Select value={loanType} onValueChange={(v) => setLoanType(v as 'mortgage' | 'consumer')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mortgage">Hypoteka</SelectItem>
                  <SelectItem value="consumer">Spotrebitelsky uver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Vyse pujcky (Kc)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000000"
                className="font-mono-numbers"
              />
            </div>

            {/* Interest Rate */}
            <div className="space-y-2">
              <Label>Urokova sazba</Label>
              <Select value={ratePreset} onValueChange={(v) => { setRatePreset(v); setCustomRate('') }}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte sazbu" />
                </SelectTrigger>
                <SelectContent>
                  {rates.map((rate) => (
                    <SelectItem key={rate.value} value={rate.value.toString()}>
                      {rate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">nebo vlastni:</span>
                <Input
                  type="number"
                  step="0.1"
                  value={customRate}
                  onChange={(e) => { setCustomRate(e.target.value); setRatePreset('') }}
                  placeholder="5.5"
                  className="h-8 w-20 font-mono-numbers text-sm"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>

            {/* Term */}
            <div className="space-y-2">
              <Label>Doba splaceni</Label>
              <Select value={termPreset} onValueChange={(v) => { setTermPreset(v); setCustomTermMonths('') }}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte dobu" />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_TERMS.map((term) => (
                    <SelectItem key={term.months} value={term.months.toString()}>
                      {term.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">nebo vlastni:</span>
                <Input
                  type="number"
                  value={customTermMonths}
                  onChange={(e) => { setCustomTermMonths(e.target.value); setTermPreset('') }}
                  placeholder="240"
                  className="h-8 w-20 font-mono-numbers text-sm"
                />
                <span className="text-xs text-muted-foreground">mesicu</span>
              </div>
            </div>

            <Separator />

            {/* Current Budget Info */}
            {budgetData && (
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground">Aktualni rozpocet:</div>
                <div className="flex justify-between">
                  <span>Prijmy:</span>
                  <span className="font-mono-numbers">{formatCurrency(budgetData.totalIncome, false)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vydaje:</span>
                  <span className="font-mono-numbers">{formatCurrency(budgetData.totalExpenses, false)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Volne prostredky:</span>
                  <span className="font-mono-numbers">
                    {formatCurrency(budgetData.totalIncome - budgetData.totalExpenses, false)}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleCalculate}
              disabled={!amount || !effectiveRate || !effectiveTerm}
              className="w-full"
            >
              Vypocitat
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="col-span-6 space-y-6">
          {/* AI Insights */}
          <AiInsightCard
            section="loans"
            year={getCurrentPeriod().year}
            month={getCurrentPeriod().month}
            className="stagger-2"
          />

          {result ? (
            <>
              {/* Verdict */}
              {verdict && (
                <Card className={cn('opacity-0 animate-fade-in', getVerdictClass(verdict.status))}>
                  <CardContent className="py-6">
                    <div className="flex items-start gap-4">
                      {getVerdictIcon(verdict.status)}
                      <div>
                        <div className="text-lg font-semibold">{verdict.label}</div>
                        <p className="mt-1 text-sm">{verdict.reason}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Key Numbers */}
              <div className="grid grid-cols-3 gap-4 opacity-0 animate-fade-in stagger-2">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Mesicni splatka</div>
                    <div className="mt-1 font-mono-numbers text-2xl font-semibold">
                      {formatCurrency(result.monthlyPayment, false)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Celkem zaplatite</div>
                    <div className="mt-1 font-mono-numbers text-2xl font-semibold">
                      {formatCurrency(result.totalPayment, false)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Z toho uroky</div>
                    <div className="mt-1 font-mono-numbers text-2xl font-semibold text-[#B71C1C]">
                      {formatCurrency(result.totalInterest, false)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs for detailed views */}
              <Tabs defaultValue="chart" className="opacity-0 animate-fade-in stagger-3">
                <TabsList>
                  <TabsTrigger value="chart">Graf splaceni</TabsTrigger>
                  <TabsTrigger value="comparison">Porovnani</TabsTrigger>
                  <TabsTrigger value="stress">Stress testy</TabsTrigger>
                </TabsList>

                {/* Amortization Chart */}
                <TabsContent value="chart">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base font-medium">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        Vyvoj zustatku pujcky
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DC" />
                            <XAxis
                              dataKey="year"
                              tickFormatter={(v) => `${v}. rok`}
                              stroke="#6B6B6B"
                              fontSize={12}
                            />
                            <YAxis
                              tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                              stroke="#6B6B6B"
                              fontSize={12}
                            />
                            <Tooltip
                              formatter={(value) => formatCurrency(Number(value) || 0, false)}
                              labelFormatter={(label) => `${label}. rok`}
                              contentStyle={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E3DC',
                                borderRadius: '4px',
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="balance"
                              name="Zustatek"
                              stroke="#37474F"
                              fill="#37474F"
                              fillOpacity={0.2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Comparison Chart */}
                <TabsContent value="comparison">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base font-medium">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        Porovnani: s pujckou vs. bez pujcky
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={comparisonData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DC" />
                            <XAxis
                              dataKey="year"
                              tickFormatter={(v) => `${v}. rok`}
                              stroke="#6B6B6B"
                              fontSize={12}
                            />
                            <YAxis
                              tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                              stroke="#6B6B6B"
                              fontSize={12}
                            />
                            <Tooltip
                              formatter={(value) => formatCurrency(Number(value) || 0, false)}
                              labelFormatter={(label) => `${label}. rok`}
                              contentStyle={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E3DC',
                                borderRadius: '4px',
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="withoutLoan"
                              name="Bez pujcky"
                              stroke="#1B5E20"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="withLoan"
                              name="S pujckou"
                              stroke="#B71C1C"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Stress Tests */}
                <TabsContent value="stress">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base font-medium">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        Stress testy - co kdyz...
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Scenar</TableHead>
                            <TableHead className="text-right">Prijem</TableHead>
                            <TableHead className="text-right">Vydaje</TableHead>
                            <TableHead className="text-right">Zbyde</TableHead>
                            <TableHead>Vysledek</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stressTests.map((test, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{test.scenario}</TableCell>
                              <TableCell className="text-right font-mono-numbers">
                                {formatCurrency(test.monthlyIncome, false)}
                              </TableCell>
                              <TableCell className="text-right font-mono-numbers">
                                {formatCurrency(test.monthlyExpenses, false)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  'text-right font-mono-numbers',
                                  test.remainingAfterLoan < 0 ? 'text-[#B71C1C]' : ''
                                )}
                              >
                                {formatCurrency(test.remainingAfterLoan, false)}
                              </TableCell>
                              <TableCell>
                                <Badge className={getVerdictClass(test.verdict.status)}>
                                  {test.verdict.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card className="opacity-0 animate-fade-in stagger-2">
              <CardContent className="py-16 text-center">
                <Calculator className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Zadejte parametry pujcky a kliknete na Vypocitat
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* History Sidebar */}
        <div className="col-span-3">
          <LoanHistorySidebar
            scenarios={scenarios}
            selectedIds={selectedCompareIds}
            onView={handleViewScenario}
            onDelete={handleDeleteScenario}
            onToggleCompare={handleToggleCompare}
            onEdit={handleEditScenario}
          />
        </div>
      </div>
    </div>
  )
}
