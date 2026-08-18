export type ContentType =
  | 'concept'
  | 'example'
  | 'problem'
  | 'solution'
  | 'visual'

export interface ContentBlock {
  id: string
  type: ContentType
  title: string
}

export interface SourceRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface ProblemContentBlock extends ContentBlock {
  type: 'problem'
  sourceDocumentId: string
  sourceFileName: string
  sourcePage: number
  sourceRegion: SourceRegion
  createdAt: number
}
