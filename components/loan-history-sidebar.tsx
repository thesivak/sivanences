'use client'

import { useState } from 'react'
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
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SavedLoanScenario } from '@/lib/loan'
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
} from 'lucide-react'

interface LoanHistorySidebarProps {
  scenarios: SavedLoanScenario[]
  selectedIds: string[]
  onView: (scenario: SavedLoanScenario) => void
  onDelete: (id: string) => void
  onToggleCompare: (id: string) => void
  onEdit: (id: string, newName: string) => void
}

export function LoanHistorySidebar({
  scenarios,
  selectedIds,
  onView,
  onDelete,
  onToggleCompare,
  onEdit,
}: LoanHistorySidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

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
            Historie analyz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
          {scenarios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Zatim zadne ulozene analyzy
            </p>
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
                          {getVerdictIcon(scenario.verdictStatus)}
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
                    {scenario.type === 'MORTGAGE' ? 'Hypo' : 'Uver'}
                  </Badge>
                </div>

                {/* Key Numbers */}
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Castka:</span>
                    <span className="font-mono-numbers">
                      {formatCurrency(scenario.amount, false)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Splatka:</span>
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
            <DialogTitle>Smazat analyzu?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Opravdu chcete smazat tuto analyzu? Tato akce je nevratna.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Zrusit
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
