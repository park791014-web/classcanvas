import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnnotationCanvas, type AnnotationCoordinateBounds } from '../annotation/AnnotationCanvas'
import { CLASSROOM_STROKE_WIDTH_REFERENCE } from '../annotation/annotationSizing'
import { useElementSize } from '../../hooks/useElementSize'
import type { ContentBlock } from '../../types/content'
import type { LoadedPdfDocument, PdfViewportMetrics } from '../../types/pdf'
import type { ContentAnnotationSurface } from './ContentFocusView'
import { ContentCropCanvas } from './ProblemCropCanvas'

interface ContentSourcePaneProps {
  loadedPdf: LoadedPdfDocument
  block: ContentBlock
  orientation: 'vertical' | 'horizontal'
  annotation: ContentAnnotationSurface
  active: boolean
  onActivate: () => void
}

export function ContentSourcePane({ loadedPdf, block, orientation, annotation, active, onActivate }: ContentSourcePaneProps) {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const [panel, setPanel] = useState<HTMLElement | null>(null)
  const [metrics, setMetrics] = useState<PdfViewportMetrics | null>(null)
  const [coordinateBounds, setCoordinateBounds] = useState<AnnotationCoordinateBounds | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(element)
  const panelSize = useElementSize(panel)

  useEffect(() => setMetrics(null), [block.id, orientation])

  const availableWidth = Math.max(1, (element?.clientWidth ?? size.width) - 12)
  const availableHeight = Math.max(1, (element?.clientHeight ?? size.height) - 12)

  const updateCoordinateBounds = useCallback(() => {
    const panelBounds = panel?.getBoundingClientRect()
    const stageBounds = stageRef.current?.getBoundingClientRect()
    if (!panelBounds || !stageBounds || stageBounds.width <= 0 || stageBounds.height <= 0) return
    const next = {
      x: stageBounds.left - panelBounds.left,
      y: stageBounds.top - panelBounds.top,
      width: stageBounds.width,
      height: stageBounds.height,
    }
    setCoordinateBounds((current) => current
      && Math.abs(current.x - next.x) < 0.25
      && Math.abs(current.y - next.y) < 0.25
      && Math.abs(current.width - next.width) < 0.25
      && Math.abs(current.height - next.height) < 0.25
      ? current : next)
  }, [panel])

  useLayoutEffect(() => {
    updateCoordinateBounds()
  }, [metrics, panelSize.height, panelSize.width, size.height, size.width, updateCoordinateBounds])

  const overlayMetrics: PdfViewportMetrics | null = panelSize.width > 0 && panelSize.height > 0 ? {
    pageNumber: block.sourcePage,
    scale: 1,
    width: panelSize.width,
    height: panelSize.height,
    baseWidth: panelSize.width,
    baseHeight: panelSize.height,
    outputScale: Math.min(window.devicePixelRatio || 1, 1.25),
  } : null

  return (
    <section
      ref={setPanel}
      className={`content-source-panel content-source-panel--${orientation}${active ? ' is-active' : ''}`}
      onPointerDownCapture={onActivate}
    >
      <div className="content-source-scroll" ref={setElement} onScroll={updateCoordinateBounds}>
        {size.width > 0 && size.height > 0 && (
          <div ref={stageRef} className="content-crop-stage" style={metrics ? { width: metrics.width, height: metrics.height } : undefined}>
            <ContentCropCanvas
              document={loadedPdf.document}
              pageNumber={block.sourcePage}
              region={block.sourceRegion}
              availableWidth={availableWidth}
              availableHeight={orientation === 'vertical' ? availableHeight : undefined}
              title={block.title}
              fitMode={orientation === 'vertical' ? 'contain' : 'width'}
              onMetricsChange={setMetrics}
            />
          </div>
        )}
      </div>
      {overlayMetrics && coordinateBounds && (
        <div className="content-source-annotation-layer">
          <AnnotationCanvas
            metrics={overlayMetrics}
            coordinateBounds={coordinateBounds}
            strokes={annotation.strokes}
            activeTool={annotation.activeTool}
            settings={annotation.settings}
            isVisible={annotation.isVisible}
            onAddStroke={annotation.onAddStroke}
            onEraseStrokes={annotation.onEraseStrokes}
            ariaLabel={`${block.title} 원문과 주변 여백 판서 영역`}
            strokeWidthReference={CLASSROOM_STROKE_WIDTH_REFERENCE}
          />
        </div>
      )}
    </section>
  )
}
