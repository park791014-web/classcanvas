import type { ContentWorkspaceState } from '../../types/content'

interface ContentCanvasZoomControlsProps {
  state: ContentWorkspaceState
  onStateChange: (changes: Partial<ContentWorkspaceState>) => void
}

const MIN_SCALE = 0.5
const MAX_SCALE = 2.5
const SCALE_STEP = 0.25

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

export function ContentCanvasZoomControls({ state, onStateChange }: ContentCanvasZoomControlsProps) {
  return (
    <div className="content-canvas-zoom-controls" aria-label="캔버스 확대 및 축소">
      <button type="button" aria-label="캔버스 축소" disabled={state.canvasScale <= MIN_SCALE}
        onClick={() => onStateChange({ canvasScale: clampScale(state.canvasScale - SCALE_STEP) })}>−</button>
      <output aria-label="캔버스 확대 비율">{Math.round(state.canvasScale * 100)}%</output>
      <button type="button" aria-label="캔버스 확대" disabled={state.canvasScale >= MAX_SCALE}
        onClick={() => onStateChange({ canvasScale: clampScale(state.canvasScale + SCALE_STEP) })}>＋</button>
      <button type="button" className="content-canvas-reset" onClick={() => onStateChange({ canvasScale: 1, canvasOffsetX: 0, canvasOffsetY: 0 })}>화면 맞춤</button>
    </div>
  )
}
