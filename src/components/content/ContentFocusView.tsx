import { useState } from 'react'
import { CONTENT_TYPE_LABELS } from '../../types/content'
import { useElementSize } from '../../hooks/useElementSize'
import type { CropContentBlock } from '../../types/content'
import type { LoadedPdfDocument } from '../../types/pdf'
import { ContentCropCanvas } from './ProblemCropCanvas'

interface ContentFocusViewProps {
  loadedPdf: LoadedPdfDocument
  block: CropContentBlock
  onReturnToTextbook: () => void
}

export function ContentFocusView({ loadedPdf, block, onReturnToTextbook }: ContentFocusViewProps) {
  const [surface, setSurface] = useState<HTMLDivElement | null>(null)
  const size = useElementSize(surface)

  return (
    <section className="content-focus-view" aria-labelledby="content-focus-title">
      <header className="content-focus-header">
        <div>
          <span className={`content-type-badge content-type-badge--${block.type}`}>{CONTENT_TYPE_LABELS[block.type]}</span>
          <h2 id="content-focus-title" title={block.title}>{block.title}</h2>
          <p>교과서 p.{block.sourcePage}</p>
        </div>
        <button type="button" onClick={onReturnToTextbook}>교과서로</button>
      </header>
      <div className="content-focus-scroll" ref={setSurface}>
        {size.width > 0 && (
          <ContentCropCanvas
            document={loadedPdf.document}
            pageNumber={block.sourcePage}
            region={block.sourceRegion}
            availableWidth={Math.max(1, size.width - 48)}
            availableHeight={Math.max(1, size.height - 48)}
            title={block.title}
            fitMode="adaptive"
          />
        )}
      </div>
    </section>
  )
}
