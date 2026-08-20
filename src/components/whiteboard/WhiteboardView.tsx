import { useMemo, useState } from 'react'
import { AnnotationCanvas } from '../annotation/AnnotationCanvas'
import { useElementSize } from '../../hooks/useElementSize'
import type { AnnotationSettings, AnnotationStroke, AnnotationTool } from '../../types/annotation'
import type { PdfViewportMetrics } from '../../types/pdf'

interface WhiteboardViewProps {
  strokes: AnnotationStroke[]
  activeTool: AnnotationTool
  settings: AnnotationSettings
  isVisible: boolean
  onAddStroke: (stroke: AnnotationStroke) => void
  onEraseStrokes: (strokeIds: string[]) => void
  onReturnToTextbook: () => void
}

export function WhiteboardView({
  strokes,
  activeTool,
  settings,
  isVisible,
  onAddStroke,
  onEraseStrokes,
  onReturnToTextbook,
}: WhiteboardViewProps) {
  const [surface, setSurface] = useState<HTMLDivElement | null>(null)
  const size = useElementSize(surface)
  const metrics = useMemo<PdfViewportMetrics>(() => ({
    pageNumber: 1,
    scale: 1,
    width: Math.max(1, size.width),
    height: Math.max(1, size.height),
    baseWidth: Math.max(1, size.width),
    baseHeight: Math.max(1, size.height),
    outputScale: Math.min(window.devicePixelRatio || 1, 2),
  }), [size.height, size.width])

  return (
    <section className="lesson-workspace whiteboard-view" aria-label="빈 칠판">
      <header className="whiteboard-header">
        <button type="button" onClick={onReturnToTextbook}>교과서로</button>
        <strong>빈 칠판</strong>
        <span aria-hidden="true" />
      </header>
      <div className="whiteboard-surface" ref={setSurface}>
        {size.width > 0 && size.height > 0 && (
          <AnnotationCanvas
            metrics={metrics}
            strokes={strokes}
            activeTool={activeTool}
            settings={settings}
            isVisible={isVisible}
            onAddStroke={onAddStroke}
            onEraseStrokes={onEraseStrokes}
            ariaLabel="빈 칠판 판서 영역"
            coordinateScope="pdf-page"
          />
        )}
      </div>
    </section>
  )
}
