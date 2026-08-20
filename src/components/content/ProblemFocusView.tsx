import { useState } from 'react'
import { useElementSize } from '../../hooks/useElementSize'
import { ProblemPreviewArea } from './ProblemPreviewArea'
import { ProblemWorkspace } from './ProblemWorkspace'
import type { AnnotationSettings, AnnotationStroke, AnnotationTool } from '../../types/annotation'
import type { ProblemContentBlock } from '../../types/content'
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
}: ProblemFocusViewProps) {
  const [bodyElement, setBodyElement] = useState<HTMLDivElement | null>(null)
  const bodySize = useElementSize(bodyElement)
  const previewMaxHeight = Math.max(120, Math.floor(bodySize.height * 0.3))

  return (
    <div className="problem-focus-view">
      <header className="problem-focus-controls">
        <button type="button" onClick={onReturnToTextbook}>← 교과서로</button>
        <div>
          <span>교과서 p.{problem.sourcePage}</span>
          <strong>{problem.title}</strong>
        </div>
        <span className="problem-source-share">원문 30% · 풀이 70%</span>
      </header>

      <div className="problem-focus-body" ref={setBodyElement}>
        <ProblemPreviewArea loadedPdf={loadedPdf} problem={problem} maxHeight={previewMaxHeight} annotation={sourceAnnotations}
          active={activeSurface === 'source'} onActivate={() => onActiveSurfaceChange('source')} />
        <div className="problem-solution-scroll">
          <ProblemWorkspace
            title={problem.title}
            workspaceHeight={workspaceHeight}
            canExpandWorkspace={canExpandWorkspace}
            annotationStrokes={annotationStrokes}
            annotationTool={annotationTool}
            annotationSettings={annotationSettings}
            annotationsVisible={annotationsVisible}
            onAddStroke={onAddStroke}
            onEraseStrokes={onEraseStrokes}
            onExpandWorkspace={onExpandWorkspace}
            active={activeSurface === 'solution'}
            onActivate={() => onActiveSurfaceChange('solution')}
          />
        </div>
      </div>
    </div>
  )
}
