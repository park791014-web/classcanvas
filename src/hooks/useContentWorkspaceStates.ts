import { useCallback, useState } from 'react'
import type { ContentWorkspaceState } from '../types/content'

const DEFAULT_WORKSPACE_STATE: ContentWorkspaceState = {
  canvasScale: 1,
  canvasOffsetX: 0,
  canvasOffsetY: 0,
  canvasViewportInitialized: false,
  verticalRatio: 0.35,
  horizontalRatio: 0.35,
}

export function useContentWorkspaceStates(contentId: string | null) {
  const [states, setStates] = useState<Record<string, ContentWorkspaceState>>({})
  const state = contentId ? states[contentId] ?? DEFAULT_WORKSPACE_STATE : DEFAULT_WORKSPACE_STATE

  const updateState = useCallback((changes: Partial<ContentWorkspaceState>) => {
    if (!contentId) return
    setStates((current) => ({
      ...current,
      [contentId]: { ...(current[contentId] ?? DEFAULT_WORKSPACE_STATE), ...changes },
    }))
  }, [contentId])

  const removeState = useCallback((targetContentId: string) => {
    setStates((current) => {
      if (!current[targetContentId]) return current
      const next = { ...current }
      delete next[targetContentId]
      return next
    })
  }, [])

  return { state, updateState, removeState }
}
