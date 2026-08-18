import { PageNumberInput } from '../pdf/PageNumberInput'
import { PdfFileButton } from '../pdf/PdfFileButton'
import type { DocumentState, PdfLoadStatus } from '../../types/pdf'

interface LessonNavigatorProps {
  documentState: DocumentState | null
  status: PdfLoadStatus
  onFileSelected: (file: File) => void
  onPageChange: (pageNumber: number) => void
  onPreviousPage: () => void
  onNextPage: () => void
}

export function LessonNavigator({
  documentState,
  status,
  onFileSelected,
  onPageChange,
  onPreviousPage,
  onNextPage,
}: LessonNavigatorProps) {
  return (
    <aside className="lesson-navigator" aria-labelledby="navigator-title">
      <div className="panel-heading">
        <p className="eyebrow">수업 흐름</p>
        <h2 id="navigator-title">수업 내비게이터</h2>
      </div>
      {documentState ? (
        <div className="navigator-document">
          <section className="document-summary" aria-labelledby="document-summary-title">
            <p className="navigator-section-label" id="document-summary-title">현재 PDF</p>
            <strong title={documentState.fileName}>{documentState.fileName}</strong>
            <span>전체 {documentState.totalPages}페이지</span>
          </section>

          <section className="navigator-page-control" aria-labelledby="page-navigation-title">
            <p className="navigator-section-label" id="page-navigation-title">페이지 이동</p>
            <PageNumberInput
              compact
              currentPage={documentState.currentPage}
              totalPages={documentState.totalPages}
              onPageChange={onPageChange}
            />
            <div className="navigator-step-buttons">
              <button type="button" onClick={onPreviousPage} disabled={documentState.currentPage === 1}>‹ 이전</button>
              <button type="button" onClick={onNextPage} disabled={documentState.currentPage === documentState.totalPages}>다음 ›</button>
            </div>
          </section>

          <div className="navigator-file-action">
            <PdfFileButton label="다른 PDF 열기" onFileSelected={onFileSelected} />
            <p>선택한 파일은 브라우저 안에서만 처리됩니다.</p>
          </div>
        </div>
      ) : (
        <div className="navigator-empty-state">
          <span className="empty-state-icon" aria-hidden="true">＋</span>
          <p>{status === 'loading' ? 'PDF를 불러오는 중입니다.' : '아직 불러온 수업 자료가 없습니다.'}</p>
          <span>PDF를 선택하면 페이지 정보와 이동 도구가 여기에 표시됩니다.</span>
          {status !== 'loading' && <PdfFileButton label="PDF 불러오기" onFileSelected={onFileSelected} />}
        </div>
      )}
    </aside>
  )
}
