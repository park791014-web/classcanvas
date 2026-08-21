import { useEffect, useState } from 'react'
import { AnnotationCanvas } from '../annotation/AnnotationCanvas'
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
  const [metrics, setMetrics] = useState<PdfViewportMetrics | null>(null)
  const size = useElementSize(element)

  useEffect(() => setMetrics(null), [block.id, orientation])

  const availableWidth = Math.max(1, (element?.clientWidth ?? size.width) - 12)
  const availableHeight = Math.max(1, (element?.clientHeight ?? size.height) - 12)

  return (
    <section
      className={`content-source-panel content-source-panel--${orientation}${active ? ' is-active' : ''}`}
      onPointerDownCapture={onActivate}
    >
      <div className="content-source-scroll" ref={setElement}>
        {size.width > 0 && size.height > 0 && (
          <div className="content-crop-stage" style={metrics ? { width: metrics.width, height: metrics.height } : undefined}>
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
            {metrics && (
              <AnnotationCanvas
                metrics={metrics}
                strokes={annotation.strokes}
                activeTool={annotation.activeTool}
                settings={annotation.settings}
                isVisible={annotation.isVisible}
                onAddStroke={annotation.onAddStroke}
                onEraseStrokes={annotation.onEraseStrokes}
                ariaLabel={`${block.title} 원문 판서 영역`}
                strokeWidthReference={CLASSROOM_STROKE_WIDTH_REFERENCE}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}
