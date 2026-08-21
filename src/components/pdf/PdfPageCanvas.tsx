import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import type { PdfViewportMetrics } from '../../types/pdf'

interface PdfPageCanvasProps {
  document: PDFDocumentProxy
  pageNumber: number
  scale: number
  onMetricsChange: (metrics: PdfViewportMetrics) => void
  onRenderStateChange: (isRendering: boolean, error?: string) => void
}

const MAX_OUTPUT_SCALE = 2
const MAX_CANVAS_PIXELS = 16_777_216

function getSafeOutputScale(viewportWidth: number, viewportHeight: number) {
  const requestedScale = Math.min(window.devicePixelRatio || 1, MAX_OUTPUT_SCALE)
  const requestedPixels = viewportWidth * viewportHeight * requestedScale ** 2

  if (!Number.isFinite(requestedPixels) || requestedPixels <= 0) {
    throw new Error('Invalid PDF viewport dimensions')
  }

  return requestedPixels <= MAX_CANVAS_PIXELS
    ? requestedScale
    : Math.max(1, Math.sqrt(MAX_CANVAS_PIXELS / (viewportWidth * viewportHeight)))
}

export function PdfPageCanvas({
  document,
  pageNumber,
  scale,
  onMetricsChange,
  onRenderStateChange,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const renderVersionRef = useRef(0)

  useEffect(() => {
    const renderVersion = ++renderVersionRef.current
    let isCancelled = false
    const previousRenderTask = renderTaskRef.current
    onRenderStateChange(true)

    const renderPage = async () => {
      let viewportWidth: number | null = null
      let viewportHeight: number | null = null
      let outputScale: number | null = null
      let canvasBackingWidth: number | null = null
      let canvasBackingHeight: number | null = null

      try {
        if (previousRenderTask) {
          previousRenderTask.cancel()
          try {
            await previousRenderTask.promise
          } catch {
            // The expected cancellation rejection must settle before this canvas is reused.
          }
        }

        if (isCancelled || renderVersion !== renderVersionRef.current) return

        const page = await document.getPage(pageNumber)

        if (isCancelled || renderVersion !== renderVersionRef.current) return

        const baseViewport = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale })
        viewportWidth = viewport.width
        viewportHeight = viewport.height
        outputScale = getSafeOutputScale(viewport.width, viewport.height)
        const canvas = canvasRef.current

        if (!canvas) return

        const context = canvas.getContext('2d', { alpha: false })

        if (!context) {
          throw new Error('Canvas context unavailable')
        }

        canvas.width = Math.max(1, Math.floor(viewport.width * outputScale))
        canvas.height = Math.max(1, Math.floor(viewport.height * outputScale))
        canvasBackingWidth = canvas.width
        canvasBackingHeight = canvas.height
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`

        onMetricsChange({
          pageNumber,
          scale,
          width: viewport.width,
          height: viewport.height,
          baseWidth: baseViewport.width,
          baseHeight: baseViewport.height,
          outputScale,
        })

        if (isCancelled || renderVersion !== renderVersionRef.current) return

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        })

        renderTaskRef.current = renderTask
        await renderTask.promise

        if (!isCancelled && renderVersion === renderVersionRef.current) {
          onRenderStateChange(false)
        }
      } catch (renderError) {
        if (isCancelled || (renderError instanceof Error && renderError.name === 'RenderingCancelledException')) {
          return
        }

        console.error('PDF 페이지 렌더링 실패', renderError, {
          pageNumber,
          scale,
          viewport: { width: viewportWidth, height: viewportHeight },
          outputScale,
          devicePixelRatio: window.devicePixelRatio,
          canvasBackingSize: { width: canvasBackingWidth, height: canvasBackingHeight },
        })
        onRenderStateChange(false, '이 페이지를 표시할 수 없습니다.')
      }
    }

    void renderPage()

    return () => {
      isCancelled = true
      if (renderTaskRef.current === previousRenderTask) return
      renderTaskRef.current?.cancel()
    }
  }, [document, onMetricsChange, onRenderStateChange, pageNumber, scale])

  return <canvas ref={canvasRef} className="pdf-page-canvas" aria-label={`${pageNumber}페이지 PDF`} />
}
