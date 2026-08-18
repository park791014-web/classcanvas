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

export function PdfPageCanvas({
  document,
  pageNumber,
  scale,
  onMetricsChange,
  onRenderStateChange,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)

  useEffect(() => {
    let isCancelled = false
    renderTaskRef.current?.cancel()
    onRenderStateChange(true)

    const renderPage = async () => {
      try {
        const page = await document.getPage(pageNumber)

        if (isCancelled) return

        const baseViewport = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale })
        const outputScale = Math.min(window.devicePixelRatio || 1, MAX_OUTPUT_SCALE)
        const canvas = canvasRef.current

        if (!canvas) return

        const context = canvas.getContext('2d', { alpha: false })

        if (!context) {
          throw new Error('Canvas context unavailable')
        }

        canvas.width = Math.max(1, Math.floor(viewport.width * outputScale))
        canvas.height = Math.max(1, Math.floor(viewport.height * outputScale))
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

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        })

        renderTaskRef.current = renderTask
        await renderTask.promise

        if (!isCancelled) {
          onRenderStateChange(false)
        }
      } catch (renderError) {
        if (isCancelled || (renderError instanceof Error && renderError.name === 'RenderingCancelledException')) {
          return
        }

        onRenderStateChange(false, '이 페이지를 표시할 수 없습니다.')
      }
    }

    void renderPage()

    return () => {
      isCancelled = true
      renderTaskRef.current?.cancel()
      renderTaskRef.current = null
    }
  }, [document, onMetricsChange, onRenderStateChange, pageNumber, scale])

  return <canvas ref={canvasRef} className="pdf-page-canvas" aria-label={`${pageNumber}페이지 PDF`} />
}
