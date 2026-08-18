import type { DocumentState } from '../../types/pdf'
import { PageNumberInput } from './PageNumberInput'
import { PdfFileButton } from './PdfFileButton'

interface PdfViewerControlsProps {
  documentState: DocumentState
  onFileSelected: (file: File) => void
  onPageChange: (pageNumber: number) => void
  onPreviousPage: () => void
  onNextPage: () => void
  onZoomOut: () => void
  onZoomIn: () => void
  onPageFit: () => void
  onWidthFit: () => void
}

export function PdfViewerControls({
  documentState,
  onFileSelected,
  onPageChange,
  onPreviousPage,
  onNextPage,
  onZoomOut,
  onZoomIn,
  onPageFit,
  onWidthFit,
}: PdfViewerControlsProps) {
  const { currentPage, totalPages, scale, zoomMode } = documentState

  return (
    <div className="pdf-viewer-controls" aria-label="PDF 보기 도구">
      <PdfFileButton label="다른 PDF 열기" onFileSelected={onFileSelected} />

      <div className="page-controls" aria-label="페이지 이동">
        <button type="button" onClick={onPreviousPage} disabled={currentPage === 1} aria-label="이전 페이지">
          ‹ <span>이전</span>
        </button>
        <PageNumberInput
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
        <button type="button" onClick={onNextPage} disabled={currentPage === totalPages} aria-label="다음 페이지">
          <span>다음</span> ›
        </button>
      </div>

      <div className="zoom-controls" aria-label="확대 및 축소">
        <button type="button" onClick={onZoomOut} disabled={scale <= 0.5} aria-label="축소">−</button>
        <output aria-label="현재 확대 비율">{Math.round(scale * 100)}%</output>
        <button type="button" onClick={onZoomIn} disabled={scale >= 2.5} aria-label="확대">＋</button>
        <button
          className={`fit-mode-button${zoomMode === 'page-fit' ? ' is-active' : ''}`}
          type="button"
          onClick={onPageFit}
          aria-pressed={zoomMode === 'page-fit'}
        >
          페이지 맞춤
        </button>
        <button
          className={`fit-mode-button${zoomMode === 'width-fit' ? ' is-active' : ''}`}
          type="button"
          onClick={onWidthFit}
          aria-pressed={zoomMode === 'width-fit'}
        >
          너비 맞춤
        </button>
      </div>
    </div>
  )
}
