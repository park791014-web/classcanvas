export type ContentType = 'explanation' | 'problem' | 'material'

export type LegacyContentType =
  | 'concept'
  | 'thinking'
  | 'example'
  | 'problem'
  | 'activity'
  | 'solution'
  | 'visual'

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  explanation: '설명',
  problem: '문제',
  material: '자료',
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
export type FocusContentBlock = ContentBlock & { type: 'explanation' | 'material' }
export type LegacyCompatibleContentBlock = Omit<ContentBlock, 'type'> & {
  type: ContentType | LegacyContentType
}

export function migrateLegacyContentType(type: ContentType | LegacyContentType): ContentType {
  switch (type) {
    case 'concept':
    case 'thinking':
    case 'activity':
      return 'explanation'
    case 'example':
    case 'problem':
      return 'problem'
    case 'visual':
    case 'solution':
      return 'material'
    default:
      return type
  }
}

export function migrateLegacyContentBlock(block: LegacyCompatibleContentBlock): ContentBlock {
  const type = migrateLegacyContentType(block.type)
  return type === block.type ? block as ContentBlock : { ...block, type }
}

export function isProblemContentBlock(block: ContentBlock): block is ProblemContentBlock {
  return block.type === 'problem'
}

export function isFocusContentBlock(block: ContentBlock): block is FocusContentBlock {
  return block.type === 'explanation' || block.type === 'material'
}
