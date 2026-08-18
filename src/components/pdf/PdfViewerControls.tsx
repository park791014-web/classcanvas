import type { DocumentState } from '../../types/pdf'

interface PdfViewerControlsProps {
  documentState: DocumentState | null
  onZoomOut: () => void
  onZoomIn: () => void
  onPageFit: () => void
  onWidthFit: () => void
}

export function PdfViewerControls({
  documentState,
  onZoomOut,
  onZoomIn,
  onPageFit,
  onWidthFit,
}: PdfViewerControlsProps) {
  const scale = documentState?.scale ?? 1
  const zoomMode = documentState?.zoomMode
  const isDisabled = !documentState

  return (
    <div className="topbar-zoom-controls" aria-label="확대 및 맞춤">
        <button type="button" onClick={onZoomOut} disabled={isDisabled || scale <= 0.5} aria-label="축소">−</button>
        <output aria-label="현재 확대 비율">{Math.round(scale * 100)}%</output>
        <button type="button" onClick={onZoomIn} disabled={isDisabled || scale >= 2.5} aria-label="확대">＋</button>
        <button
          className={`fit-mode-button${zoomMode === 'page-fit' ? ' is-active' : ''}`}
          type="button"
          onClick={onPageFit}
          disabled={isDisabled}
          aria-pressed={zoomMode === 'page-fit'}
        >
          페이지 맞춤
        </button>
        <button
          className={`fit-mode-button${zoomMode === 'width-fit' ? ' is-active' : ''}`}
          type="button"
          onClick={onWidthFit}
          disabled={isDisabled}
          aria-pressed={zoomMode === 'width-fit'}
        >
          너비 맞춤
        </button>
    </div>
  )
}
