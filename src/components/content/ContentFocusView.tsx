import { useEffect, useMemo, useState } from 'react'
import { AnnotationCanvas } from '../annotation/AnnotationCanvas'
import { CLASSROOM_STROKE_WIDTH_REFERENCE } from '../annotation/annotationSizing'
import { CONTENT_TYPE_LABELS } from '../../types/content'
import { useElementSize } from '../../hooks/useElementSize'
import type { AnnotationSettings, AnnotationStroke, AnnotationTool } from '../../types/annotation'
import type { ContentViewMode, ContentWorkspaceState, FocusContentBlock } from '../../types/content'
import type { LoadedPdfDocument, PdfViewportMetrics } from '../../types/pdf'
import { ContentViewModeSelector } from './ContentViewModeSelector'
import { CanvasContentWorkspace } from './CanvasContentWorkspace'
import { ContentSourcePane } from './ContentSourcePane'
import { ResizableSplit } from './ResizableSplit'
import { HorizontalWritingWorkspace } from './HorizontalWritingWorkspace'
import { ContentCanvasZoomControls } from './ContentCanvasZoomControls'

export interface ContentAnnotationSurface {
  strokes: AnnotationStroke[]
  activeTool: AnnotationTool
  settings: AnnotationSettings
  isVisible: boolean
  onAddStroke: (stroke: AnnotationStroke) => void
  onEraseStrokes: (strokeIds: string[]) => void
}

interface ContentFocusViewProps {
  loadedPdf: LoadedPdfDocument
  block: FocusContentBlock
  sourceAnnotations: ContentAnnotationSurface
  notesAnnotations: ContentAnnotationSurface
  activeSurface: 'source' | 'notes'
  onActiveSurfaceChange: (surface: 'source' | 'notes') => void
  onReturnToTextbook: () => void
  viewMode: ContentViewMode
  onViewModeChange: (mode: ContentViewMode) => void
  workspaceState: ContentWorkspaceState
  onWorkspaceStateChange: (changes: Partial<ContentWorkspaceState>) => void
}

const CONTENT_NOTES_LOGICAL_HEIGHT = 3000

function NotesSurface({ annotation, active, title, onActivate }: {
  annotation: ContentAnnotationSurface
  active: boolean
  title: string
  onActivate: () => void
}) {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const size = useElementSize(element)
  const [logicalWidth, setLogicalWidth] = useState<number | null>(null)
  useEffect(() => {
    if (logicalWidth || size.width <= 0) return
    setLogicalWidth(size.width)
  }, [logicalWidth, size.width])
  const metrics = useMemo<PdfViewportMetrics>(() => ({
    pageNumber: 1, scale: 1,
    width: Math.max(1, logicalWidth ?? 1), height: CONTENT_NOTES_LOGICAL_HEIGHT,
    baseWidth: Math.max(1, logicalWidth ?? 1), baseHeight: CONTENT_NOTES_LOGICAL_HEIGHT,
    outputScale: Math.min(window.devicePixelRatio || 1, 1.25),
  }), [logicalWidth])

  return (
    <section className={`content-notes-panel${active ? ' is-active' : ''}`} onPointerDownCapture={onActivate}>
      <div className="content-notes-scroll" ref={setElement}>
        {logicalWidth && (
          <div className="content-notes-surface" style={{ width: logicalWidth, height: CONTENT_NOTES_LOGICAL_HEIGHT }} data-workspace-height={CONTENT_NOTES_LOGICAL_HEIGHT}>
            <AnnotationCanvas metrics={metrics} strokes={annotation.strokes} activeTool={annotation.activeTool} settings={annotation.settings}
              isVisible={annotation.isVisible} onAddStroke={annotation.onAddStroke} onEraseStrokes={annotation.onEraseStrokes}
              ariaLabel={`${title} 설명 판서 영역`} coordinateScope="content-workspace" coordinateMode="problem-logical-y"
              strokeWidthReference={CLASSROOM_STROKE_WIDTH_REFERENCE} />
          </div>
        )}
      </div>
    </section>
  )
}

export function ContentFocusView({
  loadedPdf, block, sourceAnnotations, notesAnnotations, activeSurface, onActiveSurfaceChange, onReturnToTextbook,
  viewMode, onViewModeChange, workspaceState, onWorkspaceStateChange,
}: ContentFocusViewProps) {
  const sourceActive = activeSurface === 'source'

  return (
    <section className="content-focus-view" aria-labelledby="content-focus-title">
      <header className="content-focus-header">
        <button type="button" className="return-button" onClick={onReturnToTextbook}>← 교과서로</button>
        <div className="content-focus-title-block">
          <span className={`content-type-badge content-type-badge--${block.type}`}>{CONTENT_TYPE_LABELS[block.type]}</span>
          <h2 id="content-focus-title" title={block.title}>{block.title}</h2>
          <p>p.{block.sourcePage}</p>
        </div>
        <div className="content-view-controls" aria-label="콘텐츠 보기 설정">
          <ContentViewModeSelector value={viewMode} onChange={onViewModeChange} />
          {viewMode === 'canvas' && <ContentCanvasZoomControls state={workspaceState} onStateChange={onWorkspaceStateChange} />}
        </div>
      </header>
      {viewMode === 'canvas' ? (
        <CanvasContentWorkspace
          loadedPdf={loadedPdf}
          block={block}
          sourceAnnotations={sourceAnnotations}
          workspaceAnnotations={notesAnnotations}
          workspaceHeight={2200}
          workspaceCoordinateMode="problem-logical-y"
          state={workspaceState}
          onStateChange={onWorkspaceStateChange}
          onWorkspaceActivate={() => onActiveSurfaceChange('notes')}
        />
      ) : (
        <div className="content-focus-body">
          <ResizableSplit
            orientation={viewMode}
            ratio={viewMode === 'vertical' ? workspaceState.verticalRatio : workspaceState.horizontalRatio}
            onRatioChange={(ratio) => onWorkspaceStateChange(viewMode === 'vertical' ? { verticalRatio: ratio } : { horizontalRatio: ratio })}
            label={viewMode === 'vertical' ? '상하 영역 크기 조절' : '좌우 영역 크기 조절'}
            source={(
              <ContentSourcePane loadedPdf={loadedPdf} block={block} orientation={viewMode} annotation={sourceAnnotations}
                active={sourceActive} onActivate={() => onActiveSurfaceChange('source')} />
            )}
            writing={viewMode === 'horizontal' ? (
              <HorizontalWritingWorkspace
                title={block.title}
                annotation={notesAnnotations}
                coordinateMode="problem-logical-y"
                workspaceHeight={CONTENT_NOTES_LOGICAL_HEIGHT}
                active={activeSurface === 'notes'}
                onActivate={() => onActiveSurfaceChange('notes')}
              />
            ) : (
              <NotesSurface annotation={notesAnnotations} active={activeSurface === 'notes'} title={block.title} onActivate={() => onActiveSurfaceChange('notes')} />
            )}
          />
        </div>
      )}
    </section>
  )
}
