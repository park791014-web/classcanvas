import { useCallback, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { safelyReleasePointerCapture, usePointerInteractionReset } from '../../hooks/usePointerInteractionReset'

interface ResizableSplitProps {
  orientation: 'vertical' | 'horizontal'
  ratio: number
  onRatioChange: (ratio: number) => void
  source: ReactNode
  writing: ReactNode
  label: string
}

const MIN_SOURCE_RATIO = 0.2
const MAX_SOURCE_RATIO = 0.65
const BUTTON_RATIO_STEP = 0.05

function clampRatio(value: number) {
  return Math.min(MAX_SOURCE_RATIO, Math.max(MIN_SOURCE_RATIO, value))
}

export function ResizableSplit({ orientation, ratio, onRatioChange, source, writing, label }: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activePointerRef = useRef<number | null>(null)
  const captureTargetRef = useRef<HTMLButtonElement | null>(null)
  const dragStartRef = useRef<{ coordinate: number; ratio: number } | null>(null)

  const updateFromPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const bounds = containerRef.current?.getBoundingClientRect()
    const start = dragStartRef.current
    if (!bounds || !start) return
    const coordinate = orientation === 'vertical' ? event.clientY : event.clientX
    const dimension = orientation === 'vertical' ? bounds.height : bounds.width
    const next = start.ratio + (coordinate - start.coordinate) / Math.max(1, dimension)
    onRatioChange(clampRatio(next))
  }

  const resetPointerInteractionState = useCallback(() => {
    const pointerId = activePointerRef.current
    const captureTarget = captureTargetRef.current
    activePointerRef.current = null
    captureTargetRef.current = null
    dragStartRef.current = null
    safelyReleasePointerCapture(captureTarget, pointerId)
  }, [])

  usePointerInteractionReset(resetPointerInteractionState)

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    resetPointerInteractionState()
    activePointerRef.current = event.pointerId
    captureTargetRef.current = event.currentTarget
    dragStartRef.current = { coordinate: orientation === 'vertical' ? event.clientY : event.clientX, ratio }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    event.preventDefault()
    updateFromPointer(event)
  }

  const finishPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    resetPointerInteractionState()
  }

  return (
    <div
      ref={containerRef}
      className={`resizable-content-split resizable-content-split--${orientation}`}
      style={{ '--source-ratio': ratio } as CSSProperties}
    >
      <div className="content-split-pane content-split-source">{source}</div>
      <div className={`content-split-controls content-split-controls--${orientation}`} aria-label="원문 영역 크기 조절">
        <div className="content-split-ratio-controls" aria-label="원문 영역 비율 미세 조절">
          <button type="button" aria-label="원문 영역 5% 늘리기" disabled={ratio >= MAX_SOURCE_RATIO}
            onPointerDown={(event) => { event.preventDefault(); event.stopPropagation() }}
            onClick={(event) => { event.stopPropagation(); onRatioChange(clampRatio(ratio + BUTTON_RATIO_STEP)) }}>＋</button>
          <button type="button" aria-label="원문 영역 5% 줄이기" disabled={ratio <= MIN_SOURCE_RATIO}
            onPointerDown={(event) => { event.preventDefault(); event.stopPropagation() }}
            onClick={(event) => { event.stopPropagation(); onRatioChange(clampRatio(ratio - BUTTON_RATIO_STEP)) }}>−</button>
        </div>
        <button
          type="button"
          className="content-split-drag-handle"
          role="separator"
          aria-label={label}
          aria-orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'}
          aria-valuemin={20}
          aria-valuemax={65}
          aria-valuenow={Math.round(ratio * 100)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={finishPointer}
          onLostPointerCapture={finishPointer}
          onKeyDown={(event) => {
            const delta = 0.03
            if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); onRatioChange(clampRatio(ratio - delta)) }
            if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); onRatioChange(clampRatio(ratio + delta)) }
          }}
        >
          <span aria-hidden="true">{orientation === 'vertical' ? '══' : '║'}</span>
        </button>
      </div>
      <div
        className="content-split-divider"
        aria-hidden="true"
      />
      <div className="content-split-pane content-split-writing">{writing}</div>
    </div>
  )
}
