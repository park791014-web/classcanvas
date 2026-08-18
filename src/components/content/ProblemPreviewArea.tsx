import { useState } from 'react'
import { useElementSize } from '../../hooks/useElementSize'
import { ProblemCropCanvas } from './ProblemCropCanvas'
import type { ProblemContentBlock } from '../../types/content'
import type { LoadedPdfDocument } from '../../types/pdf'

interface ProblemPreviewAreaProps {
  loadedPdf: LoadedPdfDocument
  problem: ProblemContentBlock
  maxHeight: number
}

const PREVIEW_READABLE_WIDTH = 780

export function ProblemPreviewArea({ loadedPdf, problem, maxHeight }: ProblemPreviewAreaProps) {
  const [previewElement, setPreviewElement] = useState<HTMLDivElement | null>(null)
  const previewSize = useElementSize(previewElement)

  return (
    <section className="problem-source-card" aria-label={`${problem.title} 미리보기`}>
      <div
        className="problem-preview-scroll"
        ref={setPreviewElement}
        style={{ maxHeight }}
        data-preview-max-height={maxHeight}
      >
        <ProblemCropCanvas
          document={loadedPdf.document}
          pageNumber={problem.sourcePage}
          region={problem.sourceRegion}
          availableWidth={Math.max(1, Math.min(previewSize.width, PREVIEW_READABLE_WIDTH))}
          title={problem.title}
        />
      </div>
    </section>
  )
}
