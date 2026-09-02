import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { AnnotationCanvas } from '../annotation/AnnotationCanvas'
import { TiledAnnotationCanvas } from '../annotation/TiledAnnotationCanvas'
import { CLASSROOM_STROKE_WIDTH_REFERENCE } from '../annotation/annotationSizing'
import { useElementSize } from '../../hooks/useElementSize'
import type { AnnotationCoordinateMode } from '../../types/annotation'
import type { ContentBlock, ContentWorkspaceState } from '../../types/content'
import type { LoadedPdfDocument, PdfViewportMetrics } from '../../types/pdf'
import type { ContentAnnotationSurface } from './ContentFocusView'
import { ContentCropCanvas } from './ProblemCropCanvas'
import { safelyReleasePointerCapture, usePointerInteractionReset } from '../../hooks/usePointerInteractionReset'
import { useCanvasPinchPan } from '../../hooks/useCanvasPinchPan'

interface CanvasContentWorkspaceProps {
  loadedPdf: LoadedPdfDocument
  block: ContentBlock
  sourceAnnotations: ContentAnnotationSurface
  workspaceAnnotations: ContentAnnotationSurface
  workspaceHeight: number
  workspaceCoordinateMode: AnnotationCoordinateMode
  state: ContentWorkspaceState
  onStateChange: (changes: Partial<ContentWorkspaceState>) => void
  onWorkspaceActivate: () => void
}

const SOURCE_WIDTH = 880
const WORLD_WIDTH = SOURCE_WIDTH * 11
const SOURCE_TOP = 320
const MIN_WORLD_HEIGHT = 3600

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function CanvasContentWorkspace({
  loadedPdf,
  block,
  sourceAnnotations,
  workspaceAnnotations,
  workspaceHeight,
  workspaceCoordinateMode,
  state,
  onStateChange,
  onWorkspaceActivate,
}: CanvasContentWorkspaceProps) {
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(null)
  const [sourceMetrics, setSourceMetrics] = useState<PdfViewportMetrics | null>(null)
  const viewportSize = useElementSize(viewportElement)
  const panPointerRef = useRef<number | null>(null)
  const panStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const captureTargetRef = useRef<HTMLDivElement | null>(null)
  const pinchHandlers = useCanvasPinchPan(state, onStateChange)
  const worldHeight = Math.max(MIN_WORLD_HEIGHT, workspaceHeight + 1200, SOURCE_TOP + (sourceMetrics?.height ?? 0) + 1800)

  const clampOffset = useCallback((offsetX: number, offsetY: number) => {
    const scaledWidth = WORLD_WIDTH * state.canvasScale
    const scaledHeight = worldHeight * state.canvasScale
    const horizontalLimit = Math.max(0, (scaledWidth - viewportSize.width) / 2 + 160 * state.canvasScale)
    const minimumY = Math.min(0, viewportSize.height - scaledHeight - 80)
    return {
      canvasOffsetX: clamp(offsetX, -horizontalLimit, horizontalLimit),
      canvasOffsetY: clamp(offsetY, minimumY, Math.max(80, viewportSize.height * 0.35)),
    }
  }, [state.canvasScale, viewportSize.height, viewportSize.width, worldHeight])

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
    const canPan = workspaceAnnotations.activeTool === 'none' || event.button === 1
    if (!canPan) return
    event.preventDefault()
    if (panPointerRef.current !== null) resetPointerInteractionState()
    panPointerRef.current = event.pointerId
    panStartRef.current = { x: event.clientX, y: event.clientY, offsetX: state.canvasOffsetX, offsetY: state.canvasOffsetY }
    captureTargetRef.current = event.currentTarget
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = panStartRef.current
    if (panPointerRef.current !== event.pointerId || !start) return
    event.preventDefault()
    onStateChange(clampOffset(start.offsetX + event.clientX - start.x, start.offsetY + event.clientY - start.y))
  }

  const finishPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panPointerRef.current !== event.pointerId) return
    resetPointerInteractionState()
  }

  const sourceLeft = sourceMetrics ? (WORLD_WIDTH - sourceMetrics.width) / 2 : (WORLD_WIDTH - SOURCE_WIDTH) / 2

  useEffect(() => {
    if (state.canvasViewportInitialized || !sourceMetrics || viewportSize.width <= 0 || viewportSize.height <= 0) return
    const sourceCenterX = sourceLeft + sourceMetrics.width / 2
    const sourceCenterY = SOURCE_TOP + sourceMetrics.height / 2
    const centeredOffsetX = (WORLD_WIDTH / 2 - sourceCenterX) * state.canvasScale
    const centeredOffsetY = viewportSize.height / 2 - sourceCenterY * state.canvasScale
    onStateChange({
      ...clampOffset(centeredOffsetX, centeredOffsetY),
      canvasViewportInitialized: true,
    })
  }, [clampOffset, onStateChange, sourceLeft, sourceMetrics, state.canvasScale, state.canvasViewportInitialized, viewportSize.height, viewportSize.width])

  return (
    <div className="canvas-workspace-shell">
      <div
        ref={setViewportElement}
        className={`canvas-workspace-viewport${workspaceAnnotations.activeTool === 'none' ? ' is-pannable' : ''}`}
        {...pinchHandlers}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPan}
        onPointerCancel={finishPan}
        onLostPointerCapture={finishPan}
        onDoubleClick={(event) => event.preventDefault()}
      >
        <div className="canvas-world-anchor">
          <div
            className="canvas-logical-world"
            style={{
              left: -WORLD_WIDTH / 2,
              width: WORLD_WIDTH,
              height: worldHeight,
              transform: `translate3d(${state.canvasOffsetX}px, ${state.canvasOffsetY}px, 0) scale(${state.canvasScale})`,
            }}
            data-canvas-scale={state.canvasScale}
            data-canvas-offset={`${state.canvasOffsetX},${state.canvasOffsetY}`}
          >
            <div className="canvas-workspace-annotation" onPointerDownCapture={onWorkspaceActivate}>
              <TiledAnnotationCanvas
                worldWidth={WORLD_WIDTH}
                worldHeight={worldHeight}
                viewportWidth={viewportSize.width}
                viewportHeight={viewportSize.height}
                scale={state.canvasScale}
                offsetX={state.canvasOffsetX}
                offsetY={state.canvasOffsetY}
                strokes={workspaceAnnotations.strokes}
                activeTool={workspaceAnnotations.activeTool}
                settings={workspaceAnnotations.settings}
                isVisible={workspaceAnnotations.isVisible}
                onAddStroke={workspaceAnnotations.onAddStroke}
                onEraseStrokes={workspaceAnnotations.onEraseStrokes}
                ariaLabel={`${block.title} 자유 판서 영역`}
                coordinateMode={workspaceCoordinateMode}
                strokeWidthReference={CLASSROOM_STROKE_WIDTH_REFERENCE}
              />
            </div>
            <div
              className="canvas-source-sheet"
              style={{ top: SOURCE_TOP, left: sourceLeft, width: sourceMetrics?.width ?? SOURCE_WIDTH, height: sourceMetrics?.height }}
            >
              <ContentCropCanvas
                document={loadedPdf.document}
                pageNumber={block.sourcePage}
                region={block.sourceRegion}
                availableWidth={SOURCE_WIDTH}
                title={block.title}
                onMetricsChange={setSourceMetrics}
              />
              {sourceMetrics && (
                <AnnotationCanvas
                  metrics={sourceMetrics}
                  strokes={sourceAnnotations.strokes}
                  activeTool="none"
                  settings={sourceAnnotations.settings}
                  isVisible={sourceAnnotations.isVisible}
                  onAddStroke={sourceAnnotations.onAddStroke}
                  onEraseStrokes={sourceAnnotations.onEraseStrokes}
                  ariaLabel={`${block.title} 원문 판서 영역`}
                  strokeWidthReference={CLASSROOM_STROKE_WIDTH_REFERENCE}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
