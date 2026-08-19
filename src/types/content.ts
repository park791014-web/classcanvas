export type ContentType =
  | 'concept'
  | 'thinking'
  | 'example'
  | 'problem'
  | 'activity'
  | 'solution'
  | 'visual'

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  concept: '개념',
  thinking: '생각열기',
  example: '예제',
  problem: '문제',
  activity: '활동',
  visual: '그림·그래프',
  solution: '해설',
}

export const CONTENT_TYPE_OPTIONS = (Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((value) => ({
  value,
  label: CONTENT_TYPE_LABELS[value],
}))

export interface ContentBlock {
  id: string
  type: ContentType
  title: string
  sourceDocumentId: string
  sourceFileName: string
  sourcePage: number
  sourceRegion: SourceRegion
  createdAt: number
  relatedContentId?: string
}

export interface SourceRegion {
  x: number
  y: number
  width: number
  height: number
}

export type ProblemContentBlock = ContentBlock & { type: 'problem' }
export type CropContentBlock = ContentBlock & { type: 'example' | 'visual' | 'solution' }

export function isProblemContentBlock(block: ContentBlock): block is ProblemContentBlock {
  return block.type === 'problem'
}

export function isCropContentBlock(block: ContentBlock): block is CropContentBlock {
  return block.type === 'example' || block.type === 'visual' || block.type === 'solution'
}
