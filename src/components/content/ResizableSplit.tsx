import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

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

  const updateFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = containerRef.current?.getBoundingClientRect()
    if (!bounds) return
    const next = orientation === 'vertical'
      ? (event.clientY - bounds.top) / bounds.height
      : (event.clientX - bounds.left) / bounds.width
    onRatioChange(clampRatio(next))
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    activePointerRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromPointer(event)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    event.preventDefault()
    updateFromPointer(event)
  }

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    activePointerRef.current = null
  }

  return (
    <div
      ref={containerRef}
      className={`resizable-content-split resizable-content-split--${orientation}`}
      style={{ '--source-ratio': ratio } as CSSProperties}
    >
      <div className="content-split-pane content-split-source">
        {source}
        <div className="content-split-ratio-controls" aria-label="원문 영역 비율 미세 조절">
          <button type="button" aria-label="원문 영역 5% 늘리기" disabled={ratio >= MAX_SOURCE_RATIO}
            onPointerDown={(event) => { event.preventDefault(); event.stopPropagation() }}
            onClick={(event) => { event.stopPropagation(); onRatioChange(clampRatio(ratio + BUTTON_RATIO_STEP)) }}>＋</button>
          <button type="button" aria-label="원문 영역 5% 줄이기" disabled={ratio <= MIN_SOURCE_RATIO}
            onPointerDown={(event) => { event.preventDefault(); event.stopPropagation() }}
            onClick={(event) => { event.stopPropagation(); onRatioChange(clampRatio(ratio - BUTTON_RATIO_STEP)) }}>−</button>
        </div>
      </div>
      <div
        className="content-split-divider"
        role="separator"
        aria-label={label}
        aria-orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'}
        aria-valuemin={20}
        aria-valuemax={65}
        aria-valuenow={Math.round(ratio * 100)}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onKeyDown={(event) => {
          const delta = 0.03
          if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); onRatioChange(clampRatio(ratio - delta)) }
          if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); onRatioChange(clampRatio(ratio + delta)) }
        }}
      />
      <div className="content-split-pane content-split-writing">{writing}</div>
    </div>
  )
}
