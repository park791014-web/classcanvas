import type { DocumentState, PdfLoadStatus } from '../../types/pdf'
import { PdfViewerControls } from '../pdf/PdfViewerControls'

interface TopBarProps {
  documentState: DocumentState | null
  status: PdfLoadStatus
  onZoomOut: () => void
  onZoomIn: () => void
  onPageFit: () => void
  onWidthFit: () => void
  onPreviousPage: () => void
  onNextPage: () => void
}

export function TopBar({
  documentState,
  status,
  onZoomOut,
  onZoomIn,
  onPageFit,
  onWidthFit,
  onPreviousPage,
  onNextPage,
}: TopBarProps) {
  const statusText = status === 'loading' ? 'PDF 불러오는 중' : documentState?.fileName ?? '현재 자료 없음'

  return (
    <header className="top-bar">
      <div className="brand-block">
        <span className="brand-mark" aria-hidden="true">L</span>
        <h1>LessonCanvas</h1>
      </div>
      <div className="material-status" aria-label="현재 수업 자료 상태" title={statusText}>
        <span className="status-indicator" aria-hidden="true" />
        <span className="material-file-name">{statusText}</span>
        {documentState && <span className="material-page">· p.{documentState.currentPage}</span>}
      </div>
      <PdfViewerControls
        documentState={documentState}
        onZoomOut={onZoomOut}
        onZoomIn={onZoomIn}
        onPageFit={onPageFit}
        onWidthFit={onWidthFit}
      />
      <nav className="topbar-page-controls" aria-label="PDF 페이지 이동">
        <button type="button" disabled={!documentState || documentState.currentPage === 1} onClick={onPreviousPage} aria-label="이전 페이지">‹</button>
        <button type="button" disabled={!documentState || documentState.currentPage === documentState.totalPages} onClick={onNextPage} aria-label="다음 페이지">›</button>
      </nav>
    </header>
  )
}
