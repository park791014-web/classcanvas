import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import type { SourceRegion } from '../../types/content'
import type { PdfViewportMetrics } from '../../types/pdf'

export interface ContentCropCanvasProps {
  document: PDFDocumentProxy
  pageNumber: number
  region: SourceRegion
  availableWidth: number
  availableHeight?: number
  title: string
  fitMode?: 'width' | 'adaptive' | 'contain'
  onMetricsChange?: (metrics: PdfViewportMetrics) => void
}

const MAX_RENDER_SCALE = 4
const MAX_OUTPUT_SCALE = 2
const MAX_ADAPTIVE_SCALE = 1.45
const MAX_TALL_PROBLEM_SCALE = 1.25
const MIN_READABLE_SCALE = 0.85

function getAdaptiveScale(sourceWidth: number, sourceHeight: number, availableWidth: number, availableHeight: number) {
  const widthFitScale = availableWidth / Math.max(1, sourceWidth)
  const heightFitScale = availableHeight / Math.max(1, sourceHeight)
  const containedScale = Math.min(widthFitScale, heightFitScale)

  if (containedScale >= 1) {
    return Math.min(MAX_ADAPTIVE_SCALE, containedScale)
  }

  return Math.min(MAX_TALL_PROBLEM_SCALE, Math.max(MIN_READABLE_SCALE, widthFitScale))
}

export function ContentCropCanvas({
  document,
  pageNumber,
  region,
  availableWidth,
  availableHeight = Number.POSITIVE_INFINITY,
  title,
  fitMode = 'width',
  onMetricsChange,
}: ContentCropCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)

  useEffect(() => {
    if (availableWidth <= 0) return
    let cancelled = false
    renderTaskRef.current?.cancel()

    const renderCrop = async () => {
      try {
        const page = await document.getPage(pageNumber)
        if (cancelled) return

        const baseViewport = page.getViewport({ scale: 1 })
        const sourceWidth = baseViewport.width * region.width
        const sourceHeight = baseViewport.height * region.height
        const requestedScale = fitMode === 'contain'
          ? Math.min(availableWidth / Math.max(1, sourceWidth), availableHeight / Math.max(1, sourceHeight))
          : fitMode === 'adaptive'
            ? getAdaptiveScale(sourceWidth, sourceHeight, availableWidth, availableHeight)
            : availableWidth / Math.max(1, sourceWidth)
        const scale = Math.min(MAX_RENDER_SCALE, Math.max(fitMode === 'contain' ? 0.05 : 0.5, requestedScale))
        const viewport = page.getViewport({ scale })
        const cropX = viewport.width * region.x
        const cropY = viewport.height * region.y
        const cropWidth = viewport.width * region.width
        const cropHeight = viewport.height * region.height
        const outputScale = Math.min(window.devicePixelRatio || 1, MAX_OUTPUT_SCALE)
        const canvas = canvasRef.current
        if (!canvas) return
        const context = canvas.getContext('2d', { alpha: false })
        if (!context) return

        canvas.width = Math.max(1, Math.ceil(cropWidth * outputScale))
        canvas.height = Math.max(1, Math.ceil(cropHeight * outputScale))
        canvas.style.width = `${cropWidth}px`
        canvas.style.height = `${cropHeight}px`
        canvas.dataset.renderScale = scale.toFixed(3)
        onMetricsChange?.({ pageNumber, scale, width: cropWidth, height: cropHeight, baseWidth: sourceWidth, baseHeight: sourceHeight, outputScale })

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: [outputScale, 0, 0, outputScale, -cropX * outputScale, -cropY * outputScale],
          background: '#ffffff',
        })
        renderTaskRef.current = renderTask
        await renderTask.promise
      } catch (error) {
        if (!cancelled && (!(error instanceof Error) || error.name !== 'RenderingCancelledException')) {
          console.error('콘텐츠 영역을 렌더링할 수 없습니다.', error)
        }
      }
    }

    void renderCrop()
    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
      renderTaskRef.current = null
    }
  }, [availableHeight, availableWidth, document, fitMode, onMetricsChange, pageNumber, region])

  return (
    <canvas
      ref={canvasRef}
      className={`problem-crop-canvas${fitMode !== 'width' ? ' problem-crop-canvas--adaptive' : ''}`}
      aria-label={`${title} 원본 콘텐츠`}
      data-source-page={pageNumber}
      data-region={`${region.x},${region.y},${region.width},${region.height}`}
    />
  )
}

export const ProblemCropCanvas = ContentCropCanvas
