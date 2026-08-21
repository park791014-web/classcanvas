import { useCallback, useEffect, useMemo, useState } from 'react'
import { migrateLegacyContentType } from '../types/content'
import type { AnalysisCandidate } from '../types/analysis'
import type { ContentType, LegacyContentType } from '../types/content'

const EMPTY_CANDIDATES: AnalysisCandidate[] = []
type LegacyCompatibleAnalysisCandidate = Omit<AnalysisCandidate, 'type'> & {
  type: ContentType | LegacyContentType
}

function migrateCandidate(candidate: LegacyCompatibleAnalysisCandidate): AnalysisCandidate {
  const type = migrateLegacyContentType(candidate.type)
  return type === candidate.type ? candidate as AnalysisCandidate : { ...candidate, type }
}

export function useAnalysisCandidates(documentId: string | null) {
  const [store, setStore] = useState<Record<string, LegacyCompatibleAnalysisCandidate[]>>({})
  const storedCandidates = documentId ? store[documentId] : undefined
  const candidates = useMemo(() => storedCandidates?.map(migrateCandidate) ?? EMPTY_CANDIDATES, [storedCandidates])

  useEffect(() => {
    if (!documentId || !storedCandidates?.some((candidate) => migrateCandidate(candidate) !== candidate)) return
    setStore((current) => ({
      ...current,
      [documentId]: (current[documentId] ?? []).map(migrateCandidate),
    }))
  }, [documentId, storedCandidates])

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
