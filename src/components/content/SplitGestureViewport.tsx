import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { MAX_ZOOM_SCALE, MIN_MANUAL_ZOOM_SCALE } from '../../constants/zoom'
import type { AnnotationTool } from '../../types/annotation'
import type { ContentWorkspaceState } from '../../types/content'
import { usePointerInteractionReset } from '../../hooks/usePointerInteractionReset'

interface Props {
  children: ReactNode
  activeTool: AnnotationTool
  state: ContentWorkspaceState
  onStateChange: (changes: Partial<ContentWorkspaceState>) => void
}

type TouchPoint = { x: number; y: number }
const distance = (points: TouchPoint[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
const center = (points: TouchPoint[]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 })
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function SplitGestureViewport({ children, activeTool, state, onStateChange }: Props) {
  const pointers = useRef(new Map<number, TouchPoint>())
  const gesture = useRef<{ distance: number; center: TouchPoint; scale: number; x: number; y: number } | null>(null)
  const reset = useCallback(() => { pointers.current.clear(); gesture.current = null }, [])
  usePointerInteractionReset(reset)

  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.current.size === 2) {
        const points = [...pointers.current.values()]
        gesture.current = { distance: Math.max(1, distance(points)), center: center(points), scale: state.splitScale, x: state.splitOffsetX, y: state.splitOffsetY }
        window.dispatchEvent(new Event('lessoncanvas:cancel-drawing'))
        event.preventDefault()
        event.stopPropagation()
      }
      return
    }
    void activeTool
  }

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' && pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.current.size === 2 && gesture.current) {
        event.preventDefault(); event.stopPropagation()
        const points = [...pointers.current.values()], currentCenter = center(points), initial = gesture.current
        const nextScale = clamp(initial.scale * distance(points) / initial.distance, MIN_MANUAL_ZOOM_SCALE, MAX_ZOOM_SCALE)
        const scaleRatio = nextScale / initial.scale
        onStateChange({
          splitScale: nextScale,
          splitOffsetX: currentCenter.x - initial.center.x + initial.x * scaleRatio,
          splitOffsetY: currentCenter.y - initial.center.y + initial.y * scaleRatio,
        })
      }
      return
    }
  }

  const finish = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) gesture.current = null
  }

  return <div className="split-gesture-viewport" data-split-scale={state.splitScale}
    onPointerDownCapture={down} onPointerMoveCapture={move} onPointerUpCapture={finish} onPointerCancelCapture={finish}>
    <div className="split-gesture-content" style={{ transform: `translate3d(${state.splitOffsetX}px, ${state.splitOffsetY}px, 0) scale(${state.splitScale})` }}>{children}</div>
  </div>
}
