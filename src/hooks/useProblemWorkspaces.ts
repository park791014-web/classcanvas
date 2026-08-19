import { useCallback, useState } from 'react'

export const INITIAL_PROBLEM_WORKSPACE_HEIGHT = 1800
export const PROBLEM_WORKSPACE_HEIGHT_STEP = 1200
export const MAX_PROBLEM_WORKSPACE_HEIGHT = 12000

export function useProblemWorkspaces(workspaceId: string | null) {
  const [heights, setHeights] = useState<Record<string, number>>({})
  const workspaceHeight = workspaceId
    ? heights[workspaceId] ?? INITIAL_PROBLEM_WORKSPACE_HEIGHT
    : INITIAL_PROBLEM_WORKSPACE_HEIGHT

  const expandWorkspace = useCallback(() => {
    if (!workspaceId) return
    setHeights((current) => ({
      ...current,
      [workspaceId]: Math.min(
        MAX_PROBLEM_WORKSPACE_HEIGHT,
        (current[workspaceId] ?? INITIAL_PROBLEM_WORKSPACE_HEIGHT) + PROBLEM_WORKSPACE_HEIGHT_STEP,
      ),
    }))
  }, [workspaceId])

  const removeWorkspace = useCallback((targetWorkspaceId: string) => {
    setHeights((current) => {
      if (!current[targetWorkspaceId]) return current
      const next = { ...current }
      delete next[targetWorkspaceId]
      return next
    })
  }, [])

  const hasWorkspaceState = useCallback((targetWorkspaceId: string) => targetWorkspaceId in heights, [heights])

  return {
    workspaceHeight,
    canExpand: workspaceHeight < MAX_PROBLEM_WORKSPACE_HEIGHT,
    expandWorkspace,
    removeWorkspace,
    hasWorkspaceState,
  }
}
