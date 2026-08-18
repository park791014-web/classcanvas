import type { DocumentState, PdfLoadStatus } from '../../types/pdf'

interface TopBarProps {
  documentState: DocumentState | null
  status: PdfLoadStatus
}

export function TopBar({ documentState, status }: TopBarProps) {
  const statusText = status === 'loading'
    ? 'PDF 불러오는 중'
    : documentState
      ? `${documentState.fileName} · p.${documentState.currentPage}`
      : '현재 자료 없음'

  return (
    <header className="top-bar">
      <div className="brand-block">
        <span className="brand-mark" aria-hidden="true">C</span>
        <h1>ClassCanvas</h1>
      </div>
      <div className="material-status" aria-label="현재 수업 자료 상태" title={statusText}>
        <span className="status-indicator" aria-hidden="true" />
        <span>{statusText}</span>
      </div>
    </header>
  )
}
