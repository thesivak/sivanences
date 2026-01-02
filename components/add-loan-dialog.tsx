'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { calculateLoan, CZECH_RATES, LOAN_TERMS } from '@/lib/loan'
import { formatCurrency } from '@/lib/format'

interface ActiveLoan {
  id: string
  name: string
  type: string
  originalAmount: number
  remainingAmount: number
  interestRate: number
  monthlyPayment: number
  startDate: string
  termMonths: number
}

interface AddLoanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
  editLoan?: ActiveLoan | null
}

export function AddLoanDialog({ open, onOpenChange, onSave, editLoan }: AddLoanDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'MORTGAGE' | 'CONSUMER'>('CONSUMER')
  const [originalAmount, setOriginalAmount] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [ratePreset, setRatePreset] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [startDate, setStartDate] = useState('')
  const [termMonths, setTermMonths] = useState('')
  const [termPreset, setTermPreset] = useState('')
  const [autoCalculate, setAutoCalculate] = useState(true)
  const [saving, setSaving] = useState(false)

  // Reset form when dialog opens/closes or editLoan changes
  useEffect(() => {
    if (open) {
      if (editLoan) {
        setName(editLoan.name)
        setType(editLoan.type as 'MORTGAGE' | 'CONSUMER')
        setOriginalAmount(editLoan.originalAmount.toString())
        setInterestRate(editLoan.interestRate.toString())
        setRatePreset('')
        setMonthlyPayment(editLoan.monthlyPayment.toString())
        setStartDate(editLoan.startDate.split('T')[0])
        setTermMonths(editLoan.termMonths.toString())
        setTermPreset('')
        setAutoCalculate(false)
      } else {
        setName('')
        setType('CONSUMER')
        setOriginalAmount('')
        setInterestRate('')
        setRatePreset('')
        setMonthlyPayment('')
        setStartDate('')
        setTermMonths('')
        setTermPreset('')
        setAutoCalculate(true)
      }
    }
  }, [open, editLoan])

  // Auto-calculate monthly payment when parameters change
  useEffect(() => {
    if (!autoCalculate) return

    const amount = parseFloat(originalAmount)
    const rate = ratePreset ? parseFloat(ratePreset) : parseFloat(interestRate) / 100
    const term = termPreset ? parseInt(termPreset) : parseInt(termMonths)

    if (amount > 0 && rate > 0 && term > 0) {
      const result = calculateLoan({ amount, annualRate: rate, termMonths: term })
      setMonthlyPayment(Math.round(result.monthlyPayment).toString())
    }
  }, [originalAmount, interestRate, ratePreset, termMonths, termPreset, autoCalculate])

  const handleRatePresetChange = (value: string) => {
    setRatePreset(value)
    setInterestRate((parseFloat(value) * 100).toString())
  }

  const handleTermPresetChange = (value: string) => {
    setTermPreset(value)
    setTermMonths(value)
  }

  const handleSave = async () => {
    const amount = parseFloat(originalAmount)
    const rate = parseFloat(interestRate)
    const payment = parseFloat(monthlyPayment)
    const term = parseInt(termMonths)

    if (!name || !amount || !rate || !payment || !startDate || !term) return

    setSaving(true)
    try {
      const url = editLoan ? '/api/loans/active' : '/api/loans/active'
      const method = editLoan ? 'PATCH' : 'POST'

      const body = editLoan
        ? {
            id: editLoan.id,
            name,
            type,
            originalAmount: amount,
            interestRate: rate,
            monthlyPayment: payment,
            startDate,
            termMonths: term,
          }
        : {
            name,
            type,
            originalAmount: amount,
            interestRate: rate,
            monthlyPayment: payment,
            startDate,
            termMonths: term,
          }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        onOpenChange(false)
        onSave()
      }
    } catch (error) {
      console.error('Failed to save loan:', error)
    } finally {
      setSaving(false)
    }
  }

  const rates = type === 'MORTGAGE' ? CZECH_RATES.mortgage : CZECH_RATES.consumer

  // Calculate estimated monthly payment for display
  const estimatedPayment = (() => {
    const amount = parseFloat(originalAmount)
    const rate = ratePreset ? parseFloat(ratePreset) : parseFloat(interestRate) / 100
    const term = termPreset ? parseInt(termPreset) : parseInt(termMonths)

    if (amount > 0 && rate > 0 && term > 0) {
      const result = calculateLoan({ amount, annualRate: rate, termMonths: term })
      return result.monthlyPayment
    }
    return null
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editLoan ? 'Upravit pujcku' : 'Pridat existujici pujcku'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="loan-name">Nazev pujcky</Label>
            <Input
              id="loan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="napr. Hypoteka na byt"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Typ pujcky</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'MORTGAGE' | 'CONSUMER')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MORTGAGE">Hypoteka</SelectItem>
                <SelectItem value="CONSUMER">Spotrebitelsky uver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Original Amount */}
          <div className="space-y-2">
            <Label htmlFor="original-amount">Puvodni vyse pujcky (Kc)</Label>
            <Input
              id="original-amount"
              type="number"
              value={originalAmount}
              onChange={(e) => setOriginalAmount(e.target.value)}
              placeholder="1000000"
              className="font-mono-numbers"
            />
          </div>

          {/* Interest Rate */}
          <div className="space-y-2">
            <Label>Urokova sazba (%)</Label>
            <Select value={ratePreset} onValueChange={handleRatePresetChange}>
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
                value={interestRate}
                onChange={(e) => { setInterestRate(e.target.value); setRatePreset('') }}
                placeholder="5.5"
                className="h-8 w-20 font-mono-numbers text-sm"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {/* Term */}
          <div className="space-y-2">
            <Label>Puvodni doba splaceni</Label>
            <Select value={termPreset} onValueChange={handleTermPresetChange}>
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
                value={termMonths}
                onChange={(e) => { setTermMonths(e.target.value); setTermPreset('') }}
                placeholder="240"
                className="h-8 w-20 font-mono-numbers text-sm"
              />
              <span className="text-xs text-muted-foreground">mesicu</span>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Datum zacatku splaceni</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Monthly Payment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="monthly-payment">Mesicni splatka (Kc)</Label>
              {estimatedPayment && autoCalculate && (
                <span className="text-xs text-muted-foreground">
                  Vypocteno: {formatCurrency(estimatedPayment, false)}
                </span>
              )}
            </div>
            <Input
              id="monthly-payment"
              type="number"
              value={monthlyPayment}
              onChange={(e) => { setMonthlyPayment(e.target.value); setAutoCalculate(false) }}
              placeholder="15000"
              className="font-mono-numbers"
            />
            {!autoCalculate && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => setAutoCalculate(true)}
              >
                Vypocitat automaticky
              </button>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !name || !originalAmount || !interestRate || !monthlyPayment || !startDate || !termMonths}
            className="w-full"
          >
            {saving ? 'Ukladam...' : editLoan ? 'Ulozit zmeny' : 'Pridat pujcku'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
