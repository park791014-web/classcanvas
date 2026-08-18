import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import type { SourceRegion } from '../../types/content'

interface ProblemCropCanvasProps {
  document: PDFDocumentProxy
  pageNumber: number
  region: SourceRegion
  availableWidth: number
  title: string
}

const MAX_RENDER_SCALE = 4
const MAX_OUTPUT_SCALE = 2

export function ProblemCropCanvas({ document, pageNumber, region, availableWidth, title }: ProblemCropCanvasProps) {
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
        const requestedScale = availableWidth / Math.max(1, sourceWidth)
        const scale = Math.min(MAX_RENDER_SCALE, Math.max(0.5, requestedScale))
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
          console.error('문제 영역을 렌더링할 수 없습니다.', error)
        }
      }
    }

    void renderCrop()
    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
      renderTaskRef.current = null
    }
  }, [availableWidth, document, pageNumber, region])

  return (
    <canvas
      ref={canvasRef}
      className="problem-crop-canvas"
      aria-label={`${title} 원본 문제`}
      data-source-page={pageNumber}
      data-region={`${region.x},${region.y},${region.width},${region.height}`}
    />
  )
}
