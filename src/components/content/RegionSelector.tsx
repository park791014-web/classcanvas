import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { ProblemContentBlock, SourceRegion } from '../../types/content'

interface RegionSelectorProps {
  active: boolean
  defaultTitle: string
  savedProblems: ProblemContentBlock[]
  onSave: (region: SourceRegion, title: string) => void
}

interface NormalizedPosition {
  x: number
  y: number
}

const MIN_SELECTION_SIZE = 28

function clamp(value: number) {
  return Math.min(1, Math.max(0, value))
}

function toRegion(start: NormalizedPosition, end: NormalizedPosition): SourceRegion {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

function regionStyle(region: SourceRegion) {
  return {
    left: `${region.x * 100}%`,
    top: `${region.y * 100}%`,
    width: `${region.width * 100}%`,
    height: `${region.height * 100}%`,
  }
}

export function RegionSelector({ active, defaultTitle, savedProblems, onSave }: RegionSelectorProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const pointerIdRef = useRef<number | null>(null)
  const startRef = useRef<NormalizedPosition | null>(null)
  const [draftRegion, setDraftRegion] = useState<SourceRegion | null>(null)
  const [draftTitle, setDraftTitle] = useState(defaultTitle)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setDraftTitle(defaultTitle)
  }, [defaultTitle])

  useEffect(() => {
    if (active) return
    pointerIdRef.current = null
    startRef.current = null
    setDraftRegion(null)
    setMessage(null)
  }, [active])

  const toPosition = (event: ReactPointerEvent<HTMLDivElement>): NormalizedPosition => {
    const bounds = surfaceRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0 }
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!active || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerIdRef.current = event.pointerId
    const start = toPosition(event)
    startRef.current = start
    setDraftRegion({ x: start.x, y: start.y, width: 0, height: 0 })
    setMessage(null)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId || !startRef.current) return
    event.preventDefault()
    setDraftRegion(toRegion(startRef.current, toPosition(event)))
  }

  const finishSelection = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (pointerIdRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const finalRegion = startRef.current ? toRegion(startRef.current, toPosition(event)) : null
    pointerIdRef.current = null
    startRef.current = null

    if (cancelled || !finalRegion) {
      setDraftRegion(null)
      return
    }

    if (finalRegion.width * bounds.width < MIN_SELECTION_SIZE || finalRegion.height * bounds.height < MIN_SELECTION_SIZE) {
      setDraftRegion(null)
      setMessage('선택 영역이 너무 작습니다. 문제 전체가 들어가도록 다시 드래그해 주세요.')
      return
    }

    setDraftRegion(finalRegion)
    setDraftTitle(defaultTitle)
  }

  const cancelDraft = () => {
    setDraftRegion(null)
    setDraftTitle(defaultTitle)
    setMessage(null)
  }

  const saveDraft = () => {
    if (!draftRegion) return
    onSave(draftRegion, draftTitle)
    cancelDraft()
  }

  return (
    <div className="region-selector-layer" data-selection-active={active}>
      {savedProblems.map((problem) => (
        <div
          key={problem.id}
          className="saved-region-outline"
          style={regionStyle(problem.sourceRegion)}
          aria-hidden="true"
        >
          <span>{problem.title}</span>
        </div>
      ))}

      {active && (
        <div
          ref={surfaceRef}
          className="region-selection-surface"
          aria-label="문제 영역 선택"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishSelection(event, false)}
          onPointerCancel={(event) => finishSelection(event, true)}
        />
      )}

      {draftRegion && <div className="draft-region-outline" style={regionStyle(draftRegion)} aria-hidden="true" />}

      {active && draftRegion && draftRegion.width > 0 && draftRegion.height > 0 && pointerIdRef.current === null && (
        <form className="region-save-panel" onSubmit={(event) => { event.preventDefault(); saveDraft() }}>
          <strong>선택 영역 저장</strong>
          <label htmlFor="problem-title-input">문제 이름</label>
          <input
            id="problem-title-input"
            value={draftTitle}
            maxLength={40}
            autoFocus
            onChange={(event) => setDraftTitle(event.target.value)}
          />
          <div>
            <button type="button" onClick={cancelDraft}>취소</button>
            <button type="submit" className="primary-action" disabled={!draftTitle.trim()}>저장</button>
          </div>
        </form>
      )}

      {active && message && <div className="region-selection-message" role="status">{message}</div>}
      {active && !draftRegion && !message && <div className="region-selection-guide">문제 전체를 드래그해 선택하세요.</div>}
    </div>
  )
}
