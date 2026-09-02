import type { CSSProperties } from 'react'
import type { AnnotationSettings, AnnotationTool, DrawingStyle, DrawingTool, StrokeWidthPreset } from '../../types/annotation'

interface ToolBarProps {
  hasDocument: boolean
  activeTool: AnnotationTool
  settings: AnnotationSettings
  isVisible: boolean
  canUndo: boolean
  canRedo: boolean
  onToolChange: (tool: AnnotationTool) => void
  onStyleChange: (tool: DrawingTool, style: Partial<DrawingStyle>) => void
  onUndo: () => void
  onRedo: () => void
  onToggleVisibility: () => void
  allowRegionSelect: boolean
  isWhiteboard: boolean
  isFocusView: boolean
  onToggleWhiteboard: () => void
  onReturnToSource: () => void
}

const COLORS = [
  { value: '#111827', label: '검정' },
  { value: '#dc2626', label: '빨강' },
  { value: '#2563eb', label: '파랑' },
  { value: '#16a34a', label: '초록' },
  { value: '#facc15', label: '노랑' },
  { value: '#A78BFA', label: '보라' },
]

const WIDTHS: { value: StrokeWidthPreset; label: string }[] = [
  { value: 'micro', label: '미세' },
  { value: 'thin', label: '얇게' },
  { value: 'normal', label: '보통' },
  { value: 'thick', label: '굵게' },
]

const DRAWING_TOOLS: { tool: AnnotationTool; label: string }[] = [
  { tool: 'pen', label: '펜' },
  { tool: 'highlighter', label: '형광펜' },
  { tool: 'eraser', label: '지우개' },
]

export function ToolBar({
  hasDocument,
  activeTool,
  settings,
  isVisible,
  canUndo,
  canRedo,
  onToolChange,
  onStyleChange,
  onUndo,
  onRedo,
  onToggleVisibility,
  allowRegionSelect,
  isWhiteboard,
  isFocusView,
  onToggleWhiteboard,
  onReturnToSource,
}: ToolBarProps) {
  const drawingTool = activeTool === 'pen' || activeTool === 'highlighter' ? activeTool : null
  const drawingStyle = drawingTool ? settings[drawingTool] : null
  const pickerColor = drawingStyle?.color ?? settings.pen.color
  const isPresetColor = COLORS.some((color) => color.value === drawingStyle?.color)

  const renderModeControls = () => (
    <div className="toolbar-mode-controls" aria-label="툴모둠">
      <button type="button" className="toolbar-context-action" onClick={isWhiteboard || isFocusView ? onReturnToSource : onToggleWhiteboard}>
        {isWhiteboard || isFocusView ? '원문으로' : '빈 칠판'}
      </button>
      <button type="button" className={activeTool === 'region-select' ? 'is-active' : undefined}
        aria-pressed={activeTool === 'region-select'} disabled={!hasDocument || !allowRegionSelect}
        onClick={() => onToolChange('region-select')}>영역 선택</button>
      <button type="button" className={`toolbar-navigation-tool${activeTool === 'none' ? ' is-active' : ''}`}
        aria-pressed={activeTool === 'none'} disabled={!hasDocument} onClick={() => onToolChange('none')}>탐색</button>
    </div>
  )

  const renderDrawingTools = () => (
    <div className="tool-button-group" aria-label="펜도구">
      {DRAWING_TOOLS.map(({ tool, label }) => (
        <button type="button" key={tool} className={activeTool === tool ? 'is-active' : undefined} aria-pressed={activeTool === tool}
          disabled={!hasDocument || !isVisible} onClick={() => onToolChange(tool)}>{label}</button>
      ))}
    </div>
  )

  return (
    <footer className="tool-bar" aria-label="판서 도구 영역">
      <strong className="toolbar-label">판서도구</strong>
      <div className="annotation-toolbar-controls">
        <div className="color-controls" aria-label="선 색상">
          {COLORS.map((color) => (
            <button type="button" key={color.value} className={drawingStyle?.color === color.value ? 'color-button is-active' : 'color-button'}
              style={{ '--swatch-color': color.value } as CSSProperties} aria-label={`${color.label} 색상`} aria-pressed={drawingStyle?.color === color.value}
              disabled={!hasDocument || !drawingTool || !isVisible} onClick={() => drawingTool && onStyleChange(drawingTool, { color: color.value })} />
          ))}
          <label className={`custom-color-button${drawingStyle && !isPresetColor ? ' is-active' : ''}`} title="사용자 지정 색상">
            <span aria-hidden="true">＋</span>
            <input type="color" value={pickerColor} disabled={!hasDocument || !drawingTool || !isVisible} aria-label="사용자 지정 색상 선택"
              onChange={(event) => { if (drawingTool) onStyleChange(drawingTool, { color: event.target.value }) }} />
          </label>
        </div>

        <div className="width-controls" aria-label="선 굵기">
          {WIDTHS.map((width) => (
            <button type="button" key={width.value} className={`${drawingStyle?.widthPreset === width.value ? 'is-active ' : ''}toolbar-width-${width.value}`.trim()}
              aria-pressed={drawingStyle?.widthPreset === width.value} disabled={!hasDocument || !drawingTool || !isVisible}
              onClick={() => drawingTool && onStyleChange(drawingTool, { widthPreset: width.value })}>{width.label}</button>
          ))}
        </div>

        {renderDrawingTools()}
        {renderModeControls()}
      </div>
      <div className="history-controls" aria-label="판서 기록 제어">
        <button type="button" className="history-action history-action--undo" disabled={!hasDocument || !canUndo} onClick={onUndo} aria-label="실행 취소" title="실행 취소">
          <svg className="tablet-history-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 7H4v-5M4.5 6.5A9 9 0 1 1 3 15" />
          </svg>
          <span className="history-action-text">실행 취소</span>
        </button>
        <button type="button" className="history-action history-action--redo" disabled={!hasDocument || !canRedo} onClick={onRedo} aria-label="다시 실행" title="다시 실행">
          <svg className="tablet-history-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 7h5v-5m-.5 4.5A9 9 0 1 0 21 15" />
          </svg>
          <span className="history-action-text">다시 실행</span>
        </button>
        <button type="button" className={`history-action history-action--visibility${!isVisible ? ' is-active' : ''}`} disabled={!hasDocument} aria-pressed={!isVisible} onClick={onToggleVisibility}>
          {isVisible ? '판서 숨기기' : '판서 보이기'}
        </button>
      </div>
    </footer>
  )
}
