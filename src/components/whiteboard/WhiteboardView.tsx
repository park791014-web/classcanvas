import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { TiledAnnotationCanvas } from '../annotation/TiledAnnotationCanvas'
import { CLASSROOM_STROKE_WIDTH_REFERENCE } from '../annotation/annotationSizing'
import { useElementSize } from '../../hooks/useElementSize'
import type { AnnotationSettings, AnnotationStroke, AnnotationTool } from '../../types/annotation'
import type { ContentWorkspaceState } from '../../types/content'

interface WhiteboardViewProps {
  page: number
  pageCount: number
  strokes: AnnotationStroke[]
  activeTool: AnnotationTool
  settings: AnnotationSettings
  isVisible: boolean
  workspaceState: ContentWorkspaceState
  onWorkspaceStateChange: (changes: Partial<ContentWorkspaceState>) => void
  onAddStroke: (stroke: AnnotationStroke) => void
  onEraseStrokes: (strokeIds: string[]) => void
  onPreviousPage: () => void
  onNextPage: () => void
  onAddPage: () => void
  onReturnToTextbook: () => void
}

const WORLD_WIDTH = 6000
const WORLD_HEIGHT = 4000
const MIN_SCALE = 0.5
const MAX_SCALE = 2.5
const SCALE_STEP = 0.25

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function WhiteboardView({
  page,
  pageCount,
  strokes,
  activeTool,
  settings,
  isVisible,
  workspaceState,
  onWorkspaceStateChange,
  onAddStroke,
  onEraseStrokes,
  onPreviousPage,
  onNextPage,
  onAddPage,
  onReturnToTextbook,
}: WhiteboardViewProps) {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null)
  const viewportSize = useElementSize(viewport)
  const panPointerRef = useRef<number | null>(null)
  const panStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)

  const clampOffset = useCallback((offsetX: number, offsetY: number) => {
    const scaledWidth = WORLD_WIDTH * workspaceState.canvasScale
    const scaledHeight = WORLD_HEIGHT * workspaceState.canvasScale
    const horizontalLimit = Math.max(0, (scaledWidth - viewportSize.width) / 2 + 120)
    return {
      canvasOffsetX: clamp(offsetX, -horizontalLimit, horizontalLimit),
      canvasOffsetY: clamp(offsetY, viewportSize.height - scaledHeight - 120, 120),
    }
  }, [viewportSize.height, viewportSize.width, workspaceState.canvasScale])

  const setScale = (scale: number) => {
    onWorkspaceStateChange({ canvasScale: clamp(scale, MIN_SCALE, MAX_SCALE) })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'none' && event.button !== 1) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    panPointerRef.current = event.pointerId
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: workspaceState.canvasOffsetX,
      offsetY: workspaceState.canvasOffsetY,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = panStartRef.current
    if (!start || panPointerRef.current !== event.pointerId) return
    event.preventDefault()
    onWorkspaceStateChange(clampOffset(
      start.offsetX + event.clientX - start.x,
      start.offsetY + event.clientY - start.y,
    ))
  }

  const finishPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panPointerRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    panPointerRef.current = null
    panStartRef.current = null
  }

  return (
    <section className="lesson-workspace whiteboard-view" aria-label={`빈 칠판 ${page}`}>
      <header className="whiteboard-header">
        <div className="whiteboard-primary-controls">
          <button type="button" onClick={onReturnToTextbook}>교과서로</button>
          <button type="button" onClick={() => onWorkspaceStateChange({ canvasOffsetX: 0, canvasOffsetY: 0 })}>중앙 이동</button>
        </div>
        <nav className="whiteboard-page-controls" aria-label="빈 칠판 페이지 이동">
          <button type="button" aria-label="이전 빈 칠판" disabled={page === 1} onClick={onPreviousPage}>‹</button>
          <strong>빈 칠판 {page}</strong>
          <button type="button" aria-label="다음 빈 칠판" disabled={page === pageCount} onClick={onNextPage}>›</button>
          <button type="button" aria-label="새 빈 칠판 추가" onClick={onAddPage}>＋</button>
        </nav>
        <div className="whiteboard-zoom-controls" aria-label="빈 칠판 확대 및 축소">
          <button type="button" aria-label="빈 칠판 축소" disabled={workspaceState.canvasScale <= MIN_SCALE}
            onClick={() => setScale(workspaceState.canvasScale - SCALE_STEP)}>−</button>
          <output aria-label="빈 칠판 확대 비율">{Math.round(workspaceState.canvasScale * 100)}%</output>
          <button type="button" aria-label="빈 칠판 확대" disabled={workspaceState.canvasScale >= MAX_SCALE}
            onClick={() => setScale(workspaceState.canvasScale + SCALE_STEP)}>＋</button>
        </div>
      </header>
      <div
        ref={setViewport}
        className={`whiteboard-viewport${activeTool === 'none' ? ' is-pannable' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPan}
        onPointerCancel={finishPan}
      >
        <div className="whiteboard-world-anchor">
          <div
            className="whiteboard-logical-world"
            style={{
              left: -WORLD_WIDTH / 2,
              width: WORLD_WIDTH,
              height: WORLD_HEIGHT,
              transform: `translate3d(${workspaceState.canvasOffsetX}px, ${workspaceState.canvasOffsetY}px, 0) scale(${workspaceState.canvasScale})`,
            }}
            data-canvas-offset={`${workspaceState.canvasOffsetX},${workspaceState.canvasOffsetY}`}
            data-canvas-scale={workspaceState.canvasScale}
          >
            <TiledAnnotationCanvas
              worldWidth={WORLD_WIDTH}
              worldHeight={WORLD_HEIGHT}
              viewportWidth={viewportSize.width}
              viewportHeight={viewportSize.height}
              scale={workspaceState.canvasScale}
              offsetX={workspaceState.canvasOffsetX}
              offsetY={workspaceState.canvasOffsetY}
              strokes={strokes}
              activeTool={activeTool}
              settings={settings}
              isVisible={isVisible}
              onAddStroke={onAddStroke}
              onEraseStrokes={onEraseStrokes}
              ariaLabel={`빈 칠판 ${page} 판서 영역`}
              coordinateMode="normalized"
              strokeWidthReference={CLASSROOM_STROKE_WIDTH_REFERENCE}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
