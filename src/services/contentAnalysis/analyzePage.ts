import type { PDFPageProxy } from 'pdfjs-dist'
import type { AnalysisCandidate } from '../../types/analysis'
import type { ContentBlock, ContentType, SourceRegion } from '../../types/content'
import { detectHeaders } from './detectors/headerDetectors'
import { detectProblems } from './detectors/problemDetector'
import type { DetectionStart } from './detectors/shared'
import { intersectionOverUnion, clampRegion } from './regionUtils'
import { extractTextLayout } from './textLayout'

export const ANALYSIS_VERSION = 'rule-layout-v1'
const MAX_REGION_HEIGHT = 0.34
const EXISTING_BLOCK_IOU = 0.58
const CANDIDATE_IOU = 0.72

interface AnalyzePageOptions {
  documentId: string
  fileName: string
  pageNumber: number
  existingBlocks: ContentBlock[]
  existingCandidates: AnalysisCandidate[]
}

function createCandidateId() {
  return globalThis.crypto?.randomUUID?.() ?? `candidate-${Date.now()}-${Math.random()}`
}

function inferRegion(start: DetectionStart, next: DetectionStart | undefined): SourceRegion {
  const top = Math.max(0, start.line.y - 0.012)
  const nextTop = next ? next.line.y - 0.018 : 1
  const bottom = Math.min(0.985, top + MAX_REGION_HEIGHT, Math.max(top + 0.065, nextTop))
  return clampRegion({
    x: Math.max(0.015, start.line.x - 0.018),
    y: top,
    width: Math.min(0.97, Math.max(0.65, 0.965 - start.line.x)),
    height: bottom - top,
  })
}

function assignTitles(starts: DetectionStart[]) {
  const counters = new Map<ContentType, number>()
  return starts.map((start) => {
    const next = (counters.get(start.type) ?? 0) + 1
    counters.set(start.type, next)
    const hasNumber = /\d/.test(start.title)
    return { ...start, title: hasNumber ? start.title : `${start.title} ${next}` }
  })
}

export async function analyzePage(page: PDFPageProxy, options: AnalyzePageOptions) {
  const { lines, textItemCount } = await extractTextLayout(page)
  const starts = assignTitles([...detectProblems(lines), ...detectHeaders(lines)]
    .sort((a, b) => a.line.y - b.line.y || a.line.x - b.line.x))

  const candidates = starts.map((start, index): AnalysisCandidate => ({
    id: createCandidateId(),
    type: start.type,
    suggestedTitle: start.title,
    sourceDocumentId: options.documentId,
    sourceFileName: options.fileName,
    sourcePage: options.pageNumber,
    sourceRegion: inferRegion(start, starts[index + 1]),
    ruleConfidence: start.confidence,
    status: 'pending',
    detectionSource: start.detectionSource,
    analysisVersion: ANALYSIS_VERSION,
  }))

  const withoutExistingBlocks = candidates.filter((candidate) => !options.existingBlocks.some((block) => (
    block.sourcePage === candidate.sourcePage && intersectionOverUnion(block.sourceRegion, candidate.sourceRegion) >= EXISTING_BLOCK_IOU
  )))
  const withoutStoredCandidates = withoutExistingBlocks.filter((candidate) => !options.existingCandidates.some((existing) => (
    existing.sourcePage === candidate.sourcePage
    && existing.type === candidate.type
    && intersectionOverUnion(existing.sourceRegion, candidate.sourceRegion) >= CANDIDATE_IOU
  )))
  const deduplicated = withoutStoredCandidates.filter((candidate, index, all) => !all.slice(0, index).some((existing) => (
    existing.type === candidate.type && intersectionOverUnion(existing.sourceRegion, candidate.sourceRegion) >= CANDIDATE_IOU
  )))

  const problems = deduplicated.filter((candidate) => candidate.type === 'problem')
  const solutions = deduplicated.filter((candidate) => candidate.type === 'solution')
  for (const solution of solutions) {
    const relatedProblem = [...problems].reverse().find((problem) => problem.sourceRegion.y < solution.sourceRegion.y)
    if (relatedProblem) solution.relatedCandidateId = relatedProblem.id
  }

  return { candidates: deduplicated, textItemCount }
}
