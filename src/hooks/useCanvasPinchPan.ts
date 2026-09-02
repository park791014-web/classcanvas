import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { MAX_ZOOM_SCALE, MIN_MANUAL_ZOOM_SCALE } from '../constants/zoom'
import { usePointerInteractionReset } from './usePointerInteractionReset'

interface CanvasTransform { canvasScale: number; canvasOffsetX: number; canvasOffsetY: number }
type Point = { x: number; y: number }
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const clamp = (value: number) => Math.min(MAX_ZOOM_SCALE, Math.max(MIN_MANUAL_ZOOM_SCALE, value))

export function useCanvasPinchPan(state: CanvasTransform, onChange: (changes: Partial<CanvasTransform>) => void) {
  const pointers = useRef(new Map<number, Point>())
  const start = useRef<{ distance: number; center: Point; scale: number; x: number; y: number } | null>(null)
  const reset = useCallback(() => { pointers.current.clear(); start.current = null }, [])
  usePointerInteractionReset(reset)

  return {
    onPointerDownCapture: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'touch') return
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.current.size !== 2) return
      const [first, second] = [...pointers.current.values()]
      start.current = { distance: Math.max(1, distance(first, second)), center: midpoint(first, second), scale: state.canvasScale, x: state.canvasOffsetX, y: state.canvasOffsetY }
      window.dispatchEvent(new Event('lessoncanvas:cancel-drawing'))
      event.preventDefault(); event.stopPropagation()
    },
    onPointerMoveCapture: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'touch' || !pointers.current.has(event.pointerId)) return
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.current.size !== 2 || !start.current) return
      const [first, second] = [...pointers.current.values()], currentCenter = midpoint(first, second), initial = start.current
      const nextScale = clamp(initial.scale * distance(first, second) / initial.distance)
      const ratio = nextScale / initial.scale
      onChange({
        canvasScale: nextScale,
        canvasOffsetX: currentCenter.x - initial.center.x + initial.x * ratio,
        canvasOffsetY: currentCenter.y - initial.center.y + initial.y * ratio,
      })
      event.preventDefault(); event.stopPropagation()
    },
    onPointerUpCapture: (event: ReactPointerEvent<HTMLDivElement>) => { pointers.current.delete(event.pointerId); if (pointers.current.size < 2) start.current = null },
    onPointerCancelCapture: (event: ReactPointerEvent<HTMLDivElement>) => { pointers.current.delete(event.pointerId); if (pointers.current.size < 2) start.current = null },
  }
}
