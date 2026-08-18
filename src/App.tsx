import { useCallback, useEffect, useState } from 'react'
import { LessonNavigator } from './components/layout/LessonNavigator'
import { LessonWorkspace } from './components/layout/LessonWorkspace'
import { ToolBar } from './components/layout/ToolBar'
import { TopBar } from './components/layout/TopBar'
import { usePdfDocument, validatePdfFile } from './hooks/usePdfDocument'
import type { DocumentState, ZoomMode } from './types/pdf'

const MIN_SCALE = 0.5
const MAX_SCALE = 2.5
const SCALE_STEP = 0.25

function App() {
  const { loadedPdf, status, error, openPdf } = usePdfDocument()
  const [documentState, setDocumentState] = useState<DocumentState | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading' || status === 'error') {
      setDocumentState(null)
    }
  }, [status])

  useEffect(() => {
    if (!loadedPdf) return

    setDocumentState({
      fileName: loadedPdf.fileName,
      currentPage: 1,
      totalPages: loadedPdf.document.numPages,
      scale: 1,
      zoomMode: 'page-fit',
    })
  }, [loadedPdf])

  const handleFileSelected = useCallback((file: File) => {
    const validationError = validatePdfFile(file)

    if (validationError) {
      setSelectionError(validationError)
      return
    }

    setSelectionError(null)
    void openPdf(file)
  }, [openPdf])

  const changePage = useCallback((pageNumber: number) => {
    setDocumentState((current) => {
      if (!current) return current

      return {
        ...current,
        currentPage: Math.min(current.totalPages, Math.max(1, pageNumber)),
      }
    })
  }, [])

  const changeScale = useCallback((scale: number, zoomMode: ZoomMode = 'manual') => {
    setDocumentState((current) => current ? {
      ...current,
      scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)),
      zoomMode,
    } : current)
  }, [])

  const movePage = useCallback((offset: number) => {
    setDocumentState((current) => current ? {
      ...current,
      currentPage: Math.min(current.totalPages, Math.max(1, current.currentPage + offset)),
    } : current)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        movePage(-1)
      }

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault()
        movePage(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [movePage])

  const activeState = loadedPdf ? documentState : null
  const visibleError = selectionError ?? error

  return (
    <div className="app-shell">
      <TopBar documentState={activeState} status={status} />
      <main className="lesson-layout" aria-label="수업 작업 영역">
        <LessonNavigator
          documentState={activeState}
          status={status}
          onFileSelected={handleFileSelected}
          onPageChange={changePage}
          onPreviousPage={() => movePage(-1)}
          onNextPage={() => movePage(1)}
        />
        <LessonWorkspace
          loadedPdf={loadedPdf}
          documentState={activeState}
          status={status}
          error={visibleError}
          onDismissError={() => setSelectionError(null)}
          onFileSelected={handleFileSelected}
          onPageChange={changePage}
          onPreviousPage={() => movePage(-1)}
          onNextPage={() => movePage(1)}
          onZoomOut={() => activeState && changeScale(activeState.scale - SCALE_STEP)}
          onZoomIn={() => activeState && changeScale(activeState.scale + SCALE_STEP)}
          onPageFit={() => activeState && changeScale(activeState.scale, 'page-fit')}
          onWidthFit={() => activeState && changeScale(activeState.scale, 'width-fit')}
          onScaleChange={changeScale}
        />
      </main>
      <ToolBar />
    </div>
  )
}

export default App
