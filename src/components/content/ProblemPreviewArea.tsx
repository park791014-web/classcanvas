import { ContentSourcePane } from './ContentSourcePane'
import type { ContentAnnotationSurface } from './ContentFocusView'
import type { ProblemContentBlock } from '../../types/content'
import type { LoadedPdfDocument } from '../../types/pdf'

interface ProblemPreviewAreaProps {
  loadedPdf: LoadedPdfDocument
  problem: ProblemContentBlock
  orientation: 'vertical' | 'horizontal'
  annotation: ContentAnnotationSurface
  active: boolean
  onActivate: () => void
}

export function ProblemPreviewArea({ loadedPdf, problem, orientation, annotation, active, onActivate }: ProblemPreviewAreaProps) {
  return (
    <section className="problem-source-card" aria-label={`${problem.title} 미리보기`}>
      <ContentSourcePane loadedPdf={loadedPdf} block={problem} orientation={orientation} annotation={annotation}
        active={active} onActivate={onActivate} />
    </section>
  )
}
