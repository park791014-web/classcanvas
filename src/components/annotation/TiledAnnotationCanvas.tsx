import { useCallback, useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type {
  AnnotationCoordinateMode,
  AnnotationPoint,
  AnnotationSettings,
  AnnotationStroke,
  AnnotationTool,
  DrawingTool,
  StrokeWidthPreset,
} from '../../types/annotation'
import { safelyReleasePointerCapture, usePointerInteractionReset } from '../../hooks/usePointerInteractionReset'

interface TiledAnnotationCanvasProps {
  worldWidth: number
  worldHeight: number
  viewportWidth: number
  viewportHeight: number
  scale: number
  offsetX: number
  offsetY: number
  strokes: AnnotationStroke[]
  activeTool: AnnotationTool
  settings: AnnotationSettings
  isVisible: boolean
  onAddStroke: (stroke: AnnotationStroke) => void
  onEraseStrokes: (strokeIds: string[]) => void
  ariaLabel: string
  coordinateMode: AnnotationCoordinateMode
  strokeWidthReference: number
}

interface TileBounds {
  key: string
  x: number
  y: number
  width: number
  height: number
}

const TILE_SIZE = 1200
const TILE_OVERSCAN = 0
const ERASER_RADIUS = 18
const OUTPUT_SCALE_LIMIT = 1.25
const WIDTHS: Record<DrawingTool, Record<StrokeWidthPreset, number>> = {
  pen: { micro: 0.0012, thin: 0.0018, normal: 0.003, thick: 0.0048 },
  highlighter: { micro: 0.007, thin: 0.012, normal: 0.022, thick: 0.034 },
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function createStrokeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function toLogicalPoint(point: AnnotationPoint, mode: AnnotationCoordinateMode, width: number, height: number) {
  return {
    x: point.x * width,
    y: mode === 'problem-logical-y' ? point.y : point.y * height,
  }
}

function distanceToSegment(pointX: number, pointY: number, startX: number, startY: number, endX: number, endY: number) {
  const deltaX = endX - startX
  const deltaY = endY - startY
  const lengthSquared = deltaX * deltaX + deltaY * deltaY
  if (lengthSquared === 0) return Math.hypot(pointX - startX, pointY - startY)
  const projection = clamp(((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared, 0, 1)
  return Math.hypot(pointX - (startX + projection * deltaX), pointY - (startY + projection * deltaY))
}

function strokeIsHit(
  stroke: AnnotationStroke,
  point: AnnotationPoint,
  pointMode: AnnotationCoordinateMode,
  worldWidth: number,
  worldHeight: number,
  widthReference: number,
) {
  const logicalPoint = toLogicalPoint(point, pointMode, worldWidth, worldHeight)
  const strokeRadius = stroke.normalizedWidth * widthReference / 2
  const hitRadius = ERASER_RADIUS + strokeRadius
  const logicalStrokePoints = stroke.points.map((strokePoint) => (
    toLogicalPoint(strokePoint, stroke.coordinateMode ?? 'normalized', worldWidth, worldHeight)
  ))
  if (logicalStrokePoints.length === 1) {
    return Math.hypot(logicalPoint.x - logicalStrokePoints[0].x, logicalPoint.y - logicalStrokePoints[0].y) <= hitRadius
  }
  return logicalStrokePoints.some((current, index) => {
    if (index === 0) return false
    const previous = logicalStrokePoints[index - 1]
    return distanceToSegment(logicalPoint.x, logicalPoint.y, previous.x, previous.y, current.x, current.y) <= hitRadius
  })
}

function drawStrokeOnTile(
  context: CanvasRenderingContext2D,
  stroke: AnnotationStroke,
  tile: TileBounds,
  worldWidth: number,
  worldHeight: number,
  widthReference: number,
) {
  if (stroke.points.length === 0) return
  const points = stroke.points.map((point) => {
    const logical = toLogicalPoint(point, stroke.coordinateMode ?? 'normalized', worldWidth, worldHeight)
    return { x: logical.x - tile.x, y: logical.y - tile.y }
  })
  const pressures = stroke.points.map((point) => point.pressure).filter((pressure) => Number.isFinite(pressure))
  const pressureRange = pressures.length > 1 ? Math.max(...pressures) - Math.min(...pressures) : 0
  const averagePressure = pressures.length ? pressures.reduce((sum, pressure) => sum + pressure, 0) / pressures.length : 0.5
  const pressureFactor = pressureRange >= 0.08 ? 0.8 + Math.min(1, Math.max(0, averagePressure)) * 0.4 : 1
  const lineWidth = Math.max(1, stroke.normalizedWidth * widthReference * pressureFactor)
  context.save()
  context.strokeStyle = stroke.color
  context.fillStyle = stroke.color
  context.globalAlpha = stroke.opacity
  context.lineWidth = lineWidth
  context.lineCap = 'round'
  context.lineJoin = 'round'
  if (points.length === 1) {
    context.beginPath()
    context.arc(points[0].x, points[0].y, lineWidth / 2, 0, Math.PI * 2)
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

export function TiledAnnotationCanvas({
  worldWidth,
  worldHeight,
  viewportWidth,
  viewportHeight,
  scale,
  offsetX,
  offsetY,
  strokes,
  activeTool,
  settings,
  isVisible,
  onAddStroke,
  onEraseStrokes,
  ariaLabel,
  coordinateMode,
  strokeWidthReference,
}: TiledAnnotationCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const canvasRefs = useRef(new Map<string, HTMLCanvasElement>())
  const activePointerRef = useRef<number | null>(null)
  const activeStrokeRef = useRef<AnnotationStroke | null>(null)
  const erasedIdsRef = useRef(new Set<string>())
  const captureTargetRef = useRef<HTMLDivElement | null>(null)
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes

  const visibleTiles = useMemo(() => {
    const safeScale = Math.max(0.01, scale)
    const worldScreenLeft = viewportWidth / 2 - worldWidth * safeScale / 2 + offsetX
    const worldScreenTop = offsetY
    const firstColumn = clamp(Math.floor(((0 - worldScreenLeft) / safeScale) / TILE_SIZE) - TILE_OVERSCAN, 0, Math.ceil(worldWidth / TILE_SIZE) - 1)
    const lastColumn = clamp(Math.floor(((viewportWidth - worldScreenLeft) / safeScale) / TILE_SIZE) + TILE_OVERSCAN, 0, Math.ceil(worldWidth / TILE_SIZE) - 1)
    const firstRow = clamp(Math.floor(((0 - worldScreenTop) / safeScale) / TILE_SIZE) - TILE_OVERSCAN, 0, Math.ceil(worldHeight / TILE_SIZE) - 1)
    const lastRow = clamp(Math.floor(((viewportHeight - worldScreenTop) / safeScale) / TILE_SIZE) + TILE_OVERSCAN, 0, Math.ceil(worldHeight / TILE_SIZE) - 1)
    const tiles: TileBounds[] = []
    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const x = column * TILE_SIZE
        const y = row * TILE_SIZE
        tiles.push({ key: `${column}:${row}`, x, y, width: Math.min(TILE_SIZE, worldWidth - x), height: Math.min(TILE_SIZE, worldHeight - y) })
      }
    }
    return tiles
  }, [offsetX, offsetY, scale, viewportHeight, viewportWidth, worldHeight, worldWidth])

  const redraw = useCallback((previewStroke?: AnnotationStroke | null, excludedIds = new Set<string>()) => {
    const outputScale = Math.min(window.devicePixelRatio || 1, OUTPUT_SCALE_LIMIT)
    visibleTiles.forEach((tile) => {
      const canvas = canvasRefs.current.get(tile.key)
      if (!canvas) return
      const width = Math.max(1, Math.ceil(tile.width * outputScale))
      const height = Math.max(1, Math.ceil(tile.height * outputScale))
      if (canvas.width !== width) canvas.width = width
      if (canvas.height !== height) canvas.height = height
      canvas.style.width = `${tile.width}px`
      canvas.style.height = `${tile.height}px`
      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0)
      context.clearRect(0, 0, tile.width, tile.height)
      if (!isVisible) return
      strokesRef.current.forEach((stroke) => {
        if (!excludedIds.has(stroke.id)) drawStrokeOnTile(context, stroke, tile, worldWidth, worldHeight, strokeWidthReference)
      })
      if (previewStroke) drawStrokeOnTile(context, previewStroke, tile, worldWidth, worldHeight, strokeWidthReference)
    })
  }, [isVisible, strokeWidthReference, visibleTiles, worldHeight, worldWidth])

  useEffect(() => {
    redraw()
  }, [redraw, strokes])

  const toAnnotationPoint = useCallback((event: PointerEvent | ReactPointerEvent<HTMLDivElement>): AnnotationPoint => {
    const bounds = surfaceRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0, pressure: 0.5 }
    const logicalY = clamp(((event.clientY - bounds.top) / bounds.height) * worldHeight, 0, worldHeight)
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
      y: coordinateMode === 'problem-logical-y' ? logicalY : logicalY / worldHeight,
      pressure: event.pressure > 0 ? event.pressure : 0.5,
    }
  }, [coordinateMode, worldHeight])

  const eraseAt = useCallback((point: AnnotationPoint) => {
    strokesRef.current.forEach((stroke) => {
      if (!erasedIdsRef.current.has(stroke.id)
        && strokeIsHit(stroke, point, coordinateMode, worldWidth, worldHeight, strokeWidthReference)) {
        erasedIdsRef.current.add(stroke.id)
      }
    })
    redraw(null, erasedIdsRef.current)
  }, [coordinateMode, redraw, strokeWidthReference, worldHeight, worldWidth])

  const resetPointerInteractionState = useCallback((commit = false) => {
    const pointerId = activePointerRef.current
    const stroke = activeStrokeRef.current
    const erasedIds = [...erasedIdsRef.current]
    activePointerRef.current = null
    activeStrokeRef.current = null
    erasedIdsRef.current.clear()
    safelyReleasePointerCapture(captureTargetRef.current, pointerId)
    captureTargetRef.current = null
    if (commit) {
      if (stroke) onAddStroke(stroke)
      else if (erasedIds.length > 0) onEraseStrokes(erasedIds)
    } else redraw()
  }, [onAddStroke, onEraseStrokes, redraw])

  usePointerInteractionReset(resetPointerInteractionState)

  useEffect(() => {
    const cancelDrawing = () => resetPointerInteractionState(false)
    window.addEventListener('lessoncanvas:cancel-drawing', cancelDrawing)
    return () => window.removeEventListener('lessoncanvas:cancel-drawing', cancelDrawing)
  }, [resetPointerInteractionState])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isVisible || event.button !== 0 || (activeTool !== 'pen' && activeTool !== 'highlighter' && activeTool !== 'eraser')) return
    event.preventDefault()
    event.stopPropagation()
    if (activePointerRef.current !== null) resetPointerInteractionState(false)
    event.currentTarget.setPointerCapture(event.pointerId)
    activePointerRef.current = event.pointerId
    captureTargetRef.current = event.currentTarget
    const point = toAnnotationPoint(event)
    if (activeTool === 'eraser') {
      erasedIdsRef.current.clear()
      eraseAt(point)
      return
    }
    const style = settings[activeTool]
    activeStrokeRef.current = {
      id: createStrokeId(),
      tool: activeTool,
      points: [point],
      color: style.color,
      opacity: activeTool === 'highlighter' ? 0.32 : 1,
      normalizedWidth: WIDTHS[activeTool][style.widthPreset],
      coordinateMode,
    }
    redraw(activeStrokeRef.current)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    event.preventDefault()
    const coalescedEvents = event.nativeEvent.getCoalescedEvents?.()
    const nativeEvents = coalescedEvents && coalescedEvents.length > 0 ? coalescedEvents : [event.nativeEvent]
    if (activeTool === 'eraser') {
      nativeEvents.forEach((nativeEvent) => eraseAt(toAnnotationPoint(nativeEvent)))
      return
    }
    if (!activeStrokeRef.current) return
    nativeEvents.forEach((nativeEvent) => activeStrokeRef.current?.points.push(toAnnotationPoint(nativeEvent)))
    redraw(activeStrokeRef.current)
  }

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>, commit: boolean) => {
    if (activePointerRef.current !== event.pointerId) return
    resetPointerInteractionState(commit)
  }

  const interactive = isVisible && ['pen', 'highlighter', 'eraser'].includes(activeTool)
  return (
    <div
      ref={surfaceRef}
      className={`tiled-annotation-surface${interactive ? ' tiled-annotation-surface--interactive' : ''}`}
      aria-label={ariaLabel}
      data-stroke-count={strokes.length}
      data-visible-tile-count={visibleTiles.length}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishPointer(event, true)}
      onPointerCancel={(event) => finishPointer(event, false)}
      onLostPointerCapture={(event) => finishPointer(event, false)}
      onDoubleClick={(event) => event.preventDefault()}
    >
      {visibleTiles.map((tile) => (
        <canvas
          key={tile.key}
          ref={(canvas) => {
            if (canvas) canvasRefs.current.set(tile.key, canvas)
            else canvasRefs.current.delete(tile.key)
          }}
          className="tiled-annotation-canvas"
          style={{ left: tile.x, top: tile.y }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
