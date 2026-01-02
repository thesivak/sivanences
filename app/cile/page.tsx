'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Plus, Minus, Target, Shield, PiggyBank, Pencil, Trash2 } from 'lucide-react'
import { AiInsightCard } from '@/components/ai-insight-card'
import { getCurrentPeriod } from '@/lib/format'

interface FundTransaction {
  id: string
  amount: number
  description: string | null
  date: string
}

interface SavingGoal {
  id: string
  name: string
  targetAmount: number | null
  currentAmount: number
  isEmergency: boolean
  progress: number
  recommendedTarget?: number
  transactions: FundTransaction[]
}

interface GoalsData {
  goals: SavingGoal[]
  avgMonthlyExpenses: number
}

export default function GoalsPage() {
  const [data, setData] = useState<GoalsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<SavingGoal | null>(null)
  const [transactionAmount, setTransactionAmount] = useState('')
  const [transactionDesc, setTransactionDesc] = useState('')
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit')
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    isEmergency: false,
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<{
    id: string
    name: string
    currentAmount: string
    targetAmount: string
    isEmergency: boolean
  } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState<SavingGoal | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/goals')
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Failed to fetch goals:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateGoal = async () => {
    if (!newGoal.name.trim()) return

    try {
      await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGoal.name.trim(),
          targetAmount: newGoal.targetAmount ? parseFloat(newGoal.targetAmount) : null,
          isEmergency: newGoal.isEmergency,
        }),
      })

      setNewGoal({ name: '', targetAmount: '', isEmergency: false })
      setCreateDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Failed to create goal:', error)
    }
  }

  const handleTransaction = async () => {
    if (!selectedGoal || !transactionAmount) return

    const amount = parseFloat(transactionAmount) * (transactionType === 'withdraw' ? -1 : 1)

    try {
      await fetch(`/api/goals/${selectedGoal.id}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: transactionDesc || null,
        }),
      })

      setTransactionAmount('')
      setTransactionDesc('')
      setTransactionDialogOpen(false)
      setSelectedGoal(null)
      fetchData()
    } catch (error) {
      console.error('Failed to create transaction:', error)
    }
  }

  const openTransactionDialog = (goal: SavingGoal, type: 'deposit' | 'withdraw') => {
    setSelectedGoal(goal)
    setTransactionType(type)
    setTransactionDialogOpen(true)
  }

  const openEditDialog = (goal: SavingGoal) => {
    setEditGoal({
      id: goal.id,
      name: goal.name,
      currentAmount: goal.currentAmount.toString(),
      targetAmount: goal.targetAmount?.toString() || '',
      isEmergency: goal.isEmergency,
    })
    setEditDialogOpen(true)
  }

  const handleEditGoal = async () => {
    if (!editGoal || !editGoal.name.trim()) return

    try {
      await fetch(`/api/goals/${editGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editGoal.name.trim(),
          currentAmount: editGoal.currentAmount ? parseFloat(editGoal.currentAmount) : 0,
          targetAmount: editGoal.targetAmount ? parseFloat(editGoal.targetAmount) : null,
          isEmergency: editGoal.isEmergency,
        }),
      })

      setEditDialogOpen(false)
      setEditGoal(null)
      fetchData()
    } catch (error) {
      console.error('Failed to update goal:', error)
    }
  }

  const openDeleteDialog = (goal: SavingGoal) => {
    setGoalToDelete(goal)
    setDeleteDialogOpen(true)
  }

  const handleDeleteGoal = async () => {
    if (!goalToDelete) return

    try {
      await fetch(`/api/goals/${goalToDelete.id}`, {
        method: 'DELETE',
      })

      setDeleteDialogOpen(false)
      setGoalToDelete(null)
      fetchData()
    } catch (error) {
      console.error('Failed to delete goal:', error)
    }
  }

  const totalSaved = data?.goals.reduce((sum, g) => sum + g.currentAmount, 0) || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Sporici cile</h1>
          <p className="mt-1 text-muted-foreground">Sprava vasich financnich cilu</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novy cil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vytvorit novy sporici cil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="goal-name">Nazev cile</Label>
                <Input
                  id="goal-name"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="napr. Dovolena"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-target">Cilova castka (volitelne)</Label>
                <Input
                  id="goal-target"
                  type="number"
                  value={newGoal.targetAmount}
                  onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                  placeholder="50000"
                  className="font-mono-numbers"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="goal-emergency"
                  checked={newGoal.isEmergency}
                  onChange={(e) => setNewGoal({ ...newGoal, isEmergency: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="goal-emergency" className="text-sm font-normal">
                  Nouzovy fond (doporuceni: 3x mesicni vydaje)
                </Label>
              </div>
              <Button onClick={handleCreateGoal} disabled={!newGoal.name.trim()}>
                Vytvorit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <Card className="opacity-0 animate-fade-in">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#37474F]/10">
                <PiggyBank className="h-6 w-6 text-[#37474F]" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Celkem nasporeno</div>
                <div className="font-mono-numbers text-2xl font-semibold">
                  {formatCurrency(totalSaved, false)}
                </div>
              </div>
            </div>
            {data?.avgMonthlyExpenses && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Prumerny mesicni vydaj</div>
                <div className="font-mono-numbers text-lg font-medium">
                  {formatCurrency(data.avgMonthlyExpenses, false)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Goals Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded border border-border bg-muted" />
          ))}
        </div>
      ) : data?.goals.length === 0 ? (
        <Card className="opacity-0 animate-fade-in stagger-2">
          <CardContent className="py-12 text-center">
            <Target className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Zatim nemáte žádné spořicí cíle</p>
            <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
              Vytvorit prvni cil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {data?.goals.map((goal, index) => (
            <Card
              key={goal.id}
              className={cn('opacity-0 animate-fade-in', `stagger-${Math.min(index + 2, 6)}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <div className="flex items-center gap-2 flex-1">
                    {goal.isEmergency ? (
                      <Shield className="h-4 w-4 text-[#37474F]" />
                    ) : (
                      <Target className="h-4 w-4 text-muted-foreground" />
                    )}
                    {goal.name}
                    {goal.isEmergency && (
                      <span className="text-xs font-normal text-muted-foreground">(Nouzovy)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(goal)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => openDeleteDialog(goal)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Current Amount */}
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono-numbers text-2xl font-semibold">
                        {formatCurrency(goal.currentAmount, false)}
                      </span>
                      {goal.targetAmount && (
                        <span className="font-mono-numbers text-sm text-muted-foreground">
                          / {formatCurrency(goal.targetAmount, false)}
                        </span>
                      )}
                    </div>
                    {goal.targetAmount && (
                      <Progress value={Math.min(goal.progress, 100)} className="mt-2 h-2" />
                    )}
                    {goal.isEmergency && goal.recommendedTarget && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Doporuceno: {formatCurrency(goal.recommendedTarget, false)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openTransactionDialog(goal, 'deposit')}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Vlozit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openTransactionDialog(goal, 'withdraw')}
                      disabled={goal.currentAmount <= 0}
                    >
                      <Minus className="mr-1 h-3 w-3" />
                      Vybrat
                    </Button>
                  </div>

                  {/* Recent Transactions */}
                  {goal.transactions.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Posledni transakce
                      </div>
                      <div className="space-y-1">
                        {goal.transactions.slice(0, 3).map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-muted-foreground">
                              {tx.description || (tx.amount > 0 ? 'Vklad' : 'Vyber')}
                            </span>
                            <span
                              className={cn(
                                'font-mono-numbers',
                                tx.amount > 0 ? 'text-[#1B5E20]' : 'text-[#B71C1C]'
                              )}
                            >
                              {tx.amount > 0 ? '+' : ''}
                              {formatCurrency(tx.amount, false)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI Insights */}
      <AiInsightCard
        section="goals"
        year={getCurrentPeriod().year}
        month={getCurrentPeriod().month}
        className="stagger-4"
      />

      {/* Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transactionType === 'deposit' ? 'Vlozit prostredky' : 'Vybrat prostredky'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Cil</Label>
              <div className="font-medium">{selectedGoal?.name}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Castka</Label>
              <Input
                id="tx-amount"
                type="number"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                placeholder="5000"
                className="font-mono-numbers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-desc">Popis (volitelne)</Label>
              <Input
                id="tx-desc"
                value={transactionDesc}
                onChange={(e) => setTransactionDesc(e.target.value)}
                placeholder="napr. Mesicni vklad"
              />
            </div>
            <Button onClick={handleTransaction} disabled={!transactionAmount}>
              {transactionType === 'deposit' ? 'Vlozit' : 'Vybrat'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit cil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nazev cile</Label>
              <Input
                id="edit-name"
                value={editGoal?.name || ''}
                onChange={(e) => setEditGoal(editGoal ? { ...editGoal, name: e.target.value } : null)}
                placeholder="napr. Dovolena"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-current">Aktualni castka</Label>
              <Input
                id="edit-current"
                type="number"
                value={editGoal?.currentAmount || ''}
                onChange={(e) => setEditGoal(editGoal ? { ...editGoal, currentAmount: e.target.value } : null)}
                placeholder="0"
                className="font-mono-numbers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-target">Cilova castka (volitelne)</Label>
              <Input
                id="edit-target"
                type="number"
                value={editGoal?.targetAmount || ''}
                onChange={(e) => setEditGoal(editGoal ? { ...editGoal, targetAmount: e.target.value } : null)}
                placeholder="50000"
                className="font-mono-numbers"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-emergency"
                checked={editGoal?.isEmergency || false}
                onChange={(e) => setEditGoal(editGoal ? { ...editGoal, isEmergency: e.target.checked } : null)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="edit-emergency" className="text-sm font-normal">
                Nouzovy fond
              </Label>
            </div>
            <Button onClick={handleEditGoal} disabled={!editGoal?.name.trim()}>
              Ulozit zmeny
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat cil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-muted-foreground">
              Opravdu chcete smazat cil <span className="font-medium text-foreground">{goalToDelete?.name}</span>?
              Tato akce je nevratna a smaze i vsechny transakce spojene s timto cilem.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Zrusit
              </Button>
              <Button variant="destructive" onClick={handleDeleteGoal}>
                Smazat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
