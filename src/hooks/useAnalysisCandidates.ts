import { useCallback, useState } from 'react'
import type { AnalysisCandidate } from '../types/analysis'

const EMPTY_CANDIDATES: AnalysisCandidate[] = []

export function useAnalysisCandidates(documentId: string | null) {
  const [store, setStore] = useState<Record<string, AnalysisCandidate[]>>({})
  const candidates = documentId ? store[documentId] ?? EMPTY_CANDIDATES : EMPTY_CANDIDATES

  const addCandidates = useCallback((newCandidates: AnalysisCandidate[]) => {
    if (!documentId || newCandidates.length === 0) return
    setStore((current) => ({
      ...current,
      [documentId]: [...(current[documentId] ?? []), ...newCandidates],
    }))
  }, [documentId])

  const updateCandidate = useCallback((candidateId: string, changes: Partial<AnalysisCandidate>) => {
    if (!documentId) return
    setStore((current) => ({
      ...current,
      [documentId]: (current[documentId] ?? []).map((candidate) => candidate.id === candidateId
        ? { ...candidate, ...changes }
        : candidate),
    }))
  }, [documentId])

  const clearUnaccepted = useCallback(() => {
    if (!documentId) return
    setStore((current) => ({
      ...current,
      [documentId]: (current[documentId] ?? []).filter((candidate) => candidate.status === 'accepted'),
    }))
  }, [documentId])

  return { candidates, addCandidates, updateCandidate, clearUnaccepted }
}
