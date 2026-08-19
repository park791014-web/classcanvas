import type { ContentType, SourceRegion } from './content'

export type AnalysisCandidateStatus = 'pending' | 'accepted' | 'rejected'
export type DetectionSource = 'text' | 'layout' | 'visual' | 'mixed'
export type AnalysisScope = 'page' | 'document'

export interface AnalysisCandidate {
  id: string
  type: ContentType
  suggestedTitle: string
  sourceDocumentId: string
  sourceFileName: string
  sourcePage: number
  sourceRegion: SourceRegion
  ruleConfidence?: number
  status: AnalysisCandidateStatus
  detectionSource: DetectionSource
  relatedCandidateId?: string
  acceptedContentId?: string
  analysisVersion: string
}

export interface AnalysisProgress {
  running: boolean
  currentPage: number
  completedPages: number
  totalPages: number
}
