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
  onToggleWhiteboard: () => void
}

const COLORS = [
  { value: '#111827', label: '검정' },
  { value: '#dc2626', label: '빨강' },
  { value: '#2563eb', label: '파랑' },
  { value: '#16a34a', label: '초록' },
  { value: '#facc15', label: '노랑' },
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
  onToggleWhiteboard,
}: ToolBarProps) {
  const drawingTool = activeTool === 'pen' || activeTool === 'highlighter' ? activeTool : null
  const drawingStyle = drawingTool ? settings[drawingTool] : null
  const pickerColor = drawingStyle?.color ?? settings.pen.color
  const isPresetColor = COLORS.some((color) => color.value === drawingStyle?.color)

  const renderModeControls = (position: '왼쪽' | '오른쪽') => (
    <div className={`toolbar-mode-controls${position === '오른쪽' ? ' toolbar-duplicate-group' : ''}`} aria-label={`${position} 수업 화면 모드`}>
      {(position === '왼쪽' ? ['board', 'region'] : ['region', 'board']).map((control) => control === 'board' ? (
        <button key="board" type="button" className={isWhiteboard ? 'is-active' : undefined} aria-pressed={isWhiteboard}
          onClick={onToggleWhiteboard}>{isWhiteboard ? '교과서' : '빈 칠판'}</button>
      ) : (
        <button key="region" type="button" className={activeTool === 'region-select' ? 'is-active' : undefined}
          aria-pressed={activeTool === 'region-select'} disabled={!hasDocument || !allowRegionSelect}
          onClick={() => onToolChange('region-select')}>영역 선택</button>
      ))}
    </div>
  )

  const renderDrawingTools = (position: '왼쪽' | '오른쪽') => (
    <div className={`tool-button-group${position === '오른쪽' ? ' toolbar-duplicate-group' : ''}`} aria-label={`${position} 빠른 탐색 및 판서 도구`}>
      <button type="button" className={activeTool === 'none' ? 'is-active' : undefined} aria-pressed={activeTool === 'none'}
        disabled={!hasDocument} onClick={() => onToolChange('none')}>탐색</button>
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
        {renderModeControls('왼쪽')}
        {renderDrawingTools('왼쪽')}

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

        {renderDrawingTools('오른쪽')}
        {renderModeControls('오른쪽')}
      </div>
      <div className="history-controls" aria-label="판서 기록 제어">
        <button type="button" className="history-action history-action--undo" disabled={!hasDocument || !canUndo} onClick={onUndo} aria-label="판서 실행 취소">실행 취소</button>
        <button type="button" className="history-action history-action--redo" disabled={!hasDocument || !canRedo} onClick={onRedo} aria-label="판서 다시 실행">다시 실행</button>
        <button type="button" className={`history-action history-action--visibility${!isVisible ? ' is-active' : ''}`} disabled={!hasDocument} aria-pressed={!isVisible} onClick={onToggleVisibility}>
          {isVisible ? '판서 숨기기' : '판서 보이기'}
        </button>
      </div>
    </footer>
  )
}
