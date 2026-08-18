import type { DocumentState, PdfLoadStatus } from '../../types/pdf'
import { PdfViewerControls } from '../pdf/PdfViewerControls'

interface TopBarProps {
  documentState: DocumentState | null
  status: PdfLoadStatus
  onZoomOut: () => void
  onZoomIn: () => void
  onPageFit: () => void
  onWidthFit: () => void
}

export function TopBar({ documentState, status, onZoomOut, onZoomIn, onPageFit, onWidthFit }: TopBarProps) {
  const statusText = status === 'loading' ? 'PDF 불러오는 중' : documentState?.fileName ?? '현재 자료 없음'

  return (
    <header className="top-bar">
      <div className="brand-block">
        <span className="brand-mark" aria-hidden="true">C</span>
        <h1>ClassCanvas</h1>
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
    </header>
  )
}
