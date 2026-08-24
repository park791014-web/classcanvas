import { ProblemPreviewArea } from './ProblemPreviewArea'
import { ProblemWorkspace } from './ProblemWorkspace'
import { ContentViewModeSelector } from './ContentViewModeSelector'
import { CanvasContentWorkspace } from './CanvasContentWorkspace'
import { ResizableSplit } from './ResizableSplit'
import { HorizontalWritingWorkspace } from './HorizontalWritingWorkspace'
import { ContentCanvasZoomControls } from './ContentCanvasZoomControls'
import { UnifiedSplitAnnotationInput } from './UnifiedSplitAnnotationInput'
import type { AnnotationSettings, AnnotationStroke, AnnotationTool } from '../../types/annotation'
import type { ContentViewMode, ContentWorkspaceState, ProblemContentBlock } from '../../types/content'
import type { LoadedPdfDocument } from '../../types/pdf'
import type { ContentAnnotationSurface } from './ContentFocusView'

interface ProblemFocusViewProps {
  loadedPdf: LoadedPdfDocument
  problem: ProblemContentBlock
  annotationStrokes: AnnotationStroke[]
  annotationTool: AnnotationTool
  annotationSettings: AnnotationSettings
  annotationsVisible: boolean
  workspaceHeight: number
  canExpandWorkspace: boolean
  onAddStroke: (stroke: AnnotationStroke) => void
  onEraseStrokes: (strokeIds: string[]) => void
  onReturnToTextbook: () => void
  onExpandWorkspace: () => void
  sourceAnnotations: ContentAnnotationSurface
  activeSurface: 'source' | 'solution'
  onActiveSurfaceChange: (surface: 'source' | 'solution') => void
  viewMode: ContentViewMode
  onViewModeChange: (mode: ContentViewMode) => void
  workspaceState: ContentWorkspaceState
  onWorkspaceStateChange: (changes: Partial<ContentWorkspaceState>) => void
}

export function ProblemFocusView({
  loadedPdf,
  problem,
  annotationStrokes,
  annotationTool,
  annotationSettings,
  annotationsVisible,
  workspaceHeight,
  canExpandWorkspace,
  onAddStroke,
  onEraseStrokes,
  onReturnToTextbook,
  onExpandWorkspace,
  sourceAnnotations,
  activeSurface,
  onActiveSurfaceChange,
  viewMode,
  onViewModeChange,
  workspaceState,
  onWorkspaceStateChange,
}: ProblemFocusViewProps) {
  const workspaceAnnotations: ContentAnnotationSurface = {
    strokes: annotationStrokes,
    activeTool: annotationTool,
    settings: annotationSettings,
    isVisible: annotationsVisible,
    onAddStroke,
    onEraseStrokes,
  }
  const usesUnifiedSplitInput = annotationTool === 'pen' || annotationTool === 'highlighter'
  const sourceRenderAnnotations = usesUnifiedSplitInput ? { ...sourceAnnotations, activeTool: 'none' as const } : sourceAnnotations
  const workspaceRenderAnnotations = usesUnifiedSplitInput ? { ...workspaceAnnotations, activeTool: 'none' as const } : workspaceAnnotations

  return (
    <div className="problem-focus-view">
      <header className="problem-focus-controls">
        <button type="button" onClick={onReturnToTextbook}>← 교과서로</button>
        <div>
          <span>교과서 p.{problem.sourcePage}</span>
          <strong>{problem.title}</strong>
        </div>
        <div className="content-view-controls" aria-label="문제 보기 설정">
          <ContentViewModeSelector value={viewMode} onChange={onViewModeChange} />
          {viewMode === 'canvas' && <ContentCanvasZoomControls state={workspaceState} onStateChange={onWorkspaceStateChange} />}
        </div>
      </header>

      {viewMode === 'canvas' ? (
        <CanvasContentWorkspace
          loadedPdf={loadedPdf}
          block={problem}
          sourceAnnotations={sourceAnnotations}
          workspaceAnnotations={workspaceAnnotations}
          workspaceHeight={workspaceHeight}
          workspaceCoordinateMode="problem-logical-y"
          state={workspaceState}
          onStateChange={onWorkspaceStateChange}
          onWorkspaceActivate={() => onActiveSurfaceChange('solution')}
        />
      ) : (
        <div className="problem-focus-body">
          <ResizableSplit
            orientation={viewMode}
            ratio={viewMode === 'vertical' ? workspaceState.verticalRatio : workspaceState.horizontalRatio}
            onRatioChange={(ratio) => onWorkspaceStateChange(viewMode === 'vertical' ? { verticalRatio: ratio } : { horizontalRatio: ratio })}
            label={viewMode === 'vertical' ? '상하 영역 크기 조절' : '좌우 영역 크기 조절'}
            source={(
              <ProblemPreviewArea loadedPdf={loadedPdf} problem={problem} orientation={viewMode} annotation={sourceRenderAnnotations}
                active={activeSurface === 'source'} onActivate={() => onActiveSurfaceChange('source')} />
            )}
            writing={viewMode === 'horizontal' ? (
              <HorizontalWritingWorkspace
                title={problem.title}
                annotation={workspaceRenderAnnotations}
                coordinateMode="problem-logical-y"
                workspaceHeight={workspaceHeight}
                active={activeSurface === 'solution'}
                onActivate={() => onActiveSurfaceChange('solution')}
                canExpand={canExpandWorkspace}
                onExpand={onExpandWorkspace}
              />
            ) : (
              <div className="problem-solution-scroll">
                <ProblemWorkspace
                  title={problem.title}
                  workspaceHeight={workspaceHeight}
                  canExpandWorkspace={canExpandWorkspace}
                  annotationStrokes={annotationStrokes}
                  annotationTool={workspaceRenderAnnotations.activeTool}
                  annotationSettings={annotationSettings}
                  annotationsVisible={annotationsVisible}
                  onAddStroke={onAddStroke}
                  onEraseStrokes={onEraseStrokes}
                  onExpandWorkspace={onExpandWorkspace}
                  active={activeSurface === 'solution'}
                  onActivate={() => onActiveSurfaceChange('solution')}
                />
              </div>
            )}
            overlay={usesUnifiedSplitInput ? (
              <UnifiedSplitAnnotationInput
                orientation={viewMode}
                title={problem.title}
                source={sourceAnnotations}
                writing={workspaceAnnotations}
                writingWorldSelector={viewMode === 'vertical' ? '.problem-solution-canvas-space' : '.horizontal-writing-world'}
                onActiveTargetChange={(target) => onActiveSurfaceChange(target === 'source' ? 'source' : 'solution')}
              />
            ) : undefined}
          />
        </div>
      )}
    </div>
  )
}
