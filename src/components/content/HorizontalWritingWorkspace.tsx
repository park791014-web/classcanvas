import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type UIEvent } from 'react'
import { TiledAnnotationCanvas } from '../annotation/TiledAnnotationCanvas'
import { CLASSROOM_STROKE_WIDTH_REFERENCE } from '../annotation/annotationSizing'
import { useElementSize } from '../../hooks/useElementSize'
import type { AnnotationCoordinateMode } from '../../types/annotation'
import type { ContentAnnotationSurface } from './ContentFocusView'
import { safelyReleasePointerCapture, usePointerInteractionReset } from '../../hooks/usePointerInteractionReset'

interface HorizontalWritingWorkspaceProps {
  title: string
  annotation: ContentAnnotationSurface
  coordinateMode: AnnotationCoordinateMode
  workspaceHeight: number
  active: boolean
  onActivate: () => void
  canExpand?: boolean
  onExpand?: () => void
}

const MIN_HORIZONTAL_WORLD_WIDTH = 4200
const MIN_HORIZONTAL_WORLD_HEIGHT = 1800

export function HorizontalWritingWorkspace({
  title,
  annotation,
  coordinateMode,
  workspaceHeight,
  active,
  onActivate,
  canExpand,
  onExpand,
}: HorizontalWritingWorkspaceProps) {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null)
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 })
  const panPointerRef = useRef<number | null>(null)
  const panStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const captureTargetRef = useRef<HTMLDivElement | null>(null)
  const viewportSize = useElementSize(viewport)
  const worldWidth = Math.max(MIN_HORIZONTAL_WORLD_WIDTH, viewportSize.width * 5)
  const worldHeight = Math.max(MIN_HORIZONTAL_WORLD_HEIGHT, workspaceHeight, viewportSize.height * 3)
  const offsetX = (worldWidth - viewportSize.width) / 2 - scrollPosition.left

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollPosition({ left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop })
  }

  const resetPointerInteractionState = useCallback(() => {
    const pointerId = panPointerRef.current
    const captureTarget = captureTargetRef.current
    panPointerRef.current = null
    panStartRef.current = null
    captureTargetRef.current = null
    safelyReleasePointerCapture(captureTarget, pointerId)
  }, [])

  usePointerInteractionReset(resetPointerInteractionState)

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (annotation.activeTool !== 'none' || event.button !== 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const verticalScrollbarWidth = event.currentTarget.offsetWidth - event.currentTarget.clientWidth
    const horizontalScrollbarHeight = event.currentTarget.offsetHeight - event.currentTarget.clientHeight
    if ((verticalScrollbarWidth > 0 && event.clientX >= bounds.right - verticalScrollbarWidth)
      || (horizontalScrollbarHeight > 0 && event.clientY >= bounds.bottom - horizontalScrollbarHeight)) return
    event.preventDefault()
    if (panPointerRef.current !== null) resetPointerInteractionState()
    event.currentTarget.setPointerCapture(event.pointerId)
    panPointerRef.current = event.pointerId
    captureTargetRef.current = event.currentTarget
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: event.currentTarget.scrollLeft,
      top: event.currentTarget.scrollTop,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = panStartRef.current
    if (!start || panPointerRef.current !== event.pointerId) return
    event.preventDefault()
    event.currentTarget.scrollLeft = start.left - (event.clientX - start.x)
    event.currentTarget.scrollTop = start.top - (event.clientY - start.y)
  }

  const finishPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panPointerRef.current !== event.pointerId) return
    resetPointerInteractionState()
  }

  return (
    <section className={`horizontal-writing-workspace${active ? ' is-active' : ''}`} aria-label={`${title} 확장 판서 공간`}>
      <div ref={setViewport} className={`horizontal-writing-scroll${annotation.activeTool === 'none' ? ' is-pannable' : ''}`}
        tabIndex={0} onScroll={handleScroll} onPointerDownCapture={handlePointerDown} onPointerMove={handlePointerMove}
        onPointerUp={finishPan} onPointerCancel={finishPan} onLostPointerCapture={finishPan}
        onDoubleClick={(event) => event.preventDefault()}>
        <div
          className="horizontal-writing-world"
          style={{ width: worldWidth, height: worldHeight }}
          data-workspace-width={worldWidth}
          data-workspace-height={worldHeight}
          onPointerDownCapture={onActivate}
        >
          <TiledAnnotationCanvas
            worldWidth={worldWidth}
            worldHeight={worldHeight}
            viewportWidth={viewportSize.width}
            viewportHeight={viewportSize.height}
            scale={1}
            offsetX={offsetX}
            offsetY={-scrollPosition.top}
            strokes={annotation.strokes}
            activeTool={annotation.activeTool}
            settings={annotation.settings}
            isVisible={annotation.isVisible}
            onAddStroke={annotation.onAddStroke}
            onEraseStrokes={annotation.onEraseStrokes}
            ariaLabel={`${title} 좌우형 판서 영역`}
            coordinateMode={coordinateMode}
            strokeWidthReference={CLASSROOM_STROKE_WIDTH_REFERENCE}
          />
          {onExpand && (
            <div className="horizontal-workspace-extension-action">
              <button type="button" disabled={!canExpand} onPointerDown={(event) => event.stopPropagation()} onClick={onExpand}>
                {canExpand ? '+ 판서 공간 추가' : '최대 판서 공간에 도달했습니다.'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
