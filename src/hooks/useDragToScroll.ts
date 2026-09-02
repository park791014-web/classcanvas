import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { safelyReleasePointerCapture, usePointerInteractionReset } from './usePointerInteractionReset'

export function useDragToScroll(enabled: boolean) {
  const pointerRef = useRef<number | null>(null)
  const targetRef = useRef<HTMLElement | null>(null)
  const startRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)

  const reset = useCallback(() => {
    safelyReleasePointerCapture(targetRef.current, pointerRef.current)
    pointerRef.current = null
    targetRef.current = null
    startRef.current = null
  }, [])
  usePointerInteractionReset(reset)

  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || event.button !== 0) return
      event.preventDefault()
      reset()
      pointerRef.current = event.pointerId
      targetRef.current = event.currentTarget
      startRef.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const start = startRef.current
      if (!start || pointerRef.current !== event.pointerId) return
      event.preventDefault()
      event.currentTarget.scrollLeft = start.left - (event.clientX - start.x)
      event.currentTarget.scrollTop = start.top - (event.clientY - start.y)
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => { if (pointerRef.current === event.pointerId) reset() },
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => { if (pointerRef.current === event.pointerId) reset() },
    onLostPointerCapture: (event: ReactPointerEvent<HTMLElement>) => { if (pointerRef.current === event.pointerId) reset() },
  }
}
