import { useCallback, useState } from 'react'
import { useElementSize } from '../../hooks/useElementSize'
import { ProblemExpandedView } from './ProblemExpandedView'
import { ProblemPreviewArea } from './ProblemPreviewArea'
import { ProblemWorkspace } from './ProblemWorkspace'
import type { AnnotationSettings, AnnotationStroke, AnnotationTool } from '../../types/annotation'
import type { ProblemContentBlock } from '../../types/content'
import type { LoadedPdfDocument } from '../../types/pdf'

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
}: ProblemFocusViewProps) {
  const [bodyElement, setBodyElement] = useState<HTMLDivElement | null>(null)
  const [isProblemExpanded, setIsProblemExpanded] = useState(false)
  const bodySize = useElementSize(bodyElement)
  const previewMaxHeight = Math.max(120, Math.floor(bodySize.height * 0.3))
  const closeProblemView = useCallback(() => setIsProblemExpanded(false), [])

  return (
    <div className="problem-focus-view">
      <header className="problem-focus-controls">
        <button type="button" onClick={onReturnToTextbook}>← 교과서로</button>
        <div>
          <span>교과서 p.{problem.sourcePage}</span>
          <strong>{problem.title}</strong>
        </div>
        <button type="button" onClick={() => setIsProblemExpanded(true)} aria-label={`${problem.title} 원본 크게 보기`}>
          문제 보기
        </button>
      </header>

      <div className="problem-focus-body" ref={setBodyElement}>
        <ProblemPreviewArea loadedPdf={loadedPdf} problem={problem} maxHeight={previewMaxHeight} />
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
          />
        </div>
      </div>

      {isProblemExpanded && (
        <ProblemExpandedView loadedPdf={loadedPdf} problem={problem} onClose={closeProblemView} />
      )}
    </div>
  )
}
