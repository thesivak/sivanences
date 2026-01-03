'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { HouseholdSettings } from '@/lib/types'

interface HouseholdSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: () => void
}

export function HouseholdSettingsDialog({
  open,
  onOpenChange,
  onSave,
}: HouseholdSettingsDialogProps) {
  const [settings, setSettings] = useState<HouseholdSettings>({
    id: 'default',
    totalMembers: 1,
    dependentChildren: 0,
    adults: 1,
    emergencyFundTarget: null,
    emergencyFundMonths: 3,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useCustomTarget, setUseCustomTarget] = useState(false)

  useEffect(() => {
    if (open) {
      fetchSettings()
    }
  }, [open])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings/household')
      if (response.ok) {
        const data = await response.json()
        // Ensure default values for any missing fields
        setSettings({
          id: data.id ?? 'default',
          totalMembers: data.totalMembers ?? 1,
          dependentChildren: data.dependentChildren ?? 0,
          adults: data.adults ?? 1,
          emergencyFundTarget: data.emergencyFundTarget ?? null,
          emergencyFundMonths: data.emergencyFundMonths ?? 3,
        })
        setUseCustomTarget(data.emergencyFundTarget !== null)
      }
    } catch (err) {
      console.error('Failed to fetch household settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Validate
    if (settings.adults + settings.dependentChildren !== settings.totalMembers) {
      setError('Počet dospělých + děti musí odpovídat celkovému počtu členů')
      return
    }

    if (settings.totalMembers < 1 || settings.adults < 1) {
      setError('Domácnost musí mít alespoň 1 člena a 1 dospělého')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/settings/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalMembers: settings.totalMembers,
          dependentChildren: settings.dependentChildren,
          adults: settings.adults,
          // Either use custom target OR months-based calculation, not both
          emergencyFundTarget: useCustomTarget ? settings.emergencyFundTarget : null,
          emergencyFundMonths: useCustomTarget ? null : settings.emergencyFundMonths,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      onOpenChange(false)
      onSave?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se uložit nastavení')
    } finally {
      setSaving(false)
    }
  }

  const handleTotalChange = (value: number) => {
    const newTotal = Math.max(1, value)
    setSettings((prev) => ({
      ...prev,
      totalMembers: newTotal,
      adults: Math.max(1, Math.min(prev.adults, newTotal - prev.dependentChildren)),
    }))
  }

  const handleAdultsChange = (value: number) => {
    const newAdults = Math.max(1, Math.min(value, settings.totalMembers))
    setSettings((prev) => ({
      ...prev,
      adults: newAdults,
      dependentChildren: Math.max(0, prev.totalMembers - newAdults),
    }))
  }

  const handleChildrenChange = (value: number) => {
    const newChildren = Math.max(0, Math.min(value, settings.totalMembers - 1))
    setSettings((prev) => ({
      ...prev,
      dependentChildren: newChildren,
      adults: prev.totalMembers - newChildren,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nastavení domácnosti</DialogTitle>
          <DialogDescription>
            Zadejte složení vaší domácnosti pro přesnější srovnání s českými průměry.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-center text-muted-foreground">Načítání...</div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="totalMembers" className="text-right">
                Celkem členů
              </Label>
              <Input
                id="totalMembers"
                type="number"
                min={1}
                value={settings.totalMembers}
                onChange={(e) => handleTotalChange(parseInt(e.target.value) || 1)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adults" className="text-right">
                Dospělí
              </Label>
              <Input
                id="adults"
                type="number"
                min={1}
                max={settings.totalMembers}
                value={settings.adults}
                onChange={(e) => handleAdultsChange(parseInt(e.target.value) || 1)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="children" className="text-right">
                Závislé děti
              </Label>
              <Input
                id="children"
                type="number"
                min={0}
                max={settings.totalMembers - 1}
                value={settings.dependentChildren}
                onChange={(e) => handleChildrenChange(parseInt(e.target.value) || 0)}
                className="col-span-3"
              />
            </div>

            {/* Emergency Fund Section */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Nouzový fond</h4>

              <div className="grid grid-cols-4 items-center gap-4 mb-3">
                <Label htmlFor="emergencyFundMonths" className="text-right text-sm">
                  Měsíců výdajů
                </Label>
                <Input
                  id="emergencyFundMonths"
                  type="number"
                  min={1}
                  max={12}
                  value={settings.emergencyFundMonths ?? 3}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      emergencyFundMonths: Math.max(1, Math.min(12, parseInt(e.target.value) || 3)),
                    }))
                  }
                  className="col-span-3"
                  disabled={useCustomTarget}
                />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="useCustomTarget"
                  checked={useCustomTarget}
                  onChange={(e) => setUseCustomTarget(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="useCustomTarget" className="text-sm font-normal cursor-pointer">
                  Vlastní cílová částka
                </Label>
              </div>

              {useCustomTarget && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="emergencyFundTarget" className="text-right text-sm">
                    Cílová částka
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      id="emergencyFundTarget"
                      type="number"
                      min={0}
                      step={10000}
                      value={settings.emergencyFundTarget ?? ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          emergencyFundTarget: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                      placeholder="např. 100000"
                    />
                    <span className="text-sm text-muted-foreground">Kč</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                {useCustomTarget
                  ? 'Zadaná cílová částka bude použita pro výpočet pokroku nouzového fondu.'
                  : `Cílová částka bude vypočítána jako ${settings.emergencyFundMonths ?? 3}× měsíční výdaje.`}
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <p className="text-xs text-muted-foreground">
              Tyto údaje se použijí pro srovnání vašich výdajů s průměry českých
              domácností podobné velikosti podle dat ČSÚ.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Ukládám...' : 'Uložit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
