import { useMemo, useState } from 'react'
import { AnnotationCanvas } from '../annotation/AnnotationCanvas'
import { useElementSize } from '../../hooks/useElementSize'
import type { AnnotationSettings, AnnotationStroke, AnnotationTool } from '../../types/annotation'
import type { PdfViewportMetrics } from '../../types/pdf'

interface ProblemWorkspaceProps {
  title: string
  workspaceHeight: number
  canExpandWorkspace: boolean
  annotationStrokes: AnnotationStroke[]
  annotationTool: AnnotationTool
  annotationSettings: AnnotationSettings
  annotationsVisible: boolean
  onAddStroke: (stroke: AnnotationStroke) => void
  onEraseStrokes: (strokeIds: string[]) => void
  onExpandWorkspace: () => void
}

function getProblemOutputScale(workspaceHeight: number) {
  const safeMaximum = workspaceHeight > 5400 ? 1 : 1.25
  return Math.min(window.devicePixelRatio || 1, safeMaximum)
}

export function ProblemWorkspace({
  title,
  workspaceHeight,
  canExpandWorkspace,
  annotationStrokes,
  annotationTool,
  annotationSettings,
  annotationsVisible,
  onAddStroke,
  onEraseStrokes,
  onExpandWorkspace,
}: ProblemWorkspaceProps) {
  const [solutionElement, setSolutionElement] = useState<HTMLDivElement | null>(null)
  const solutionSize = useElementSize(solutionElement)
  const workspaceWidth = Math.max(1, solutionSize.width)

  const annotationMetrics = useMemo<PdfViewportMetrics>(() => ({
    pageNumber: 1,
    scale: 1,
    width: workspaceWidth,
    height: workspaceHeight,
    baseWidth: workspaceWidth,
    baseHeight: workspaceHeight,
    outputScale: getProblemOutputScale(workspaceHeight),
  }), [workspaceHeight, workspaceWidth])

  return (
    <section className="problem-solution-section" aria-labelledby="solution-space-title">
      <div className="solution-space-heading">
        <div>
          <p>문제 풀이</p>
          <h3 id="solution-space-title">풀이 판서 공간</h3>
        </div>
        <span>현재 {workspaceHeight.toLocaleString()}px · 아래로 이동하며 계속 판서할 수 있습니다.</span>
      </div>
      <div
        className="problem-solution-canvas-space"
        ref={setSolutionElement}
        style={{ height: workspaceHeight }}
        data-workspace-height={workspaceHeight}
      >
        <AnnotationCanvas
          metrics={annotationMetrics}
          strokes={annotationStrokes}
          activeTool={annotationTool}
          settings={annotationSettings}
          isVisible={annotationsVisible}
          onAddStroke={onAddStroke}
          onEraseStrokes={onEraseStrokes}
          ariaLabel={`${title} 풀이 판서 영역`}
          coordinateScope="problem-workspace"
          coordinateMode="problem-logical-y"
        />
        {annotationStrokes.length === 0 && annotationTool === 'none' && (
          <p className="solution-space-guide">하단에서 펜을 선택한 뒤 이 공간에 풀이하세요.</p>
        )}
      </div>
      <div className="workspace-extension-action">
        <button type="button" onClick={onExpandWorkspace} disabled={!canExpandWorkspace}>
          {canExpandWorkspace ? '+ 판서 공간 추가' : '최대 판서 공간에 도달했습니다.'}
        </button>
      </div>
    </section>
  )
}
