import { useCallback, useMemo, useState } from 'react'
import { AnnotationCanvas } from '../annotation/AnnotationCanvas'
import { CONTENT_TYPE_LABELS } from '../../types/content'
import { useElementSize } from '../../hooks/useElementSize'
import type { AnnotationSettings, AnnotationStroke, AnnotationTool } from '../../types/annotation'
import type { FocusContentBlock } from '../../types/content'
import type { LoadedPdfDocument, PdfViewportMetrics } from '../../types/pdf'
import { ContentCropCanvas } from './ProblemCropCanvas'

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
}

type LayoutMode = 'vertical' | 'horizontal' | 'original'
type ContentFitMode = 'all' | 'readable'

function NotesSurface({ annotation, active, title, onActivate }: {
  annotation: ContentAnnotationSurface
  active: boolean
  title: string
  onActivate: () => void
}) {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const size = useElementSize(element)
  const metrics = useMemo<PdfViewportMetrics>(() => ({
    pageNumber: 1, scale: 1,
    width: Math.max(1, size.width), height: Math.max(1, size.height),
    baseWidth: Math.max(1, size.width), baseHeight: Math.max(1, size.height),
    outputScale: Math.min(window.devicePixelRatio || 1, 1.5),
  }), [size.height, size.width])

  return (
    <section className={`content-notes-panel${active ? ' is-active' : ''}`} onPointerDownCapture={onActivate}>
      <span className="surface-label">설명 · 판서</span>
      <div className="content-notes-surface" ref={setElement}>
        {size.width > 0 && size.height > 0 && (
          <AnnotationCanvas metrics={metrics} strokes={annotation.strokes} activeTool={active ? annotation.activeTool : 'none'} settings={annotation.settings}
            isVisible={annotation.isVisible} onAddStroke={annotation.onAddStroke} onEraseStrokes={annotation.onEraseStrokes}
            ariaLabel={`${title} 설명 판서 영역`} />
        )}
      </div>
    </section>
  )
}

export function ContentFocusView({ loadedPdf, block, sourceAnnotations, notesAnnotations, activeSurface, onActiveSurfaceChange, onReturnToTextbook }: ContentFocusViewProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('vertical')
  const [fitMode, setFitMode] = useState<ContentFitMode>('readable')
  const [sourceElement, setSourceElement] = useState<HTMLDivElement | null>(null)
  const [cropMetrics, setCropMetrics] = useState<PdfViewportMetrics | null>(null)
  const sourceSize = useElementSize(sourceElement)
  const updateMetrics = useCallback((metrics: PdfViewportMetrics) => setCropMetrics(metrics), [])
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
          <div className="segmented-control" aria-label="레이아웃">
            <button type="button" className={layoutMode === 'vertical' ? 'is-active' : undefined} onClick={() => setLayoutMode('vertical')}>상하형</button>
            <button type="button" className={layoutMode === 'horizontal' ? 'is-active' : undefined} onClick={() => setLayoutMode('horizontal')}>좌우형</button>
            <button type="button" className={layoutMode === 'original' ? 'is-active' : undefined} onClick={() => { setLayoutMode('original'); onActiveSurfaceChange('source') }}>원문확대형</button>
          </div>
          <div className="segmented-control" aria-label="원문 표시 크기">
            <button type="button" className={fitMode === 'all' ? 'is-active' : undefined} onClick={() => setFitMode('all')}>전체 맞춤</button>
            <button type="button" className={fitMode === 'readable' ? 'is-active' : undefined} onClick={() => setFitMode('readable')}>원문 맞춤</button>
          </div>
        </div>
      </header>
      <div className={`content-focus-body content-focus-body--${layoutMode}`}>
        <section className={`content-source-panel${sourceActive ? ' is-active' : ''}`} onPointerDownCapture={() => onActiveSurfaceChange('source')}>
          <span className="surface-label">원문 · 직접 판서</span>
          <div className="content-source-scroll" ref={setSourceElement}>
            {sourceSize.width > 0 && sourceSize.height > 0 && (
              <div className="content-crop-stage" style={cropMetrics ? { width: cropMetrics.width, height: cropMetrics.height } : undefined}>
                <ContentCropCanvas document={loadedPdf.document} pageNumber={block.sourcePage} region={block.sourceRegion}
                  availableWidth={Math.max(1, sourceSize.width - 20)} availableHeight={Math.max(1, sourceSize.height - 20)}
                  title={block.title} fitMode={fitMode === 'all' ? 'adaptive' : 'width'} onMetricsChange={updateMetrics} />
                {cropMetrics && (
                  <AnnotationCanvas metrics={cropMetrics} strokes={sourceAnnotations.strokes} activeTool={sourceActive ? sourceAnnotations.activeTool : 'none'}
                    settings={sourceAnnotations.settings} isVisible={sourceAnnotations.isVisible} onAddStroke={sourceAnnotations.onAddStroke}
                    onEraseStrokes={sourceAnnotations.onEraseStrokes} ariaLabel={`${block.title} 원문 판서 영역`} />
                )}
              </div>
            )}
          </div>
        </section>
        {layoutMode !== 'original' && <NotesSurface annotation={notesAnnotations} active={activeSurface === 'notes'} title={block.title} onActivate={() => onActiveSurfaceChange('notes')} />}
      </div>
    </section>
  )
}
