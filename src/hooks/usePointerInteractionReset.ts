import { useEffect, useRef } from 'react'

export function safelyReleasePointerCapture(element: Element | null, pointerId: number | null) {
  if (!(element instanceof HTMLElement) || pointerId === null) return
  try {
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId)
  } catch {
    // The browser may already have released capture during blur/cancel.
  }
}

export function usePointerInteractionReset(reset: () => void) {
  const resetRef = useRef(reset)
  resetRef.current = reset

  useEffect(() => {
    const handleBlur = () => resetRef.current()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') resetRef.current()
    }
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
