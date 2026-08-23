import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { PdfFileButton } from '../pdf/PdfFileButton'
import { PdfPageCanvas } from '../pdf/PdfPageCanvas'
import { AnnotationCanvas } from '../annotation/AnnotationCanvas'
import { RegionSelector } from '../content/RegionSelector'
import { CandidateOverlay } from '../analysis/CandidateOverlay'
import { useElementSize } from '../../hooks/useElementSize'
import type { AnnotationSettings, AnnotationStroke, AnnotationTool } from '../../types/annotation'
import type { ContentBlock, ContentType, SourceRegion } from '../../types/content'
import type { AnalysisCandidate } from '../../types/analysis'
import type { DocumentState, LoadedPdfDocument, PdfLoadStatus, PdfViewportMetrics, ZoomMode } from '../../types/pdf'

interface LessonWorkspaceProps {
  loadedPdf: LoadedPdfDocument | null
  documentState: DocumentState | null
  status: PdfLoadStatus
  error: string | null
  onDismissError: () => void
  onFileSelected: (file: File) => void
  onScaleChange: (scale: number, zoomMode?: ZoomMode) => void
  annotationStrokes: AnnotationStroke[]
  annotationTool: AnnotationTool
  annotationSettings: AnnotationSettings
  annotationsVisible: boolean
  onAddStroke: (stroke: AnnotationStroke) => void
  onEraseStrokes: (strokeIds: string[]) => void
  blocks: ContentBlock[]
  nextTitles: Record<ContentType, string>
  activeContentBlock: ContentBlock | null
  onSaveBlock: (region: SourceRegion, type: ContentType, title: string) => void
  analysisCandidates: AnalysisCandidate[]
  activeAnalysisCandidate: AnalysisCandidate | null
  editingCandidateRegionId: string | null
  onCandidateRegionChange: (candidateId: string, region: SourceRegion) => void
  onCancelCandidateRegionEdit: () => void
  reviewPanel?: ReactNode
}

const FIT_EDGE_GAP = 2

interface PinchGestureState {
  pointers: Map<number, { x: number; y: number }>
  initialDistance: number
  initialScale: number
}

function pointerDistance(points: { x: number; y: number }[]) {
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
}

export function LessonWorkspace({
  loadedPdf,
  documentState,
  status,
  error,
  onDismissError,
  onFileSelected,
  onScaleChange,
  annotationStrokes,
  annotationTool,
  annotationSettings,
  annotationsVisible,
  onAddStroke,
  onEraseStrokes,
  blocks,
  nextTitles,
  activeContentBlock,
  onSaveBlock,
  analysisCandidates,
  activeAnalysisCandidate,
  editingCandidateRegionId,
  onCandidateRegionChange,
  onCancelCandidateRegionEdit,
  reviewPanel,
}: LessonWorkspaceProps) {
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(null)
  const viewportSize = useElementSize(viewportElement)
  const [pageMetrics, setPageMetrics] = useState<PdfViewportMetrics | null>(null)
  const [coordinateSpace, setCoordinateSpace] = useState<HTMLDivElement | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const previousPageRef = useRef<number | null>(null)
  const pinchGestureRef = useRef<PinchGestureState>({ pointers: new Map(), initialDistance: 0, initialScale: 1 })

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

  useEffect(() => {
    const activeTarget = activeAnalysisCandidate ?? activeContentBlock
    if (!documentState || !pageMetrics || !viewportElement || !coordinateSpace) return
    if (pageMetrics.pageNumber !== documentState.currentPage) return
    const pageChanged = previousPageRef.current !== documentState.currentPage
    previousPageRef.current = documentState.currentPage
    if (!activeTarget || activeTarget.sourcePage !== documentState.currentPage) {
      if (pageChanged) viewportElement.scrollTo({ left: 0, top: 0 })
      return
    }
    const region = activeTarget.sourceRegion
    viewportElement.scrollTo({
      left: Math.max(0, coordinateSpace.offsetLeft + pageMetrics.width * (region.x + region.width / 2) - viewportElement.clientWidth / 2),
      top: Math.max(0, coordinateSpace.offsetTop + pageMetrics.height * (region.y + region.height / 2) - viewportElement.clientHeight / 2),
      behavior: 'smooth',
    })
  }, [activeAnalysisCandidate, activeContentBlock, coordinateSpace, documentState, pageMetrics, viewportElement])

  const hasDocument = Boolean(loadedPdf && documentState)
  const pinchEnabled = hasDocument && annotationTool === 'none'

  const handlePinchPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pinchEnabled || event.pointerType !== 'touch' || !documentState) return
    const gesture = pinchGestureRef.current
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.preventDefault()
    if (gesture.pointers.size === 2) {
      gesture.initialDistance = pointerDistance([...gesture.pointers.values()])
      gesture.initialScale = documentState.scale
    }
  }

  const handlePinchPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = pinchGestureRef.current
    const previousPoint = gesture.pointers.get(event.pointerId)
    if (!pinchEnabled || event.pointerType !== 'touch' || !previousPoint) return
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.preventDefault()
    if (gesture.pointers.size === 1) {
      event.currentTarget.scrollLeft += previousPoint.x - event.clientX
      event.currentTarget.scrollTop += previousPoint.y - event.clientY
      return
    }
    if (gesture.pointers.size !== 2 || gesture.initialDistance <= 0) return
    const nextDistance = pointerDistance([...gesture.pointers.values()])
    onScaleChange(Number((gesture.initialScale * nextDistance / gesture.initialDistance).toFixed(3)), 'manual')
  }

  const finishPinchPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return
    const gesture = pinchGestureRef.current
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    gesture.pointers.delete(event.pointerId)
    if (gesture.pointers.size < 2) gesture.initialDistance = 0
  }
  const annotationMetrics = documentState && pageMetrics
    && pageMetrics.pageNumber === documentState.currentPage
    && Math.abs(pageMetrics.scale - documentState.scale) < 0.005
    ? pageMetrics
    : null
  const selectorReady = Boolean(documentState && pageMetrics && pageMetrics.pageNumber === documentState.currentPage)
  const currentPageBlocks = documentState
    ? blocks.filter((block) => block.sourcePage === documentState.currentPage)
    : []
  const currentPageCandidates = documentState
    ? analysisCandidates.filter((candidate) => candidate.sourcePage === documentState.currentPage)
    : []

  return (
    <section className="lesson-workspace" aria-labelledby="workspace-title">
      {hasDocument && loadedPdf && documentState ? (
        <div className="pdf-workspace">
          <h2 className="visually-hidden" id="workspace-title">PDF 수업 화면</h2>
          {error && (
            <div className="viewer-alert" role="alert">
              <span>{error}</span>
              <button type="button" onClick={onDismissError} aria-label="오류 메시지 닫기">닫기</button>
            </div>
          )}

          <div
            className={`pdf-scroll-viewport${pinchEnabled ? ' is-pinch-enabled' : ''}`}
            ref={setViewportElement}
            aria-busy={isRendering}
            onPointerDown={handlePinchPointerDown}
            onPointerMove={handlePinchPointerMove}
            onPointerUp={finishPinchPointer}
            onPointerCancel={finishPinchPointer}
          >
            <div
              className="pdf-coordinate-space"
              ref={setCoordinateSpace}
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
              <div className="workspace-annotation-layer">
                {annotationMetrics && (
                  <AnnotationCanvas
                    metrics={annotationMetrics}
                    strokes={annotationStrokes}
                    activeTool={annotationTool}
                    settings={annotationSettings}
                    isVisible={annotationsVisible}
                    onAddStroke={onAddStroke}
                    onEraseStrokes={onEraseStrokes}
                  />
                )}
                {annotationMetrics && (
                  <CandidateOverlay
                    candidates={currentPageCandidates}
                    activeCandidateId={activeAnalysisCandidate?.id ?? null}
                    editingCandidateId={editingCandidateRegionId}
                    onRegionChange={onCandidateRegionChange}
                    onCancelRegionEdit={onCancelCandidateRegionEdit}
                  />
                )}
              </div>
              <div className="workspace-ui-layer workspace-ui-layer--overlay" aria-live="polite">
                {selectorReady && (
                  <RegionSelector
                    active={annotationTool === 'region-select'}
                    defaultTitles={nextTitles}
                    savedBlocks={currentPageBlocks}
                    activeBlockId={activeContentBlock?.id ?? null}
                    onSave={onSaveBlock}
                  />
                )}
                {isRendering && <div className="page-loading"><span className="loading-spinner" aria-hidden="true" />페이지를 표시하는 중입니다.</div>}
                {renderError && <div className="page-render-error" role="alert">{renderError}</div>}
              </div>
            </div>
          </div>
          {reviewPanel}
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
                  <h2 id="workspace-title">{error ? 'PDF를 열 수 없습니다.' : 'PDF를 여기에 끌어다 놓으세요'}</h2>
                  <p>{error ?? '또는 아래 버튼으로 PDF 파일을 선택하세요. 파일은 브라우저 안에서만 열립니다.'}</p>
                  <PdfFileButton label={error ? '다른 PDF 선택' : 'PDF 파일 선택'} onFileSelected={onFileSelected} variant="primary" />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
