import type { ContentWorkspaceState } from '../../types/content'
import { MAX_ZOOM_SCALE, MIN_MANUAL_ZOOM_SCALE } from '../../constants/zoom'

interface ContentCanvasZoomControlsProps {
  state: ContentWorkspaceState
  onStateChange: (changes: Partial<ContentWorkspaceState>) => void
}

const SCALE_STEP = 0.25

function clampScale(scale: number) {
  return Math.min(MAX_ZOOM_SCALE, Math.max(MIN_MANUAL_ZOOM_SCALE, scale))
}

export function ContentCanvasZoomControls({ state, onStateChange }: ContentCanvasZoomControlsProps) {
  return (
    <div className="content-canvas-zoom-controls" aria-label="캔버스 확대 및 축소">
      <button type="button" aria-label="캔버스 축소" disabled={state.canvasScale <= MIN_MANUAL_ZOOM_SCALE}
        onClick={() => onStateChange({ canvasScale: clampScale(state.canvasScale - SCALE_STEP) })}>−</button>
      <output aria-label="캔버스 확대 비율">{Math.round(state.canvasScale * 100)}%</output>
      <button type="button" aria-label="캔버스 확대" disabled={state.canvasScale >= MAX_ZOOM_SCALE}
        onClick={() => onStateChange({ canvasScale: clampScale(state.canvasScale + SCALE_STEP) })}>＋</button>
      <button type="button" className="content-canvas-reset" onClick={() => onStateChange({ canvasScale: 1, canvasViewportInitialized: false })}>화면 맞춤</button>
    </div>
  )
}
