import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { AnnotationPoint, AnnotationStroke, DrawingTool, StrokeWidthPreset } from '../../types/annotation'
import { safelyReleasePointerCapture, usePointerInteractionReset } from '../../hooks/usePointerInteractionReset'
import { CLASSROOM_STROKE_WIDTH_REFERENCE } from '../annotation/annotationSizing'
import type { ContentAnnotationSurface } from './ContentFocusView'

interface UnifiedSplitAnnotationInputProps {
  orientation: 'vertical' | 'horizontal'
  title: string
  source: ContentAnnotationSurface
  writing: ContentAnnotationSurface
  writingWorldSelector?: string
  onActiveTargetChange: (target: SegmentTarget) => void
}

type SegmentTarget = 'source' | 'writing'

interface ScreenPoint {
  clientX: number
  clientY: number
  pressure: number
}

interface TargetSegment {
  target: SegmentTarget
  points: AnnotationPoint[]
}

const WIDTHS: Record<DrawingTool, Record<StrokeWidthPreset, number>> = {
  pen: { micro: 0.0012, thin: 0.0018, normal: 0.003, thick: 0.0048 },
  highlighter: { micro: 0.007, thin: 0.012, normal: 0.022, thick: 0.034 },
}

function createStrokeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function rectContains(rect: DOMRect, point: ScreenPoint) {
  return point.clientX >= rect.left && point.clientX <= rect.right && point.clientY >= rect.top && point.clientY <= rect.bottom
}

export function UnifiedSplitAnnotationInput({
  orientation,
  title,
  source,
  writing,
  writingWorldSelector,
  onActiveTargetChange,
}: UnifiedSplitAnnotationInputProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const activePointerRef = useRef<number | null>(null)
  const captureTargetRef = useRef<HTMLDivElement | null>(null)
  const screenPointsRef = useRef<ScreenPoint[]>([])
  const toolRef = useRef<DrawingTool | null>(null)
  const [previewPoints, setPreviewPoints] = useState<{ x: number; y: number }[]>([])

  const resetPointerInteractionState = useCallback(() => {
    const pointerId = activePointerRef.current
    const captureTarget = captureTargetRef.current
    activePointerRef.current = null
    captureTargetRef.current = null
    screenPointsRef.current = []
    toolRef.current = null
    setPreviewPoints([])
    safelyReleasePointerCapture(captureTarget, pointerId)
  }, [])

  usePointerInteractionReset(resetPointerInteractionState)

  const getSplitElements = useCallback(() => {
    const split = surfaceRef.current?.closest('.resizable-content-split')
    if (!(split instanceof HTMLElement)) return null
    const sourcePane = split.querySelector<HTMLElement>('.content-split-source')
    const writingPane = split.querySelector<HTMLElement>('.content-split-writing')
    const sourceCrop = split.querySelector<HTMLElement>('.content-crop-stage')
    const writingWorld = split.querySelector<HTMLElement>(writingWorldSelector
      ?? (orientation === 'vertical' ? '.content-notes-surface' : '.horizontal-writing-world'))
    if (!sourcePane || !writingPane || !sourceCrop || !writingWorld) return null
    return { sourcePane, writingPane, sourceCrop, writingWorld }
  }, [orientation, writingWorldSelector])

  const classifyTarget = useCallback((point: ScreenPoint, previous?: SegmentTarget): SegmentTarget => {
    const elements = getSplitElements()
    if (!elements) return previous ?? 'source'
    const sourceBounds = elements.sourcePane.getBoundingClientRect()
    const writingBounds = elements.writingPane.getBoundingClientRect()
    if (rectContains(sourceBounds, point)) return 'source'
    if (rectContains(writingBounds, point)) return 'writing'
    if (previous) return previous
    return orientation === 'vertical'
      ? point.clientY <= (sourceBounds.bottom + writingBounds.top) / 2 ? 'source' : 'writing'
      : point.clientX <= (sourceBounds.right + writingBounds.left) / 2 ? 'source' : 'writing'
  }, [getSplitElements, orientation])

  const mapPoint = useCallback((point: ScreenPoint, target: SegmentTarget): AnnotationPoint | null => {
    const elements = getSplitElements()
    if (!elements) return null
    const targetElement = target === 'source' ? elements.sourceCrop : elements.writingWorld
    const bounds = targetElement.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) return null
    if (target === 'source') {
      return {
        x: (point.clientX - bounds.left) / bounds.width,
        y: (point.clientY - bounds.top) / bounds.height,
        pressure: point.pressure,
      }
    }
    const logicalHeight = Number(targetElement.dataset.workspaceHeight) || bounds.height
    return {
      x: (point.clientX - bounds.left) / bounds.width,
      y: ((point.clientY - bounds.top) / bounds.height) * logicalHeight,
      pressure: point.pressure,
    }
  }, [getSplitElements])

  const buildSegments = useCallback((screenPoints: ScreenPoint[]) => {
    const segments: TargetSegment[] = []
    screenPoints.forEach((screenPoint, index) => {
      const currentSegment = segments.at(-1)
      const target = classifyTarget(screenPoint, currentSegment?.target)
      if (!currentSegment || currentSegment.target !== target) {
        const points: AnnotationPoint[] = []
        const previousScreenPoint = screenPoints[index - 1]
        if (previousScreenPoint) {
          const bridgePoint = mapPoint(previousScreenPoint, target)
          if (bridgePoint) points.push(bridgePoint)
        }
        const mappedPoint = mapPoint(screenPoint, target)
        if (mappedPoint) points.push(mappedPoint)
        segments.push({ target, points })
        if (currentSegment) {
          const previousTargetBridge = mapPoint(screenPoint, currentSegment.target)
          if (previousTargetBridge) currentSegment.points.push(previousTargetBridge)
        }
        return
      }
      const mappedPoint = mapPoint(screenPoint, target)
      if (mappedPoint) currentSegment.points.push(mappedPoint)
    })
    return segments.filter((segment) => segment.points.length > 0)
  }, [classifyTarget, mapPoint])

  const commitGesture = useCallback(() => {
    const tool = toolRef.current
    if (!tool) return
    const style = source.settings[tool]
    const baseStroke = {
      tool,
      color: style.color,
      opacity: tool === 'highlighter' ? 0.32 : 1,
      normalizedWidth: WIDTHS[tool][style.widthPreset],
    }
    const segments = buildSegments(screenPointsRef.current)
    segments.forEach((segment) => {
      const stroke: AnnotationStroke = {
        ...baseStroke,
        id: createStrokeId(),
        points: segment.points,
        coordinateMode: segment.target === 'writing' ? 'problem-logical-y' : 'normalized',
      }
      if (segment.target === 'source') source.onAddStroke(stroke)
      else writing.onAddStroke(stroke)
    })
    const finalTarget = segments.at(-1)?.target
    if (finalTarget) onActiveTargetChange(finalTarget)
  }, [buildSegments, onActiveTargetChange, source, writing])

  const appendPointerEvents = useCallback((events: PointerEvent[]) => {
    const surfaceBounds = surfaceRef.current?.getBoundingClientRect()
    if (!surfaceBounds) return
    events.forEach((event) => {
      screenPointsRef.current.push({
        clientX: event.clientX,
        clientY: event.clientY,
        pressure: event.pressure > 0 ? event.pressure : 0.5,
      })
    })
    setPreviewPoints(screenPointsRef.current.map((point) => ({
      x: point.clientX - surfaceBounds.left,
      y: point.clientY - surfaceBounds.top,
    })))
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (source.activeTool !== 'pen' && source.activeTool !== 'highlighter')) return
    event.preventDefault()
    event.stopPropagation()
    resetPointerInteractionState()
    activePointerRef.current = event.pointerId
    captureTargetRef.current = event.currentTarget
    toolRef.current = source.activeTool
    event.currentTarget.setPointerCapture(event.pointerId)
    const firstPoint = { clientX: event.clientX, clientY: event.clientY, pressure: event.pressure > 0 ? event.pressure : 0.5 }
    onActiveTargetChange(classifyTarget(firstPoint))
    appendPointerEvents([event.nativeEvent])
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    event.preventDefault()
    const coalesced = event.nativeEvent.getCoalescedEvents?.()
    appendPointerEvents(coalesced && coalesced.length > 0 ? coalesced : [event.nativeEvent])
  }

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>, commit: boolean) => {
    if (activePointerRef.current !== event.pointerId) return
    if (commit) commitGesture()
    resetPointerInteractionState()
  }

  const activeTool = source.activeTool === 'pen' || source.activeTool === 'highlighter' ? source.activeTool : null
  const previewStyle = activeTool ? source.settings[activeTool] : null
  const previewWidth = activeTool && previewStyle ? WIDTHS[activeTool][previewStyle.widthPreset] * CLASSROOM_STROKE_WIDTH_REFERENCE : 1
  const path = previewPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')

  return (
    <div
      ref={surfaceRef}
      className={`unified-split-annotation-input${activeTool ? ' is-interactive' : ''}`}
      aria-label={`${title} 상하좌우 통합 판서 영역`}
      data-tool={source.activeTool}
      data-preview-point-count={previewPoints.length}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishPointer(event, true)}
      onPointerCancel={(event) => finishPointer(event, false)}
      onLostPointerCapture={(event) => finishPointer(event, false)}
      onDoubleClick={(event) => event.preventDefault()}
    >
      <svg className="unified-split-stroke-preview" aria-hidden="true">
        {path && <path d={path} fill="none" stroke={previewStyle?.color} strokeWidth={previewWidth}
          strokeOpacity={activeTool === 'highlighter' ? 0.32 : 1} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </div>
  )
}
