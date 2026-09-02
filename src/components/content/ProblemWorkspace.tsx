import { useEffect, useMemo, useState } from 'react'
import { AnnotationCanvas } from '../annotation/AnnotationCanvas'
import { CLASSROOM_STROKE_WIDTH_REFERENCE } from '../annotation/annotationSizing'
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
  active: boolean
  onActivate: () => void
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
  active,
  onActivate,
}: ProblemWorkspaceProps) {
  const [solutionElement, setSolutionElement] = useState<HTMLDivElement | null>(null)
  const [logicalWidth, setLogicalWidth] = useState<number | null>(null)
  const solutionSize = useElementSize(solutionElement)
  useEffect(() => {
    if (logicalWidth || solutionSize.width <= 0) return
    setLogicalWidth(solutionSize.width)
  }, [logicalWidth, solutionSize.width])
  const workspaceWidth = Math.max(1, logicalWidth ?? solutionSize.width)
  const logicalWorkspaceHeight = Math.max(workspaceHeight, window.innerHeight * 5)

  const annotationMetrics = useMemo<PdfViewportMetrics>(() => ({
    pageNumber: 1,
    scale: 1,
    width: workspaceWidth,
    height: logicalWorkspaceHeight,
    baseWidth: workspaceWidth,
    baseHeight: logicalWorkspaceHeight,
    outputScale: getProblemOutputScale(logicalWorkspaceHeight),
  }), [logicalWorkspaceHeight, workspaceWidth])

  return (
    <section className={`problem-solution-section${active ? ' is-active' : ''}`} aria-label={`${title} 풀이 판서 공간`} onPointerDownCapture={onActivate}>
      <div
        className="problem-solution-canvas-space"
        ref={setSolutionElement}
        style={{ width: logicalWidth ?? '100%', height: logicalWorkspaceHeight }}
        data-workspace-height={logicalWorkspaceHeight}
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
          strokeWidthReference={CLASSROOM_STROKE_WIDTH_REFERENCE}
        />
      </div>
      <div className="workspace-extension-action">
        <button type="button" onClick={onExpandWorkspace} disabled={!canExpandWorkspace}>
          {canExpandWorkspace ? '+ 판서 공간 추가' : '최대 판서 공간에 도달했습니다.'}
        </button>
      </div>
    </section>
  )
}
