import { useCallback, useEffect, useState } from 'react'
import { LessonNavigator } from './components/layout/LessonNavigator'
import { LessonWorkspace } from './components/layout/LessonWorkspace'
import { ToolBar } from './components/layout/ToolBar'
import { TopBar } from './components/layout/TopBar'
import { ProblemFocusView } from './components/content/ProblemFocusView'
import { useAnnotations } from './hooks/useAnnotations'
import { useContentBlocks } from './hooks/useContentBlocks'
import { usePdfDocument, validatePdfFile } from './hooks/usePdfDocument'
import { INITIAL_PROBLEM_WORKSPACE_HEIGHT, useProblemWorkspaces } from './hooks/useProblemWorkspaces'
import type { ProblemContentBlock, SourceRegion } from './types/content'
import type { DocumentState, ZoomMode } from './types/pdf'

const MIN_SCALE = 0.5
const MAX_SCALE = 2.5
const SCALE_STEP = 0.25

function App() {
  const { loadedPdf, status, error, openPdf } = usePdfDocument()
  const [documentState, setDocumentState] = useState<DocumentState | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [focusedProblemId, setFocusedProblemId] = useState<string | null>(null)
  const contentBlocks = useContentBlocks(loadedPdf?.documentId ?? null)
  const pageAnnotations = useAnnotations(loadedPdf?.documentId ?? null, documentState?.currentPage ?? 1)
  const problemAnnotationDocumentId = loadedPdf && focusedProblemId
    ? `problem:${loadedPdf.documentId}:${focusedProblemId}`
    : null
  const problemAnnotations = useAnnotations(problemAnnotationDocumentId, 1)
  const problemWorkspace = useProblemWorkspaces(problemAnnotationDocumentId)
  const focusedProblem = contentBlocks.problems.find((problem) => problem.id === focusedProblemId) ?? null
  const activeAnnotations = focusedProblem ? problemAnnotations : pageAnnotations

  useEffect(() => {
    if (!problemAnnotationDocumentId) return
    problemAnnotations.migrateCurrentToLogicalY(INITIAL_PROBLEM_WORKSPACE_HEIGHT)
  }, [problemAnnotationDocumentId, problemAnnotations.migrateCurrentToLogicalY])

  useEffect(() => {
    if (status === 'loading' || status === 'error') {
      setDocumentState(null)
    }
  }, [status])

  useEffect(() => {
    if (!loadedPdf) return

    setFocusedProblemId(null)

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
    setFocusedProblemId(null)
    void openPdf(file)
  }, [openPdf])

  const changePage = useCallback((pageNumber: number) => {
    setFocusedProblemId(null)
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
    setFocusedProblemId(null)
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

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) activeAnnotations.redo()
        else activeAnnotations.undo()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        activeAnnotations.redo()
        return
      }

      if (!focusedProblem && (event.key === 'ArrowLeft' || event.key === 'PageUp')) {
        event.preventDefault()
        movePage(-1)
      }

      if (!focusedProblem && (event.key === 'ArrowRight' || event.key === 'PageDown')) {
        event.preventDefault()
        movePage(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeAnnotations, focusedProblem, movePage])

  const activeState = loadedPdf ? documentState : null
  const visibleError = selectionError ?? error

  const handleSaveProblem = useCallback((region: SourceRegion, title: string) => {
    if (!activeState) return
    contentBlocks.addProblem({
      sourceFileName: activeState.fileName,
      sourcePage: activeState.currentPage,
      sourceRegion: region,
      title,
    })
    pageAnnotations.setActiveTool('none')
  }, [activeState, contentBlocks, pageAnnotations])

  const handleSelectProblem = useCallback((problem: ProblemContentBlock) => {
    setDocumentState((current) => current ? { ...current, currentPage: problem.sourcePage } : current)
    setFocusedProblemId(problem.id)
  }, [])

  const handleDeleteProblem = useCallback((problem: ProblemContentBlock) => {
    if (!loadedPdf) return
    problemAnnotations.removeDocumentAnnotations(`problem:${loadedPdf.documentId}:${problem.id}`)
    problemWorkspace.removeWorkspace(`problem:${loadedPdf.documentId}:${problem.id}`)
    contentBlocks.removeProblem(problem.id)
    if (focusedProblemId === problem.id) setFocusedProblemId(null)
  }, [contentBlocks, focusedProblemId, loadedPdf, problemAnnotations, problemWorkspace])

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
          problems={contentBlocks.problems}
          focusedProblemId={focusedProblemId}
          onSelectProblem={handleSelectProblem}
          onRenameProblem={contentBlocks.renameProblem}
          onDeleteProblem={handleDeleteProblem}
        />
        {focusedProblem && loadedPdf ? (
          <section className="lesson-workspace" aria-label="문제 집중 보기">
            <ProblemFocusView
              loadedPdf={loadedPdf}
              problem={focusedProblem}
              annotationStrokes={problemAnnotations.strokes}
              annotationTool={problemAnnotations.activeTool}
              annotationSettings={problemAnnotations.settings}
              annotationsVisible={problemAnnotations.isVisible}
              onAddStroke={problemAnnotations.addStroke}
              onEraseStrokes={problemAnnotations.eraseStrokes}
              onReturnToTextbook={() => setFocusedProblemId(null)}
              workspaceHeight={problemWorkspace.workspaceHeight}
              canExpandWorkspace={problemWorkspace.canExpand}
              onExpandWorkspace={problemWorkspace.expandWorkspace}
            />
          </section>
        ) : (
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
          annotationStrokes={pageAnnotations.strokes}
          annotationTool={pageAnnotations.activeTool}
          annotationSettings={pageAnnotations.settings}
          annotationsVisible={pageAnnotations.isVisible}
          onAddStroke={pageAnnotations.addStroke}
          onEraseStrokes={pageAnnotations.eraseStrokes}
          problems={contentBlocks.problems}
          nextProblemTitle={contentBlocks.nextProblemTitle}
          onSaveProblem={handleSaveProblem}
          />
        )}
      </main>
      <ToolBar
        hasDocument={Boolean(activeState)}
        activeTool={activeAnnotations.activeTool}
        settings={activeAnnotations.settings}
        isVisible={activeAnnotations.isVisible}
        canUndo={activeAnnotations.canUndo}
        canRedo={activeAnnotations.canRedo}
        onToolChange={activeAnnotations.setActiveTool}
        onStyleChange={activeAnnotations.updateDrawingStyle}
        onUndo={activeAnnotations.undo}
        onRedo={activeAnnotations.redo}
        onToggleVisibility={activeAnnotations.toggleVisibility}
        allowRegionSelect={!focusedProblem}
        contextLabel={focusedProblem ? '문제 풀이' : '교과서'}
      />
    </div>
  )
}

export default App
