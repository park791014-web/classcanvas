import { useEffect, useMemo, useState } from 'react'
import { ContentBlockEditor } from '../content/ContentBlockEditor'
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_OPTIONS } from '../../types/content'
import type { AnalysisCandidate } from '../../types/analysis'
import type { ContentType } from '../../types/content'

interface AnalysisReviewPanelProps {
  candidates: AnalysisCandidate[]
  totalPages: number
  activeCandidateId: string | null
  editingRegionCandidateId: string | null
  onSelect: (candidate: AnalysisCandidate) => void
  onUpdate: (candidateId: string, changes: Partial<AnalysisCandidate>) => void
  onAccept: (candidateId: string) => void
  onAcceptMany: (candidateIds: string[]) => void
  onReject: (candidateId: string) => void
  onEditRegion: (candidateId: string | null) => void
  onClear: () => void
  onClose: () => void
}

function confidenceLabel(value?: number) {
  if ((value ?? 0) >= 0.86) return '높음'
  if ((value ?? 0) >= 0.72) return '보통'
  return '낮음'
}

export function AnalysisReviewPanel({
  candidates, totalPages, activeCandidateId, editingRegionCandidateId, onSelect, onUpdate, onAccept, onAcceptMany,
  onReject, onEditRegion, onClear, onClose,
}: AnalysisReviewPanelProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const ordered = useMemo(() => [...candidates].sort((a, b) => a.sourcePage - b.sourcePage || a.sourceRegion.y - b.sourceRegion.y), [candidates])
  const pending = ordered.filter((candidate) => candidate.status === 'pending')
  const groups = useMemo(() => {
    const result = new Map<number, AnalysisCandidate[]>()
    ordered.forEach((candidate) => result.set(candidate.sourcePage, [...(result.get(candidate.sourcePage) ?? []), candidate]))
    return [...result.entries()]
  }, [ordered])
  const counts = CONTENT_TYPE_OPTIONS.map((option) => ({
    ...option,
    count: pending.filter((candidate) => candidate.type === option.value).length,
  })).filter((item) => item.count > 0)

  useEffect(() => {
    setChecked((current) => new Set([...current].filter((id) => pending.some((candidate) => candidate.id === id))))
  }, [candidates])

  const updateType = (candidate: AnalysisCandidate, type: ContentType) => {
    const oldLabel = CONTENT_TYPE_LABELS[candidate.type]
    const nextTitle = candidate.suggestedTitle.startsWith(oldLabel)
      ? candidate.suggestedTitle.replace(oldLabel, CONTENT_TYPE_LABELS[type])
      : candidate.suggestedTitle
    onUpdate(candidate.id, { type, suggestedTitle: nextTitle })
  }

  return (
    <aside className="analysis-review-panel" aria-labelledby="analysis-review-title">
      <header>
        <div>
          <p>교사 검수</p>
          <h2 id="analysis-review-title">자동 분석 결과</h2>
        </div>
        <button type="button" aria-label="자동 분석 결과 닫기" onClick={onClose}>닫기</button>
      </header>
      <div className="analysis-review-summary">
        <div className="analysis-type-counts">
          {counts.map((item) => <span key={item.value}>{item.label} <strong>{item.count}</strong></span>)}
        </div>
        <p>검수 대기 {pending.length}개 · 전체 후보 {candidates.length}개</p>
        <div className="analysis-bulk-actions">
          <button type="button" onClick={() => setChecked(new Set(pending.map((candidate) => candidate.id)))} disabled={pending.length === 0}>대기 항목 선택</button>
          <button type="button" className="primary-action" onClick={() => onAcceptMany([...checked])} disabled={checked.size === 0}>선택 항목 확정</button>
          <button type="button" onClick={onClear} disabled={candidates.every((candidate) => candidate.status === 'accepted')}>분석 결과 지우기</button>
        </div>
      </div>
      <div className="analysis-candidate-list">
        {groups.map(([page, pageCandidates]) => (
          <section key={page} aria-labelledby={`analysis-page-${page}`}>
            <h3 id={`analysis-page-${page}`}>PAGE {page}</h3>
            <ul>
              {pageCandidates.map((candidate) => {
                const active = candidate.id === activeCandidateId
                return (
                  <li key={candidate.id} className={`analysis-candidate-item is-${candidate.status}${active ? ' is-active' : ''}`}>
                    <div className="analysis-candidate-row">
                      <input
                        type="checkbox"
                        checked={checked.has(candidate.id)}
                        disabled={candidate.status !== 'pending'}
                        aria-label={`${candidate.suggestedTitle} 일괄 확정 선택`}
                        onChange={(event) => setChecked((current) => {
                          const next = new Set(current)
                          if (event.target.checked) next.add(candidate.id)
                          else next.delete(candidate.id)
                          return next
                        })}
                      />
                      <button type="button" className="analysis-candidate-open" onClick={() => onSelect(candidate)} title={candidate.suggestedTitle}>
                        <span className={`content-type-badge content-type-badge--${candidate.type}`}>{CONTENT_TYPE_LABELS[candidate.type]}</span>
                        <strong>{candidate.suggestedTitle}</strong>
                        <small>{candidate.status === 'accepted' ? '확정됨' : candidate.status === 'rejected' ? '제외됨' : confidenceLabel(candidate.ruleConfidence)}</small>
                      </button>
                    </div>
                    {active && candidate.status !== 'accepted' && (
                      <div className="analysis-candidate-editor">
                        <ContentBlockEditor
                          compact
                          type={candidate.type}
                          title={candidate.suggestedTitle}
                          onTypeChange={(type) => updateType(candidate, type)}
                          onTitleChange={(suggestedTitle) => onUpdate(candidate.id, { suggestedTitle })}
                        />
                        <label className="analysis-page-field">
                          <span>출처 페이지</span>
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={candidate.sourcePage}
                            onChange={(event) => onUpdate(candidate.id, { sourcePage: Math.min(totalPages, Math.max(1, Number(event.target.value))) })}
                          />
                        </label>
                        <div className="analysis-candidate-actions">
                          <button type="button" className={editingRegionCandidateId === candidate.id ? 'is-active' : ''} onClick={() => onEditRegion(editingRegionCandidateId === candidate.id ? null : candidate.id)}>다시 영역 지정</button>
                          {candidate.status === 'rejected' ? (
                            <button type="button" onClick={() => onUpdate(candidate.id, { status: 'pending' })}>검수로 복원</button>
                          ) : (
                            <>
                              <button type="button" onClick={() => onReject(candidate.id)}>제외</button>
                              <button type="button" className="primary-action" disabled={!candidate.suggestedTitle.trim()} onClick={() => onAccept(candidate.id)}>확정</button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        {candidates.length === 0 && <p className="analysis-empty">자동 분석을 실행하면 이곳에서 후보를 검수할 수 있습니다.</p>}
      </div>
    </aside>
  )
}
