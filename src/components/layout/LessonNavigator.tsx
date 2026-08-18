import { useEffect, useState } from 'react'
import { PageNumberInput } from '../pdf/PageNumberInput'
import { PdfFileButton } from '../pdf/PdfFileButton'
import type { ProblemContentBlock } from '../../types/content'
import type { DocumentState, PdfLoadStatus } from '../../types/pdf'

interface LessonNavigatorProps {
  documentState: DocumentState | null
  status: PdfLoadStatus
  onFileSelected: (file: File) => void
  onPageChange: (pageNumber: number) => void
  onPreviousPage: () => void
  onNextPage: () => void
  problems: ProblemContentBlock[]
  focusedProblemId: string | null
  onSelectProblem: (problem: ProblemContentBlock) => void
  onRenameProblem: (problemId: string, title: string) => void
  onDeleteProblem: (problem: ProblemContentBlock) => void
}

export function LessonNavigator({
  documentState,
  status,
  onFileSelected,
  onPageChange,
  onPreviousPage,
  onNextPage,
  problems,
  focusedProblemId,
  onSelectProblem,
  onRenameProblem,
  onDeleteProblem,
}: LessonNavigatorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setEditingId(null)
    setDeletingId(null)
  }, [documentState?.fileName])

  const currentPageProblems = documentState
    ? problems.filter((problem) => problem.sourcePage === documentState.currentPage)
    : []
  const otherPageProblems = documentState
    ? problems.filter((problem) => problem.sourcePage !== documentState.currentPage)
    : []

  const renderProblem = (problem: ProblemContentBlock) => (
    <li key={problem.id} className={focusedProblemId === problem.id ? 'problem-nav-item is-active' : 'problem-nav-item'}>
      {editingId === problem.id ? (
        <form
          className="problem-rename-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (!editingTitle.trim()) return
            onRenameProblem(problem.id, editingTitle)
            setEditingId(null)
          }}
        >
          <input
            value={editingTitle}
            maxLength={40}
            autoFocus
            aria-label="문제 이름"
            onChange={(event) => setEditingTitle(event.target.value)}
          />
          <button type="button" onClick={() => setEditingId(null)}>취소</button>
          <button type="submit" disabled={!editingTitle.trim()}>저장</button>
        </form>
      ) : deletingId === problem.id ? (
        <div className="problem-delete-confirm" role="alert">
          <span>문제와 풀이를 삭제할까요?</span>
          <div>
            <button type="button" onClick={() => setDeletingId(null)}>취소</button>
            <button type="button" className="danger-action" onClick={() => { onDeleteProblem(problem); setDeletingId(null) }}>삭제</button>
          </div>
        </div>
      ) : (
        <>
          <button type="button" className="problem-open-button" onClick={() => onSelectProblem(problem)}>
            <span>{problem.title}</span>
            <small>p.{problem.sourcePage}</small>
          </button>
          <div className="problem-item-actions">
            <button type="button" aria-label={`${problem.title} 이름 수정`} onClick={() => { setEditingId(problem.id); setEditingTitle(problem.title) }}>수정</button>
            <button type="button" aria-label={`${problem.title} 삭제`} onClick={() => setDeletingId(problem.id)}>삭제</button>
          </div>
        </>
      )}
    </li>
  )

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

          <section className="navigator-content-blocks" aria-labelledby="problem-list-title">
            <div className="navigator-content-heading">
              <p className="navigator-section-label" id="problem-list-title">현재 페이지 · p.{documentState.currentPage}</p>
              <span>{currentPageProblems.length}개</span>
            </div>
            {currentPageProblems.length > 0 ? (
              <ul className="problem-list">{currentPageProblems.map(renderProblem)}</ul>
            ) : (
              <p className="problem-list-empty">영역 선택 도구로 문제를 추가할 수 있습니다.</p>
            )}

            {otherPageProblems.length > 0 && (
              <>
                <p className="other-problems-label">다른 페이지 문제</p>
                <ul className="problem-list problem-list--other">{otherPageProblems.map(renderProblem)}</ul>
              </>
            )}
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
