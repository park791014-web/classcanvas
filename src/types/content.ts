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
