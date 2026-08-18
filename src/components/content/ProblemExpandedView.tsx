import { useEffect, useState } from 'react'
import { useElementSize } from '../../hooks/useElementSize'
import { ProblemCropCanvas } from './ProblemCropCanvas'
import type { ProblemContentBlock } from '../../types/content'
import type { LoadedPdfDocument } from '../../types/pdf'

interface ProblemExpandedViewProps {
  loadedPdf: LoadedPdfDocument
  problem: ProblemContentBlock
  onClose: () => void
}

export function ProblemExpandedView({ loadedPdf, problem, onClose }: ProblemExpandedViewProps) {
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null)
  const contentSize = useElementSize(contentElement)
  const availableWidth = Math.max(1, contentSize.width - 36)
  const availableHeight = Math.max(1, contentSize.height - 36)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="problem-expanded-overlay" role="dialog" aria-modal="true" aria-labelledby="expanded-problem-title">
      <div className="problem-expanded-panel">
        <header>
          <div>
            <span>교과서 p.{problem.sourcePage}</span>
            <h2 id="expanded-problem-title">{problem.title} 전체 보기</h2>
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label="문제 전체 보기 닫기">닫기</button>
        </header>
        <div className="problem-expanded-scroll" ref={setContentElement}>
          <ProblemCropCanvas
            document={loadedPdf.document}
            pageNumber={problem.sourcePage}
            region={problem.sourceRegion}
            availableWidth={availableWidth}
            availableHeight={availableHeight}
            title={`${problem.title} 전체 보기`}
            fitMode="adaptive"
          />
        </div>
      </div>
    </div>
  )
}
