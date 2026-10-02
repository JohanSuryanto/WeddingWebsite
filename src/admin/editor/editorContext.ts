import { createContext, useContext } from 'react'
import type { Couple, CoupleStatus } from '../../data/types'

export interface EditorContextValue {
  couple: Couple
  setStatus(status: CoupleStatus): Promise<void>
}

export const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor() must be used inside the editor')
  return ctx
}
