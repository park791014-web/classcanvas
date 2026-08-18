export type AnnotationTool = 'none' | 'pen' | 'highlighter' | 'eraser'

export type DrawingTool = Exclude<AnnotationTool, 'none' | 'eraser'>

export type StrokeWidthPreset = 'thin' | 'normal' | 'thick'

export interface NormalizedPoint {
  x: number
  y: number
  pressure: number
}

export interface AnnotationStroke {
  id: string
  tool: DrawingTool
  points: NormalizedPoint[]
  color: string
  opacity: number
  normalizedWidth: number
}

export interface DrawingStyle {
  color: string
  widthPreset: StrokeWidthPreset
}

export interface AnnotationSettings {
  pen: DrawingStyle
  highlighter: DrawingStyle
}

export interface PageAnnotationHistory {
  past: AnnotationStroke[][]
  present: AnnotationStroke[]
  future: AnnotationStroke[][]
}

export interface DocumentAnnotations {
  pages: Record<number, PageAnnotationHistory>
  isVisible: boolean
}

