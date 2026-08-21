import { useEffect, useState } from 'react'

interface ElementSize {
  width: number
  height: number
}

export function useElementSize<T extends HTMLElement>(element: T | null) {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    if (!element) {
      return
    }

    const updateSize = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)

    return () => observer.disconnect()
  }, [element])

  return size
}
