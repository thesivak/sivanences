'use client'

import { useState } from 'react'
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
import { TableSkeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Check, X, Pencil, Trash2 } from 'lucide-react'

// ============================================
// Types
// ============================================

export interface EditableItem {
  id: string
  name: string
  amount?: number | null
}

interface EditableTableProps<T extends EditableItem> {
  items: T[]
  loading?: boolean
  // Column configuration
  columns: {
    header: string
    accessor: keyof T | ((item: T) => React.ReactNode)
    align?: 'left' | 'right' | 'center'
    width?: string
  }[]
  // Value editing
  editingId: string | null
  editValue: string
  onEditStart: (item: T) => void
  onEditCancel: () => void
  onEditSave: (id: string) => void
  onEditValueChange: (value: string) => void
  // Name editing
  editingNameId?: string | null
  editNameValue?: string
  onNameEditStart?: (item: T) => void
  onNameEditCancel?: () => void
  onNameEditSave?: (id: string) => void
  onNameEditValueChange?: (value: string) => void
  // Delete
  onDelete?: (id: string) => void
  deleteConfirmTitle?: string
  deleteConfirmDescription?: (item: T) => string
  // Display options
  showIndex?: boolean
  emptyMessage?: string
  valueColorClass?: string
  formatValue?: (value: number) => string
}

// ============================================
// Component
// ============================================

export function EditableTable<T extends EditableItem>({
  items,
  loading = false,
  columns,
  editingId,
  editValue,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditValueChange,
  editingNameId,
  editNameValue,
  onNameEditStart,
  onNameEditCancel,
  onNameEditSave,
  onNameEditValueChange,
  onDelete,
  deleteConfirmTitle = 'Smazat polozku?',
  deleteConfirmDescription = (item) => `Opravdu chcete smazat "${item.name}"?`,
  showIndex = true,
  emptyMessage = 'Zadne polozky',
  valueColorClass,
  formatValue = (v) => formatCurrency(v, false),
}: EditableTableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={5} columns={columns.length + (showIndex ? 1 : 0) + 1} />
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  const supportsNameEditing = editingNameId !== undefined && onNameEditStart && onNameEditSave

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showIndex && <TableHead className="w-12">#</TableHead>}
          {columns.map((col, i) => (
            <TableHead
              key={i}
              className={cn(
                col.width,
                col.align === 'right' && 'text-right',
                col.align === 'center' && 'text-center'
              )}
            >
              {col.header}
            </TableHead>
          ))}
          <TableHead className="w-24"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={item.id}>
            {showIndex && (
              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
            )}

            {columns.map((col, colIndex) => {
              const isNameColumn = colIndex === 0
              const isAmountColumn = col.accessor === 'amount' || (typeof col.accessor === 'string' && col.accessor.includes('amount'))

              // Name column with inline editing
              if (isNameColumn && supportsNameEditing) {
                return (
                  <TableCell key={colIndex} className="font-medium">
                    {editingNameId === item.id ? (
                      <Input
                        value={editNameValue}
                        onChange={(e) => onNameEditValueChange?.(e.target.value)}
                        className="h-8 w-full max-w-[200px]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onNameEditSave(item.id)
                          if (e.key === 'Escape') onNameEditCancel?.()
                        }}
                        onBlur={() => onNameEditSave(item.id)}
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-primary"
                        onClick={() => onNameEditStart(item)}
                      >
                        {item.name}
                      </span>
                    )}
                  </TableCell>
                )
              }

              // Amount column with inline editing
              if (isAmountColumn) {
                const amount = typeof col.accessor === 'function'
                  ? null
                  : item[col.accessor] as number | null | undefined

                return (
                  <TableCell key={colIndex} className={cn(col.align === 'right' && 'text-right')}>
                    {editingId === item.id ? (
                      <Input
                        value={editValue}
                        onChange={(e) => onEditValueChange(e.target.value)}
                        className="h-8 w-32 text-right font-mono-numbers ml-auto"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onEditSave(item.id)
                          if (e.key === 'Escape') onEditCancel()
                        }}
                      />
                    ) : (
                      <span
                        className={cn(
                          'font-mono-numbers',
                          amount ? valueColorClass : 'text-muted-foreground'
                        )}
                      >
                        {amount ? formatValue(amount) : '-'}
                      </span>
                    )}
                  </TableCell>
                )
              }

              // Regular column
              const value = typeof col.accessor === 'function'
                ? col.accessor(item)
                : item[col.accessor]

              return (
                <TableCell
                  key={colIndex}
                  className={cn(
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                >
                  {value as React.ReactNode}
                </TableCell>
              )
            })}

            {/* Action buttons */}
            <TableCell>
              {editingId === item.id ? (
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEditSave(item.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onEditCancel}
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
                    onClick={() => onEditStart(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {onDelete && (
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
                          <AlertDialogTitle>{deleteConfirmTitle}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {deleteConfirmDescription(item)}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Zrusit</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(item.id)}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Smazat
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
