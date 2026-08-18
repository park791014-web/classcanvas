import { useCallback, useEffect, useState } from 'react'
import { PdfFileButton } from '../pdf/PdfFileButton'
import { PdfPageCanvas } from '../pdf/PdfPageCanvas'
import { PdfViewerControls } from '../pdf/PdfViewerControls'
import { useElementSize } from '../../hooks/useElementSize'
import type { DocumentState, LoadedPdfDocument, PdfLoadStatus, PdfViewportMetrics, ZoomMode } from '../../types/pdf'

interface LessonWorkspaceProps {
  loadedPdf: LoadedPdfDocument | null
  documentState: DocumentState | null
  status: PdfLoadStatus
  error: string | null
  onDismissError: () => void
  onFileSelected: (file: File) => void
  onPageChange: (pageNumber: number) => void
  onPreviousPage: () => void
  onNextPage: () => void
  onZoomOut: () => void
  onZoomIn: () => void
  onPageFit: () => void
  onWidthFit: () => void
  onScaleChange: (scale: number, zoomMode?: ZoomMode) => void
}

const FIT_EDGE_GAP = 2

export function LessonWorkspace({
  loadedPdf,
  documentState,
  status,
  error,
  onDismissError,
  onFileSelected,
  onPageChange,
  onPreviousPage,
  onNextPage,
  onZoomOut,
  onZoomIn,
  onPageFit,
  onWidthFit,
  onScaleChange,
}: LessonWorkspaceProps) {
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(null)
  const viewportSize = useElementSize(viewportElement)
  const [pageMetrics, setPageMetrics] = useState<PdfViewportMetrics | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)

  const handleRenderStateChange = useCallback((rendering: boolean, nextError?: string) => {
    setIsRendering(rendering)
    setRenderError(nextError ?? null)
  }, [])

  useEffect(() => {
    if (
      !documentState ||
      documentState.zoomMode === 'manual' ||
      !pageMetrics ||
      pageMetrics.pageNumber !== documentState.currentPage ||
      !viewportElement ||
      viewportSize.width === 0 ||
      viewportSize.height === 0
    ) {
      return
    }

    const viewportStyle = window.getComputedStyle(viewportElement)
    const horizontalPadding = Number.parseFloat(viewportStyle.paddingLeft) + Number.parseFloat(viewportStyle.paddingRight)
    const verticalPadding = Number.parseFloat(viewportStyle.paddingTop) + Number.parseFloat(viewportStyle.paddingBottom)
    const availableWidth = Math.max(1, viewportElement.clientWidth - horizontalPadding - FIT_EDGE_GAP)
    const availableHeight = Math.max(1, viewportElement.clientHeight - verticalPadding - FIT_EDGE_GAP)
    const widthFitScale = availableWidth / pageMetrics.baseWidth
    const fitScale = documentState.zoomMode === 'width-fit'
      ? widthFitScale
      : Math.min(widthFitScale, availableHeight / pageMetrics.baseHeight)
    const safeScale = Math.min(2.5, Math.max(0.5, Number(fitScale.toFixed(3))))

    if (Math.abs(safeScale - documentState.scale) > 0.005) {
      onScaleChange(safeScale, documentState.zoomMode)
    }
  }, [documentState, onScaleChange, pageMetrics, viewportElement, viewportSize])

  const hasDocument = Boolean(loadedPdf && documentState)

  return (
    <section className="lesson-workspace" aria-labelledby="workspace-title">
      {hasDocument && loadedPdf && documentState ? (
        <div className="pdf-workspace">
          <h2 className="visually-hidden" id="workspace-title">PDF 수업 화면</h2>
          <PdfViewerControls
            documentState={documentState}
            onFileSelected={onFileSelected}
            onPageChange={onPageChange}
            onPreviousPage={onPreviousPage}
            onNextPage={onNextPage}
            onZoomOut={onZoomOut}
            onZoomIn={onZoomIn}
            onPageFit={onPageFit}
            onWidthFit={onWidthFit}
          />

          {error && (
            <div className="viewer-alert" role="alert">
              <span>{error}</span>
              <button type="button" onClick={onDismissError} aria-label="오류 메시지 닫기">닫기</button>
            </div>
          )}

          <div className="pdf-scroll-viewport" ref={setViewportElement} aria-busy={isRendering}>
            <div
              className="pdf-coordinate-space"
              style={pageMetrics ? { width: pageMetrics.width, height: pageMetrics.height } : undefined}
              data-page-number={documentState.currentPage}
              data-pdf-scale={documentState.scale}
            >
              <div className="workspace-document-layer">
                <PdfPageCanvas
                  document={loadedPdf.document}
                  pageNumber={documentState.currentPage}
                  scale={documentState.scale}
                  onMetricsChange={setPageMetrics}
                  onRenderStateChange={handleRenderStateChange}
                />
              </div>
              <div
                className="workspace-annotation-layer"
                aria-hidden="true"
                data-coordinate-width={pageMetrics?.width}
                data-coordinate-height={pageMetrics?.height}
              />
              <div className="workspace-ui-layer workspace-ui-layer--overlay" aria-live="polite">
                {isRendering && <div className="page-loading"><span className="loading-spinner" aria-hidden="true" />페이지를 표시하는 중입니다.</div>}
                {renderError && <div className="page-render-error" role="alert">{renderError}</div>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="workspace-layer-stack">
          <div className="workspace-layer workspace-document-layer" aria-hidden="true" />
          <div className="workspace-layer workspace-annotation-layer" aria-hidden="true" />
          <div className="workspace-layer workspace-ui-layer">
            <div className="workspace-empty-state">
              {status === 'loading' ? (
                <>
                  <span className="loading-spinner loading-spinner--large" aria-hidden="true" />
                  <p className="eyebrow">수업 자료 준비</p>
                  <h2 id="workspace-title">PDF를 불러오는 중입니다.</h2>
                  <p>파일 크기에 따라 잠시 시간이 걸릴 수 있습니다.</p>
                </>
              ) : (
                <>
                  <span className="workspace-symbol" aria-hidden="true"><span /><span /><span /></span>
                  <p className="eyebrow">수업 화면</p>
                  <h2 id="workspace-title">{error ? 'PDF를 열 수 없습니다.' : '수업 자료를 불러오면 이곳에 표시됩니다.'}</h2>
                  <p>{error ?? '교과서 PDF는 외부로 전송되지 않고 브라우저 안에서만 열립니다.'}</p>
                  <PdfFileButton label={error ? '다른 PDF 선택' : 'PDF 불러오기'} onFileSelected={onFileSelected} variant="primary" />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
