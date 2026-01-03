'use client'

import { useState, useCallback } from 'react'
import { parseCurrencyInput } from '@/lib/format'

export interface UseInlineEditOptions {
  onSave: (id: string, value: string) => Promise<void>
  onSaveSuccess?: () => void
}

export interface UseInlineEditReturn {
  editingId: string | null
  editValue: string
  startEdit: (id: string, initialValue: string | number | null | undefined) => void
  cancelEdit: () => void
  saveEdit: (id: string) => Promise<void>
  setEditValue: (value: string) => void
  isEditing: (id: string) => boolean
}

/**
 * Custom hook for managing inline editing state
 * Handles start/cancel/save operations with consistent pattern
 */
export function useInlineEdit({
  onSave,
  onSaveSuccess,
}: UseInlineEditOptions): UseInlineEditReturn {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const startEdit = useCallback((id: string, initialValue: string | number | null | undefined) => {
    setEditingId(id)
    setEditValue(initialValue?.toString() || '')
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditValue('')
  }, [])

  const saveEdit = useCallback(async (id: string) => {
    try {
      await onSave(id, editValue)
      setEditingId(null)
      setEditValue('')
      onSaveSuccess?.()
    } catch (error) {
      console.error('Failed to save edit:', error)
      throw error
    }
  }, [editValue, onSave, onSaveSuccess])

  const isEditing = useCallback((id: string) => editingId === id, [editingId])

  return {
    editingId,
    editValue,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditValue,
    isEditing,
  }
}

/**
 * Extended hook for editing both value and name fields
 * Common pattern in expenses, income, and investments pages
 */
export interface UseDoubleInlineEditReturn extends UseInlineEditReturn {
  editingNameId: string | null
  editNameValue: string
  startNameEdit: (id: string, initialName: string) => void
  cancelNameEdit: () => void
  saveNameEdit: (id: string) => Promise<void>
  setEditNameValue: (value: string) => void
  isNameEditing: (id: string) => boolean
}

export interface UseDoubleInlineEditOptions {
  onSaveValue: (id: string, value: string) => Promise<void>
  onSaveName: (id: string, name: string) => Promise<void>
  onSaveSuccess?: () => void
}

export function useDoubleInlineEdit({
  onSaveValue,
  onSaveName,
  onSaveSuccess,
}: UseDoubleInlineEditOptions): UseDoubleInlineEditReturn {
  // Value editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Name editing state
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')

  // Value editing methods
  const startEdit = useCallback((id: string, initialValue: string | number | null | undefined) => {
    setEditingId(id)
    setEditValue(initialValue?.toString() || '')
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditValue('')
  }, [])

  const saveEdit = useCallback(async (id: string) => {
    const amount = parseCurrencyInput(editValue)
    if (amount === null) {
      cancelEdit()
      return
    }

    try {
      await onSaveValue(id, editValue)
      setEditingId(null)
      setEditValue('')
      onSaveSuccess?.()
    } catch (error) {
      console.error('Failed to save value:', error)
      throw error
    }
  }, [editValue, onSaveValue, onSaveSuccess, cancelEdit])

  const isEditing = useCallback((id: string) => editingId === id, [editingId])

  // Name editing methods
  const startNameEdit = useCallback((id: string, initialName: string) => {
    setEditingNameId(id)
    setEditNameValue(initialName)
  }, [])

  const cancelNameEdit = useCallback(() => {
    setEditingNameId(null)
    setEditNameValue('')
  }, [])

  const saveNameEdit = useCallback(async (id: string) => {
    if (!editNameValue.trim()) {
      cancelNameEdit()
      return
    }

    try {
      await onSaveName(id, editNameValue.trim())
      setEditingNameId(null)
      setEditNameValue('')
      onSaveSuccess?.()
    } catch (error) {
      console.error('Failed to save name:', error)
      throw error
    }
  }, [editNameValue, onSaveName, onSaveSuccess, cancelNameEdit])

  const isNameEditing = useCallback((id: string) => editingNameId === id, [editingNameId])

  return {
    // Value editing
    editingId,
    editValue,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditValue,
    isEditing,
    // Name editing
    editingNameId,
    editNameValue,
    startNameEdit,
    cancelNameEdit,
    saveNameEdit,
    setEditNameValue,
    isNameEditing,
  }
}
