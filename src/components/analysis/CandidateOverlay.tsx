import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CONTENT_TYPE_LABELS } from '../../types/content'
import type { AnalysisCandidate } from '../../types/analysis'
import type { SourceRegion } from '../../types/content'

interface CandidateOverlayProps {
  candidates: AnalysisCandidate[]
  activeCandidateId: string | null
  editingCandidateId: string | null
  onRegionChange: (candidateId: string, region: SourceRegion) => void
  onCancelRegionEdit: () => void
}

interface Position { x: number; y: number }

function clamp(value: number) { return Math.min(1, Math.max(0, value)) }
function regionStyle(region: SourceRegion) {
  return { left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }
}

export function CandidateOverlay({ candidates, activeCandidateId, editingCandidateId, onRegionChange, onCancelRegionEdit }: CandidateOverlayProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<Position | null>(null)
  const pointerRef = useRef<number | null>(null)
  const [draft, setDraft] = useState<SourceRegion | null>(null)

  useEffect(() => {
    if (!editingCandidateId) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRegionEdit()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingCandidateId, onCancelRegionEdit])

  const position = (event: ReactPointerEvent<HTMLDivElement>): Position => {
    const bounds = surfaceRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0 }
    return { x: clamp((event.clientX - bounds.left) / bounds.width), y: clamp((event.clientY - bounds.top) / bounds.height) }
  }
  const makeRegion = (start: Position, end: Position): SourceRegion => ({
    x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y),
  })

  const finish = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (pointerRef.current !== event.pointerId || !editingCandidateId) return
    const region = startRef.current ? makeRegion(startRef.current, position(event)) : null
    pointerRef.current = null
    startRef.current = null
    setDraft(null)
    if (!cancelled && region && region.width >= 0.02 && region.height >= 0.02) onRegionChange(editingCandidateId, region)
  }

  return (
    <div className="candidate-overlay-layer">
      {candidates.filter((candidate) => candidate.status !== 'accepted').map((candidate) => (
        <div
          key={candidate.id}
          className={`candidate-region-outline${candidate.id === activeCandidateId ? ' is-active' : ''}${candidate.status === 'rejected' ? ' is-rejected' : ''}`}
          style={regionStyle(candidate.sourceRegion)}
          aria-hidden="true"
        >
          <span>{CONTENT_TYPE_LABELS[candidate.type]} · {candidate.suggestedTitle}</span>
        </div>
      ))}
      {draft && <div className="candidate-region-draft" style={regionStyle(draft)} aria-hidden="true" />}
      {editingCandidateId && (
        <div
          ref={surfaceRef}
          className="candidate-region-edit-surface"
          aria-label="후보 영역 다시 지정"
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            pointerRef.current = event.pointerId
            const start = position(event)
            startRef.current = start
            setDraft({ x: start.x, y: start.y, width: 0, height: 0 })
          }}
          onPointerMove={(event) => {
            if (pointerRef.current !== event.pointerId || !startRef.current) return
            setDraft(makeRegion(startRef.current, position(event)))
          }}
          onPointerUp={(event) => finish(event, false)}
          onPointerCancel={(event) => finish(event, true)}
        />
      )}
      {editingCandidateId && <div className="candidate-edit-guide">새 영역을 드래그해 지정하세요. · Esc 취소</div>}
    </div>
  )
}
