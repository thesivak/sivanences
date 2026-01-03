'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { evaluateLoan, type SavedLoanScenario, type LoanVerdict } from '@/lib/loan'
import {
  History,
  Eye,
  Trash2,
  GitCompare,
  Pencil,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Check,
  X,
  RefreshCw,
} from 'lucide-react'

interface CurrentBudget {
  totalIncome: number
  totalExpenses: number
}

interface LoanHistorySidebarProps {
  scenarios: SavedLoanScenario[]
  selectedIds: string[]
  currentBudget?: CurrentBudget | null
  onView: (scenario: SavedLoanScenario) => void
  onDelete: (id: string) => void
  onToggleCompare: (id: string) => void
  onEdit: (id: string, newName: string) => void
}

interface RecalculatedVerdict {
  current: LoanVerdict
  hasChanged: boolean
  originalStatus?: string | null
}

export function LoanHistorySidebar({
  scenarios,
  selectedIds,
  currentBudget,
  onView,
  onDelete,
  onToggleCompare,
  onEdit,
}: LoanHistorySidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Recalculate verdicts based on current budget
  const recalculatedVerdicts = useMemo(() => {
    if (!currentBudget || currentBudget.totalIncome <= 0) return {}

    const verdicts: Record<string, RecalculatedVerdict> = {}

    for (const scenario of scenarios) {
      const currentVerdict = evaluateLoan(
        scenario.monthlyPayment,
        currentBudget.totalIncome,
        currentBudget.totalExpenses
      )

      verdicts[scenario.id] = {
        current: currentVerdict,
        hasChanged: scenario.verdictStatus !== currentVerdict.status,
        originalStatus: scenario.verdictStatus,
      }
    }

    return verdicts
  }, [scenarios, currentBudget])

  const getVerdictIcon = (status?: string | null) => {
    switch (status) {
      case 'AVAILABLE':
        return <CheckCircle className="h-3 w-3 text-[#1B5E20]" />
      case 'RISKY':
        return <AlertTriangle className="h-3 w-3 text-[#E65100]" />
      case 'NOT_RECOMMENDED':
        return <XCircle className="h-3 w-3 text-[#B71C1C]" />
      default:
        return null
    }
  }

  const handleStartEdit = (scenario: SavedLoanScenario) => {
    setEditingId(scenario.id)
    setEditName(scenario.name)
  }

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onEdit(editingId, editName.trim())
      setEditingId(null)
      setEditName('')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleConfirmDelete = (id: string) => {
    onDelete(id)
    setDeleteConfirmId(null)
  }

  return (
    <>
      <Card className="sticky top-8">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <History className="h-4 w-4 text-muted-foreground" />
            Uložené scénáře
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Vaše předchozí simulace k porovnání
          </p>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
          {scenarios.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-sm text-muted-foreground">
                Zatím žádné uložené scénáře
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Po výpočtu se simulace automaticky uloží
              </p>
            </div>
          ) : (
            scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className={cn(
                  'p-3 rounded border transition-all',
                  selectedIds.includes(scenario.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {/* Scenario Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingId === scenario.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-6 text-sm px-2"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={handleSaveEdit}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            const recalc = recalculatedVerdicts[scenario.id]
                            if (recalc) {
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="flex items-center gap-1">
                                        {getVerdictIcon(recalc.current.status)}
                                        {recalc.hasChanged && (
                                          <RefreshCw className="h-2.5 w-2.5 text-blue-500" />
                                        )}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-[250px]">
                                      <div className="space-y-1">
                                        <p className="font-medium text-xs">
                                          {recalc.hasChanged ? 'Přepočteno dle aktuálního rozpočtu' : 'Aktuální hodnocení'}
                                        </p>
                                        <p className="text-xs">{recalc.current.reason}</p>
                                        {recalc.hasChanged && recalc.originalStatus && (
                                          <p className="text-xs text-muted-foreground pt-1 border-t">
                                            Původně: {recalc.originalStatus === 'AVAILABLE' ? 'Dostupné' : recalc.originalStatus === 'RISKY' ? 'Rizikové' : 'Nedoporučeno'}
                                          </p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            }
                            return getVerdictIcon(scenario.verdictStatus)
                          })()}
                          <span className="font-medium text-sm truncate">
                            {scenario.name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(new Date(scenario.createdAt))}
                        </div>
                      </>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {scenario.type === 'MORTGAGE' ? 'Hypo' : 'Úvěr'}
                  </Badge>
                </div>

                {/* Key Numbers */}
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Částka:</span>
                    <span className="font-mono-numbers">
                      {formatCurrency(scenario.amount, false)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Splátka:</span>
                    <span className="font-mono-numbers">
                      {formatCurrency(scenario.monthlyPayment, false)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 flex-1"
                    onClick={() => onView(scenario)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Zobrazit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => handleStartEdit(scenario)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedIds.includes(scenario.id) ? 'default' : 'ghost'}
                    className="h-7 px-2"
                    onClick={() => onToggleCompare(scenario.id)}
                    disabled={
                      !selectedIds.includes(scenario.id) && selectedIds.length >= 2
                    }
                  >
                    <GitCompare className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmId(scenario.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Smazat scénář?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Opravdu chcete smazat tento scénář? Tato akce je nevratná.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleConfirmDelete(deleteConfirmId)}
            >
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
