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
  contextLabel?: string
}

const TOOLS: { tool: AnnotationTool; label: string }[] = [
  { tool: 'none', label: '탐색' },
  { tool: 'pen', label: '펜' },
  { tool: 'highlighter', label: '형광펜' },
  { tool: 'eraser', label: '지우개' },
  { tool: 'region-select', label: '영역 선택' },
]

const COLORS = [
  { value: '#111827', label: '검정' },
  { value: '#dc2626', label: '빨강' },
  { value: '#2563eb', label: '파랑' },
  { value: '#16a34a', label: '초록' },
  { value: '#facc15', label: '노랑' },
]

const WIDTHS: { value: StrokeWidthPreset; label: string }[] = [
  { value: 'thin', label: '얇게' },
  { value: 'normal', label: '보통' },
  { value: 'thick', label: '굵게' },
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
  contextLabel = 'PDF',
}: ToolBarProps) {
  const drawingTool = activeTool === 'pen' || activeTool === 'highlighter' ? activeTool : null
  const drawingStyle = drawingTool ? settings[drawingTool] : null

  return (
    <footer className="tool-bar" aria-label="판서 도구 영역">
      <div className="toolbar-label">
        <span className="toolbar-grip" aria-hidden="true" />
        <div>
          <strong>판서 도구</strong>
          <span>{hasDocument ? `${contextLabel} 도구를 선택하세요.` : '수업 자료를 불러온 뒤 사용할 수 있습니다.'}</span>
        </div>
      </div>

      <div className="annotation-toolbar-controls">
        <div className="tool-button-group" aria-label="판서 도구 선택">
          {TOOLS.map(({ tool, label }) => (
            <button
              type="button"
              key={tool}
              className={activeTool === tool ? 'is-active' : undefined}
              aria-pressed={activeTool === tool}
              disabled={
                !hasDocument
                || (tool === 'region-select' && !allowRegionSelect)
                || (!isVisible && tool !== 'none' && tool !== 'region-select')
              }
              onClick={() => onToolChange(tool)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="drawing-style-controls" aria-label="선 색상과 굵기">
          {drawingTool && drawingStyle ? (
            <>
              <div className="color-controls" aria-label="선 색상">
                {COLORS.map((color) => (
                  <button
                    type="button"
                    key={color.value}
                    className={drawingStyle.color === color.value ? 'color-button is-active' : 'color-button'}
                    style={{ '--swatch-color': color.value } as CSSProperties}
                    aria-label={`${color.label} 색상`}
                    aria-pressed={drawingStyle.color === color.value}
                    disabled={!isVisible}
                    onClick={() => onStyleChange(drawingTool, { color: color.value })}
                  />
                ))}
              </div>
              <div className="width-controls" aria-label="선 굵기">
                {WIDTHS.map((width) => (
                  <button
                    type="button"
                    key={width.value}
                    className={drawingStyle.widthPreset === width.value ? 'is-active' : undefined}
                    aria-pressed={drawingStyle.widthPreset === width.value}
                    disabled={!isVisible}
                    onClick={() => onStyleChange(drawingTool, { widthPreset: width.value })}
                  >
                    {width.label}
                  </button>
                ))}
              </div>
            </>
          ) : activeTool === 'region-select' ? (
            <span className="drawing-style-hint">PDF 위에서 문제 전체를 드래그해 선택하세요.</span>
          ) : (
            <span className="drawing-style-hint">펜 또는 형광펜을 선택하면 색상과 굵기를 조절할 수 있습니다.</span>
          )}
        </div>

        <div className="history-controls" aria-label="판서 기록 제어">
          <button type="button" disabled={!hasDocument || !canUndo} onClick={onUndo} aria-label="판서 실행 취소">실행 취소</button>
          <button type="button" disabled={!hasDocument || !canRedo} onClick={onRedo} aria-label="판서 다시 실행">다시 실행</button>
          <button
            type="button"
            className={!isVisible ? 'is-active' : undefined}
            disabled={!hasDocument}
            aria-pressed={!isVisible}
            onClick={onToggleVisibility}
          >
            {isVisible ? '판서 숨기기' : '판서 보이기'}
          </button>
        </div>
      </div>
    </footer>
  )
}
