'use client'

import { useState, useCallback } from 'react'

export interface UseConfirmDialogReturn {
  /** Whether the dialog is open */
  open: boolean
  /** Title for the dialog */
  title: string
  /** Description for the dialog */
  description: string
  /** Whether the confirm action is currently running */
  loading: boolean
  /** Dialog variant */
  variant: 'default' | 'danger'
  /** Open the confirm dialog with the given config */
  showConfirm: (
    title: string,
    description: string,
    onConfirm: () => Promise<void> | void,
    destructive?: boolean,
  ) => void
  /** Handle confirm button click */
  handleConfirm: () => Promise<void>
  /** Close the dialog */
  handleClose: (open: boolean) => void
}

/**
 * Hook to manage ConfirmDialog state & callbacks.
 * Usage:
 *   const confirm = useConfirmDialog()
 *   confirm.showConfirm('Delete?', 'This cannot be undone.', async () => { ... }, true)
 *
 *   <ConfirmDialog
 *     open={confirm.open}
 *     onOpenChange={confirm.handleClose}
 *     title={confirm.title}
 *     description={confirm.description}
 *     variant={confirm.variant}
 *     loading={confirm.loading}
 *     onConfirm={confirm.handleConfirm}
 *     confirmLabel="Delete"
 *   />
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [variant, setVariant] = useState<'default' | 'danger'>('default')
  const [action, setAction] = useState<(() => Promise<void> | void) | null>(null)

  const showConfirm = useCallback(
    (t: string, desc: string, onConfirm: () => Promise<void> | void, destructive = false) => {
      setTitle(t)
      setDescription(desc)
      setVariant(destructive ? 'danger' : 'default')
      setAction(() => onConfirm)
      setOpen(true)
    },
    [],
  )

  const handleConfirm = useCallback(async () => {
    if (!action) return
    setLoading(true)
    try {
      await action()
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }, [action])

  const handleClose = useCallback((val: boolean) => {
    if (!val) setOpen(false)
  }, [])

  return { open, title, description, loading, variant, showConfirm, handleConfirm, handleClose }
}
