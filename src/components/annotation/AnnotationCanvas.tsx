import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type {
  AnnotationSettings,
  AnnotationCoordinateMode,
  AnnotationPoint,
  AnnotationStroke,
  AnnotationTool,
  DrawingTool,
  StrokeWidthPreset,
} from '../../types/annotation'
import type { PdfViewportMetrics } from '../../types/pdf'

interface AnnotationCanvasProps {
  metrics: PdfViewportMetrics
  strokes: AnnotationStroke[]
  activeTool: AnnotationTool
  settings: AnnotationSettings
  isVisible: boolean
  onAddStroke: (stroke: AnnotationStroke) => void
  onEraseStrokes: (strokeIds: string[]) => void
  ariaLabel?: string
  coordinateScope?: 'pdf-page' | 'problem-workspace'
  coordinateMode?: AnnotationCoordinateMode
}

const WIDTHS: Record<DrawingTool, Record<StrokeWidthPreset, number>> = {
  pen: { micro: 0.0013, thin: 0.0022, normal: 0.0038, thick: 0.0065 },
  highlighter: { micro: 0.007, thin: 0.012, normal: 0.022, thick: 0.034 },
}

const ERASER_RADIUS = 18

function clamp(value: number) {
  return Math.min(1, Math.max(0, value))
}

function distanceToSegment(
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  const deltaX = endX - startX
  const deltaY = endY - startY
  const lengthSquared = deltaX * deltaX + deltaY * deltaY

  if (lengthSquared === 0) return Math.hypot(pointX - startX, pointY - startY)

  const projection = Math.min(1, Math.max(0, ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared))
  return Math.hypot(pointX - (startX + projection * deltaX), pointY - (startY + projection * deltaY))
}

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: AnnotationStroke,
  width: number,
  height: number,
) {
  if (stroke.points.length === 0) return

  const points = stroke.points.map((point) => ({
    x: point.x * width,
    y: stroke.coordinateMode === 'problem-logical-y' ? point.y : point.y * height,
  }))
  context.save()
  context.strokeStyle = stroke.color
  context.fillStyle = stroke.color
  context.globalAlpha = stroke.opacity
  context.lineWidth = Math.max(1, stroke.normalizedWidth * Math.min(width, height))
  context.lineCap = 'round'
  context.lineJoin = 'round'

  if (points.length === 1) {
    context.beginPath()
    context.arc(points[0].x, points[0].y, context.lineWidth / 2, 0, Math.PI * 2)
    context.fill()
    context.restore()
    return
  }

  context.beginPath()
  context.moveTo(points[0].x, points[0].y)

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2)
  }

  const last = points.at(-1)
  if (last) context.lineTo(last.x, last.y)
  context.stroke()
  context.restore()
}

function strokeIsHit(
  stroke: AnnotationStroke,
  point: AnnotationPoint,
  pointMode: AnnotationCoordinateMode,
  width: number,
  height: number,
) {
  const pointX = point.x * width
  const pointY = pointMode === 'problem-logical-y' ? point.y : point.y * height
  const strokeRadius = stroke.normalizedWidth * Math.min(width, height) / 2
  const hitRadius = ERASER_RADIUS + strokeRadius

  if (stroke.points.length === 1) {
    const strokePointY = stroke.coordinateMode === 'problem-logical-y'
      ? stroke.points[0].y
      : stroke.points[0].y * height
    return Math.hypot(pointX - stroke.points[0].x * width, pointY - strokePointY) <= hitRadius
  }

  return stroke.points.some((current, index) => {
    if (index === 0) return false
    const previous = stroke.points[index - 1]
    const previousY = stroke.coordinateMode === 'problem-logical-y' ? previous.y : previous.y * height
    const currentY = stroke.coordinateMode === 'problem-logical-y' ? current.y : current.y * height
    return distanceToSegment(
      pointX,
      pointY,
      previous.x * width,
      previousY,
      current.x * width,
      currentY,
    ) <= hitRadius
  })
}

function createStrokeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export function AnnotationCanvas({
  metrics,
  strokes,
  activeTool,
  settings,
  isVisible,
  onAddStroke,
  onEraseStrokes,
  ariaLabel = 'PDF 판서 영역',
  coordinateScope = 'pdf-page',
  coordinateMode = 'normalized',
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activePointerRef = useRef<number | null>(null)
  const activeStrokeRef = useRef<AnnotationStroke | null>(null)
  const erasedIdsRef = useRef<Set<string>>(new Set())
  const strokesRef = useRef(strokes)

  strokesRef.current = strokes

  const getContext = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const context = canvas.getContext('2d')
    if (!context) return null
    context.setTransform(metrics.outputScale, 0, 0, metrics.outputScale, 0, 0)
    return context
  }, [metrics.outputScale])

  const redraw = useCallback((excludedIds: Set<string> = new Set()) => {
    const context = getContext()
    if (!context) return
    context.clearRect(0, 0, metrics.width, metrics.height)
    if (!isVisible) return

    strokesRef.current.forEach((stroke) => {
      if (!excludedIds.has(stroke.id)) drawStroke(context, stroke, metrics.width, metrics.height)
    })
  }, [getContext, isVisible, metrics.height, metrics.width])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = Math.max(1, Math.floor(metrics.width * metrics.outputScale))
    canvas.height = Math.max(1, Math.floor(metrics.height * metrics.outputScale))
    canvas.style.width = `${metrics.width}px`
    canvas.style.height = `${metrics.height}px`
    activePointerRef.current = null
    activeStrokeRef.current = null
    erasedIdsRef.current.clear()
    redraw()
  }, [metrics, redraw, strokes])

  const toAnnotationPoint = useCallback((event: PointerEvent | ReactPointerEvent<HTMLCanvasElement>): AnnotationPoint => {
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0, pressure: 0.5 }

    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: coordinateMode === 'problem-logical-y'
        ? Math.min(bounds.height, Math.max(0, event.clientY - bounds.top))
        : clamp((event.clientY - bounds.top) / bounds.height),
      pressure: event.pressure > 0 ? event.pressure : 0.5,
    }
  }, [coordinateMode])

  const previewLatestSegment = useCallback((stroke: AnnotationStroke) => {
    const context = getContext()
    if (!context) return
    const recentPoints = stroke.points.slice(-2)
    drawStroke(context, { ...stroke, points: recentPoints }, metrics.width, metrics.height)
  }, [getContext, metrics.height, metrics.width])

  const eraseAt = useCallback((point: AnnotationPoint) => {
    let changed = false
    strokesRef.current.forEach((stroke) => {
      if (!erasedIdsRef.current.has(stroke.id) && strokeIsHit(stroke, point, coordinateMode, metrics.width, metrics.height)) {
        erasedIdsRef.current.add(stroke.id)
        changed = true
      }
    })
    if (changed) redraw(erasedIdsRef.current)
  }, [coordinateMode, metrics.height, metrics.width, redraw])

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isVisible || (activeTool !== 'pen' && activeTool !== 'highlighter' && activeTool !== 'eraser') || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    activePointerRef.current = event.pointerId

    const point = toAnnotationPoint(event)
    if (activeTool === 'eraser') {
      erasedIdsRef.current.clear()
      eraseAt(point)
      return
    }

    const style = settings[activeTool]
    const stroke: AnnotationStroke = {
      id: createStrokeId(),
      tool: activeTool,
      points: [point],
      color: style.color,
      opacity: activeTool === 'highlighter' ? 0.32 : 1,
      normalizedWidth: WIDTHS[activeTool][style.widthPreset],
      coordinateMode,
    }
    activeStrokeRef.current = stroke
    previewLatestSegment(stroke)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    event.preventDefault()
    const coalescedEvents = event.nativeEvent.getCoalescedEvents?.()
    const nativeEvents = coalescedEvents && coalescedEvents.length > 0
      ? coalescedEvents
      : [event.nativeEvent]

    if (activeTool === 'eraser') {
      nativeEvents.forEach((nativeEvent) => eraseAt(toAnnotationPoint(nativeEvent)))
      return
    }

    const stroke = activeStrokeRef.current
    if (!stroke) return
    nativeEvents.forEach((nativeEvent) => {
      stroke.points.push(toAnnotationPoint(nativeEvent))
      previewLatestSegment(stroke)
    })
  }

  const finishPointer = (event: ReactPointerEvent<HTMLCanvasElement>, shouldCommit: boolean) => {
    if (activePointerRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (shouldCommit) {
      if (activeTool === 'eraser') {
        onEraseStrokes([...erasedIdsRef.current])
      } else if (activeStrokeRef.current) {
        onAddStroke(activeStrokeRef.current)
      }
    } else {
      redraw()
    }

    activePointerRef.current = null
    activeStrokeRef.current = null
    erasedIdsRef.current.clear()
  }

  const isInteractive = isVisible && (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser')
  const logicalYValues = coordinateMode === 'problem-logical-y'
    ? strokes.flatMap((stroke) => stroke.points.map((point) => point.y))
    : []
  const logicalYRange = logicalYValues.length > 0
    ? `${Math.min(...logicalYValues).toFixed(2)}:${Math.max(...logicalYValues).toFixed(2)}`
    : ''

  return (
    <canvas
      ref={canvasRef}
      className={`annotation-canvas${isInteractive ? ' annotation-canvas--interactive' : ''}`}
      aria-label={ariaLabel}
      data-coordinate-scope={coordinateScope}
      data-coordinate-mode={coordinateMode}
      data-logical-y-range={logicalYRange}
      data-page-number={metrics.pageNumber}
      data-stroke-count={strokes.length}
      data-tool={activeTool}
      data-visible={isVisible}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishPointer(event, true)}
      onPointerCancel={(event) => finishPointer(event, false)}
    />
  )
}
