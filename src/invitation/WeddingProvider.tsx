import { createContext, useContext, type ReactNode } from 'react'
import type { WeddingContent } from '../content/types'

const WeddingContext = createContext<WeddingContent | null>(null)

/** Supplies the couple's invitation content to every section. */
export function WeddingProvider({
  content,
  children,
}: {
  content: WeddingContent
  children: ReactNode
}) {
  return <WeddingContext.Provider value={content}>{children}</WeddingContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWedding(): WeddingContent {
  const content = useContext(WeddingContext)
  if (!content) throw new Error('useWedding() must be used inside <WeddingProvider>')
  return content
}
