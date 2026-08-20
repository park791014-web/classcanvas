import { useState } from 'react'
import { useElementSize } from '../../hooks/useElementSize'
import { ProblemCropCanvas } from './ProblemCropCanvas'
import { AnnotationCanvas } from '../annotation/AnnotationCanvas'
import type { ContentAnnotationSurface } from './ContentFocusView'
import type { PdfViewportMetrics } from '../../types/pdf'
import type { ProblemContentBlock } from '../../types/content'
import type { LoadedPdfDocument } from '../../types/pdf'

interface ProblemPreviewAreaProps {
  loadedPdf: LoadedPdfDocument
  problem: ProblemContentBlock
  maxHeight: number
  annotation: ContentAnnotationSurface
  active: boolean
  onActivate: () => void
}

const PREVIEW_READABLE_WIDTH = 780

export function ProblemPreviewArea({ loadedPdf, problem, maxHeight, annotation, active, onActivate }: ProblemPreviewAreaProps) {
  const [previewElement, setPreviewElement] = useState<HTMLDivElement | null>(null)
  const [metrics, setMetrics] = useState<PdfViewportMetrics | null>(null)
  const previewSize = useElementSize(previewElement)

  return (
    <section className={`problem-source-card${active ? ' is-active' : ''}`} aria-label={`${problem.title} 미리보기`} onPointerDownCapture={onActivate}>
      <div
        className="problem-preview-scroll"
        ref={setPreviewElement}
        style={{ maxHeight }}
        data-preview-max-height={maxHeight}
      >
        <div className="content-crop-stage" style={metrics ? { width: metrics.width, height: metrics.height } : undefined}>
          <ProblemCropCanvas document={loadedPdf.document} pageNumber={problem.sourcePage} region={problem.sourceRegion}
            availableWidth={Math.max(1, Math.min(previewSize.width, PREVIEW_READABLE_WIDTH))} title={problem.title} onMetricsChange={setMetrics} />
          {metrics && <AnnotationCanvas metrics={metrics} strokes={annotation.strokes} activeTool={active ? annotation.activeTool : 'none'} settings={annotation.settings}
            isVisible={annotation.isVisible} onAddStroke={annotation.onAddStroke} onEraseStrokes={annotation.onEraseStrokes} ariaLabel={`${problem.title} 원문 판서 영역`} />}
        </div>
      </div>
    </section>
  )
}
