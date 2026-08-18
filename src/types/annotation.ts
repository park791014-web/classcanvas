export type AnnotationTool = 'none' | 'pen' | 'highlighter' | 'eraser' | 'region-select'

export type DrawingTool = Exclude<AnnotationTool, 'none' | 'eraser' | 'region-select'>

export type StrokeWidthPreset = 'thin' | 'normal' | 'thick'

export type AnnotationCoordinateMode = 'normalized' | 'problem-logical-y'

export interface AnnotationPoint {
  x: number
  y: number
  pressure: number
}

export interface AnnotationStroke {
  id: string
  tool: DrawingTool
  points: AnnotationPoint[]
  color: string
  opacity: number
  normalizedWidth: number
  coordinateMode?: AnnotationCoordinateMode
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
