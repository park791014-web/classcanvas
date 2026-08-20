import { useEffect, useMemo, useState } from 'react'
import { ContentBlockEditor } from '../content/ContentBlockEditor'
import { PageNumberInput } from '../pdf/PageNumberInput'
import { PdfFileButton } from '../pdf/PdfFileButton'
import { CONTENT_TYPE_LABELS } from '../../types/content'
import type { ContentBlock, ContentType } from '../../types/content'
import type { UpdateContentBlockInput } from '../../hooks/useContentBlocks'
import type { DocumentState, PdfLoadStatus } from '../../types/pdf'
import type { AnalysisProgress, AnalysisScope } from '../../types/analysis'

interface LessonNavigatorProps {
  documentState: DocumentState | null
  status: PdfLoadStatus
  onFileSelected: (file: File) => void
  onPageChange: (pageNumber: number) => void
  onPreviousPage: () => void
  onNextPage: () => void
  blocks: ContentBlock[]
  selectedContentId: string | null
  onSelectBlock: (block: ContentBlock) => void
  onUpdateBlock: (block: ContentBlock, input: UpdateContentBlockInput) => string | null
  onDeleteBlock: (block: ContentBlock) => void
  analysisScope: AnalysisScope
  analysisProgress: AnalysisProgress
  analysisCandidateCount: number
  analysisNotice: string | null
  onAnalysisScopeChange: (scope: AnalysisScope) => void
  onAnalyze: () => void
  onCancelAnalysis: () => void
  onOpenAnalysisReview: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

function sortByTextbookOrder(blocks: ContentBlock[]) {
  return [...blocks].sort((a, b) => a.sourceRegion.y - b.sourceRegion.y || a.createdAt - b.createdAt)
}

export function LessonNavigator({
  documentState,
  status,
  onFileSelected,
  onPageChange,
  onPreviousPage,
  onNextPage,
  blocks,
  selectedContentId,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  analysisScope,
  analysisProgress,
  analysisCandidateCount,
  analysisNotice,
  onAnalysisScopeChange,
  onAnalyze,
  onCancelAnalysis,
  onOpenAnalysisReview,
  collapsed,
  onToggleCollapsed,
}: LessonNavigatorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingType, setEditingType] = useState<ContentType>('problem')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editMessage, setEditMessage] = useState<string | null>(null)

  useEffect(() => {
    setEditingId(null)
    setDeletingId(null)
    setEditMessage(null)
  }, [documentState?.fileName])

  const currentPageBlocks = useMemo(() => documentState
    ? sortByTextbookOrder(blocks.filter((block) => block.sourcePage === documentState.currentPage))
    : [], [blocks, documentState])
  const otherPageGroups = useMemo(() => {
    if (!documentState) return []
    const groups = new Map<number, ContentBlock[]>()
    blocks.filter((block) => block.sourcePage !== documentState.currentPage).forEach((block) => {
      groups.set(block.sourcePage, [...(groups.get(block.sourcePage) ?? []), block])
    })
    return [...groups.entries()]
      .sort(([pageA], [pageB]) => pageA - pageB)
      .map(([page, pageBlocks]) => ({ page, blocks: sortByTextbookOrder(pageBlocks) }))
  }, [blocks, documentState])

  const startEditing = (block: ContentBlock) => {
    setEditingId(block.id)
    setEditingType(block.type)
    setEditingTitle(block.title)
    setEditMessage(null)
  }

  const renderBlock = (block: ContentBlock) => (
    <li key={block.id} className={selectedContentId === block.id ? 'problem-nav-item is-active' : 'problem-nav-item'}>
      {editingId === block.id ? (
        <form
          className="problem-rename-form content-edit-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (!editingTitle.trim()) return
            const warning = onUpdateBlock(block, { type: editingType, title: editingTitle })
            if (warning) { setEditMessage(warning); return }
            setEditingId(null)
          }}
        >
          <ContentBlockEditor
            compact
            type={editingType}
            title={editingTitle}
            onTypeChange={setEditingType}
            onTitleChange={setEditingTitle}
          />
          {editMessage && <p className="content-edit-message" role="alert">{editMessage}</p>}
          <div>
            <button type="button" onClick={() => setEditingId(null)}>취소</button>
            <button type="submit" disabled={!editingTitle.trim()}>저장</button>
          </div>
        </form>
      ) : deletingId === block.id ? (
        <div className="problem-delete-confirm" role="alert">
          <span>{block.type === 'problem' ? '문제와 풀이를 삭제할까요?' : '이 콘텐츠를 삭제할까요?'}</span>
          <div>
            <button type="button" onClick={() => setDeletingId(null)}>취소</button>
            <button type="button" className="danger-action" onClick={() => { onDeleteBlock(block); setDeletingId(null) }}>삭제</button>
          </div>
        </div>
      ) : (
        <>
          <button type="button" className="problem-open-button content-open-button" title={block.title} onClick={() => onSelectBlock(block)}>
            <span className={`content-type-badge content-type-badge--${block.type}`}>{CONTENT_TYPE_LABELS[block.type]}</span>
            <span className="content-block-title">{block.title}</span>
            <small>p.{block.sourcePage}</small>
          </button>
          <div className="problem-item-actions">
            <button type="button" aria-label={`${block.title} 수정`} onClick={() => startEditing(block)}>수정</button>
            <button type="button" aria-label={`${block.title} 삭제`} onClick={() => setDeletingId(block.id)}>삭제</button>
          </div>
        </>
      )}
    </li>
  )

  if (collapsed) {
    return (
      <aside className="lesson-navigator lesson-navigator--collapsed" aria-label="접힌 수업 내비게이터">
        <button type="button" className="navigator-toggle" onClick={onToggleCollapsed} aria-label="수업 내비게이터 펼치기" title="내비게이터 펼치기">›</button>
      </aside>
    )
  }

  return (
    <aside className="lesson-navigator" aria-labelledby="navigator-title">
      <div className="panel-heading">
        <h2 id="navigator-title">내비게이터</h2>
        <button type="button" className="navigator-toggle" onClick={onToggleCollapsed} aria-label="수업 내비게이터 접기" title="내비게이터 접기">‹</button>
      </div>
      {documentState ? (
        <div className="navigator-document">
          <section className="navigator-page-control" aria-labelledby="page-navigation-title">
            <p className="navigator-section-label" id="page-navigation-title">페이지 이동</p>
            <PageNumberInput compact currentPage={documentState.currentPage} totalPages={documentState.totalPages} onPageChange={onPageChange} />
            <div className="navigator-step-buttons">
              <button type="button" onClick={onPreviousPage} disabled={documentState.currentPage === 1}>‹ 이전</button>
              <button type="button" onClick={onNextPage} disabled={documentState.currentPage === documentState.totalPages}>다음 ›</button>
            </div>
          </section>
          <section className="navigator-analysis-control" aria-labelledby="analysis-control-title">
            <details>
              <summary id="analysis-control-title">자동분석{analysisCandidateCount > 0 ? ` · ${analysisCandidateCount}개` : ''}</summary>
              <div className="navigator-analysis-body">
                <div className="navigator-content-tabs" role="tablist" aria-label="분석 범위 기준">
                  <button type="button" role="tab" aria-selected="true">현재 페이지</button>
                  <button type="button" role="tab" aria-selected="false" disabled title="단원 정보 연동 후 사용할 수 있습니다.">현재 단원</button>
                </div>
                {analysisCandidateCount > 0 && <button type="button" onClick={onOpenAnalysisReview}>후보 검수</button>}
                <select aria-label="자동 분석 범위" value={analysisScope} disabled={analysisProgress.running} onChange={(event) => onAnalysisScopeChange(event.target.value as AnalysisScope)}>
                  <option value="page">현재 페이지</option>
                  <option value="document">전체 문서</option>
                </select>
                {analysisProgress.running ? (
                  <div className="analysis-progress" role="status">
                    <span>p.{analysisProgress.currentPage} · {analysisProgress.completedPages}/{analysisProgress.totalPages}</span>
                    <progress value={analysisProgress.completedPages} max={analysisProgress.totalPages} />
                    <button type="button" onClick={onCancelAnalysis}>중지</button>
                  </div>
                ) : <button type="button" className="analysis-start-button" onClick={onAnalyze}>분석 시작</button>}
                {analysisNotice && <p className="analysis-notice" role="status">{analysisNotice}</p>}
              </div>
            </details>
          </section>
          <section className="navigator-content-blocks" aria-labelledby="content-list-title">
            <div className="navigator-content-heading">
              <p className="navigator-section-label" id="content-list-title">p.{documentState.currentPage} 콘텐츠</p>
              <span>{currentPageBlocks.length}개</span>
            </div>
            {currentPageBlocks.length > 0
              ? <ul className="problem-list">{currentPageBlocks.map(renderBlock)}</ul>
              : <p className="problem-list-empty">영역 선택 도구로 콘텐츠를 추가할 수 있습니다.</p>}
            {otherPageGroups.map((group) => (
              <div className="other-content-group" key={group.page}>
                <p className="other-problems-label">p.{group.page} · {group.blocks.length}개</p>
                <ul className="problem-list problem-list--other">{group.blocks.map(renderBlock)}</ul>
              </div>
            ))}
          </section>
          <div className="navigator-file-action">
            <PdfFileButton label="다른 PDF 열기" onFileSelected={onFileSelected} />
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
