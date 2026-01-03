'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

interface AddItemDialogProps {
  title: string
  buttonLabel: string
  inputLabel: string
  inputPlaceholder: string
  onAdd: (name: string) => Promise<void>
  buttonVariant?: 'default' | 'outline' | 'ghost'
}

/**
 * Reusable dialog for adding new items (categories, sources, types)
 */
export function AddItemDialog({
  title,
  buttonLabel,
  inputLabel,
  inputPlaceholder,
  onAdd,
  buttonVariant = 'outline',
}: AddItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    if (!value.trim()) return

    setLoading(true)
    try {
      await onAdd(value.trim())
      setValue('')
      setOpen(false)
    } catch (error) {
      console.error('Failed to add item:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">{inputLabel}</Label>
            <Input
              id="item-name"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
          </div>
          <Button onClick={handleAdd} disabled={!value.trim() || loading}>
            {loading ? 'Pridavam...' : 'Pridat'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
