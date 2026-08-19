import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnalysisReviewPanel } from './components/analysis/AnalysisReviewPanel'
import { ContentFocusView } from './components/content/ContentFocusView'
import { ProblemFocusView } from './components/content/ProblemFocusView'
import { LessonNavigator } from './components/layout/LessonNavigator'
import { LessonWorkspace } from './components/layout/LessonWorkspace'
import { ToolBar } from './components/layout/ToolBar'
import { TopBar } from './components/layout/TopBar'
import { PdfDropZone } from './components/pdf/PdfDropZone'
import { useAnnotations } from './hooks/useAnnotations'
import { useAnalysisCandidates } from './hooks/useAnalysisCandidates'
import { useContentBlocks } from './hooks/useContentBlocks'
import { usePdfDocument, validatePdfFile } from './hooks/usePdfDocument'
import { INITIAL_PROBLEM_WORKSPACE_HEIGHT, useProblemWorkspaces } from './hooks/useProblemWorkspaces'
import { isCropContentBlock, isProblemContentBlock } from './types/content'
import type { ContentBlock, ContentType, SourceRegion } from './types/content'
import type { AnalysisCandidate, AnalysisProgress, AnalysisScope } from './types/analysis'
import type { DocumentState, ZoomMode } from './types/pdf'
import { analyzePage } from './services/contentAnalysis/analyzePage'

const MIN_SCALE = 0.5
const MAX_SCALE = 2.5
const SCALE_STEP = 0.25
const IDLE_ANALYSIS_PROGRESS: AnalysisProgress = { running: false, currentPage: 0, completedPages: 0, totalPages: 0 }

function App() {
  const { loadedPdf, status, error, openPdf } = usePdfDocument()
  const [documentState, setDocumentState] = useState<DocumentState | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null)
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null)
  const [editingCandidateRegionId, setEditingCandidateRegionId] = useState<string | null>(null)
  const [analysisScope, setAnalysisScope] = useState<AnalysisScope>('page')
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>(IDLE_ANALYSIS_PROGRESS)
  const [analysisNotice, setAnalysisNotice] = useState<string | null>(null)
  const [analysisReviewOpen, setAnalysisReviewOpen] = useState(false)
  const analysisAbortRef = useRef<AbortController | null>(null)
  const contentBlocks = useContentBlocks(loadedPdf?.documentId ?? null)
  const analysisCandidates = useAnalysisCandidates(loadedPdf?.documentId ?? null)
  const pageAnnotations = useAnnotations(loadedPdf?.documentId ?? null, documentState?.currentPage ?? 1)
  const selectedContent = useMemo(
    () => contentBlocks.blocks.find((block) => block.id === selectedContentId) ?? null,
    [contentBlocks.blocks, selectedContentId],
  )
  const activeCandidate = useMemo(
    () => analysisCandidates.candidates.find((candidate) => candidate.id === activeCandidateId) ?? null,
    [activeCandidateId, analysisCandidates.candidates],
  )
  const focusedProblem = selectedContent && isProblemContentBlock(selectedContent) ? selectedContent : null
  const focusedCrop = selectedContent && isCropContentBlock(selectedContent) ? selectedContent : null
  const originalPageSelection = selectedContent && !focusedProblem && !focusedCrop ? selectedContent : null
  const problemAnnotationDocumentId = loadedPdf && focusedProblem
    ? `problem:${loadedPdf.documentId}:${focusedProblem.id}`
    : null
  const problemAnnotations = useAnnotations(problemAnnotationDocumentId, 1)
  const problemWorkspace = useProblemWorkspaces(problemAnnotationDocumentId)
  const activeAnnotations = focusedProblem ? problemAnnotations : pageAnnotations
  const isCropFocus = Boolean(focusedCrop)

  useEffect(() => {
    if (!problemAnnotationDocumentId) return
    problemAnnotations.migrateCurrentToLogicalY(INITIAL_PROBLEM_WORKSPACE_HEIGHT)
  }, [problemAnnotationDocumentId, problemAnnotations.migrateCurrentToLogicalY])

  useEffect(() => {
    if (status === 'loading' || status === 'error') setDocumentState(null)
  }, [status])

  useEffect(() => {
    if (!loadedPdf) return
    setSelectedContentId(null)
    setActiveCandidateId(null)
    setEditingCandidateRegionId(null)
    setAnalysisReviewOpen(false)
    setAnalysisNotice(null)
    setDocumentState({
      fileName: loadedPdf.fileName,
      currentPage: 1,
      totalPages: loadedPdf.document.numPages,
      scale: 1,
      zoomMode: 'page-fit',
    })
  }, [loadedPdf])

  useEffect(() => () => analysisAbortRef.current?.abort(), [])

  const handleFileSelected = useCallback((file: File) => {
    const validationError = validatePdfFile(file)
    if (validationError) { setSelectionError(validationError); return }
    setSelectionError(null)
    setSelectedContentId(null)
    setActiveCandidateId(null)
    void openPdf(file)
  }, [openPdf])

  const changePage = useCallback((pageNumber: number) => {
    setSelectedContentId(null)
    setActiveCandidateId(null)
    setEditingCandidateRegionId(null)
    setDocumentState((current) => current ? {
      ...current,
      currentPage: Math.min(current.totalPages, Math.max(1, pageNumber)),
    } : current)
  }, [])

  const changeScale = useCallback((scale: number, zoomMode: ZoomMode = 'manual') => {
    setDocumentState((current) => current ? {
      ...current,
      scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)),
      zoomMode,
    } : current)
  }, [])

  const movePage = useCallback((offset: number) => {
    setSelectedContentId(null)
    setActiveCandidateId(null)
    setEditingCandidateRegionId(null)
    setDocumentState((current) => current ? {
      ...current,
      currentPage: Math.min(current.totalPages, Math.max(1, current.currentPage + offset)),
    } : current)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable)) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) activeAnnotations.redo()
        else activeAnnotations.undo()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault(); activeAnnotations.redo(); return
      }
      if (!focusedProblem && !focusedCrop && (event.key === 'ArrowLeft' || event.key === 'PageUp')) {
        event.preventDefault(); movePage(-1)
      }
      if (!focusedProblem && !focusedCrop && (event.key === 'ArrowRight' || event.key === 'PageDown')) {
        event.preventDefault(); movePage(1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeAnnotations, focusedCrop, focusedProblem, movePage])

  const activeState = loadedPdf ? documentState : null
  const visibleError = selectionError ?? error

  const handleSaveBlock = useCallback((region: SourceRegion, type: ContentType, title: string) => {
    if (!activeState) return
    contentBlocks.addBlock({
      sourceFileName: activeState.fileName,
      sourcePage: activeState.currentPage,
      sourceRegion: region,
      type,
      title,
    })
    pageAnnotations.setActiveTool('none')
  }, [activeState, contentBlocks, pageAnnotations])

  const handleSelectBlock = useCallback((block: ContentBlock) => {
    setDocumentState((current) => current ? { ...current, currentPage: block.sourcePage } : current)
    setSelectedContentId(block.id)
    setActiveCandidateId(null)
  }, [])

  const handleSelectCandidate = useCallback((candidate: AnalysisCandidate) => {
    setSelectedContentId(null)
    setActiveCandidateId(candidate.id)
    setDocumentState((current) => current ? { ...current, currentPage: candidate.sourcePage } : current)
  }, [])

  const handleUpdateCandidate = useCallback((candidateId: string, changes: Partial<AnalysisCandidate>) => {
    analysisCandidates.updateCandidate(candidateId, changes)
    if (changes.sourcePage) setDocumentState((current) => current ? { ...current, currentPage: changes.sourcePage! } : current)
  }, [analysisCandidates])

  const handleAnalyze = useCallback(async () => {
    if (!loadedPdf || !activeState || analysisProgress.running) return
    const controller = new AbortController()
    analysisAbortRef.current = controller
    setSelectedContentId(null)
    setActiveCandidateId(null)
    setEditingCandidateRegionId(null)
    setAnalysisReviewOpen(true)
    setAnalysisNotice(null)
    const pageNumbers = analysisScope === 'page'
      ? [activeState.currentPage]
      : Array.from({ length: activeState.totalPages }, (_, index) => index + 1)
    setAnalysisProgress({ running: true, currentPage: pageNumbers[0], completedPages: 0, totalPages: pageNumbers.length })
    let discovered: AnalysisCandidate[] = []
    let textItemCount = 0

    try {
      for (let index = 0; index < pageNumbers.length; index += 1) {
        if (controller.signal.aborted) break
        const pageNumber = pageNumbers[index]
        setAnalysisProgress({ running: true, currentPage: pageNumber, completedPages: index, totalPages: pageNumbers.length })
        const page = await loadedPdf.document.getPage(pageNumber)
        const result = await analyzePage(page, {
          documentId: loadedPdf.documentId,
          fileName: loadedPdf.fileName,
          pageNumber,
          existingBlocks: contentBlocks.blocks,
          existingCandidates: [...analysisCandidates.candidates, ...discovered],
        })
        discovered = [...discovered, ...result.candidates]
        textItemCount += result.textItemCount
        analysisCandidates.addCandidates(result.candidates)
        setAnalysisProgress({ running: true, currentPage: pageNumber, completedPages: index + 1, totalPages: pageNumbers.length })
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      }

      if (controller.signal.aborted) setAnalysisNotice(`분석을 중지했습니다. 지금까지 찾은 후보 ${discovered.length}개는 유지됩니다.`)
      else if (textItemCount === 0) setAnalysisNotice('이 PDF에서는 자동 텍스트 분석이 제한됩니다. 수동 영역 등록을 이용해 주세요.')
      else if (discovered.length === 0) setAnalysisNotice('새 후보를 찾지 못했습니다. 이미 저장된 영역이거나 뚜렷한 제목 패턴이 없을 수 있습니다.')
      else setAnalysisNotice(`자동 분석 후보 ${discovered.length}개를 찾았습니다. 검수 후 확정해 주세요.`)
    } catch (analysisError) {
      console.error('PDF 콘텐츠를 분석할 수 없습니다.', analysisError)
      setAnalysisNotice('자동 분석 중 오류가 발생했습니다. 수동 영역 등록은 계속 사용할 수 있습니다.')
    } finally {
      analysisAbortRef.current = null
      setAnalysisProgress(IDLE_ANALYSIS_PROGRESS)
    }
  }, [activeState, analysisCandidates, analysisProgress.running, analysisScope, contentBlocks.blocks, loadedPdf])

  const handleAcceptCandidate = useCallback((candidateId: string) => {
    const candidate = analysisCandidates.candidates.find((item) => item.id === candidateId)
    if (!candidate || candidate.status !== 'pending' || !candidate.suggestedTitle.trim()) return
    const relatedContentId = candidate.relatedCandidateId
      ? analysisCandidates.candidates.find((item) => item.id === candidate.relatedCandidateId)?.acceptedContentId
      : undefined
    const contentId = contentBlocks.addBlock({
      type: candidate.type,
      title: candidate.suggestedTitle,
      sourceFileName: candidate.sourceFileName,
      sourcePage: candidate.sourcePage,
      sourceRegion: candidate.sourceRegion,
      relatedContentId,
    })
    if (contentId) analysisCandidates.updateCandidate(candidate.id, { status: 'accepted', acceptedContentId: contentId })
    setEditingCandidateRegionId(null)
  }, [analysisCandidates, contentBlocks])

  const handleAcceptCandidates = useCallback((candidateIds: string[]) => {
    const orderedCandidates = analysisCandidates.candidates.filter((candidate) => candidateIds.includes(candidate.id) && candidate.status === 'pending')
      .sort((first, second) => (
        first.sourcePage - second.sourcePage || first.sourceRegion.y - second.sourceRegion.y
      ))
    const acceptedIds = new Map(analysisCandidates.candidates
      .filter((candidate) => candidate.acceptedContentId)
      .map((candidate) => [candidate.id, candidate.acceptedContentId!]))
    orderedCandidates.forEach((candidate) => {
      const contentId = contentBlocks.addBlock({
        type: candidate.type,
        title: candidate.suggestedTitle,
        sourceFileName: candidate.sourceFileName,
        sourcePage: candidate.sourcePage,
        sourceRegion: candidate.sourceRegion,
        relatedContentId: candidate.relatedCandidateId ? acceptedIds.get(candidate.relatedCandidateId) : undefined,
      })
      if (!contentId) return
      acceptedIds.set(candidate.id, contentId)
      analysisCandidates.updateCandidate(candidate.id, { status: 'accepted', acceptedContentId: contentId })
    })
    setEditingCandidateRegionId(null)
  }, [analysisCandidates, contentBlocks])

  const problemTargetId = useCallback((blockId: string) => loadedPdf
    ? `problem:${loadedPdf.documentId}:${blockId}`
    : null, [loadedPdf])

  const handleUpdateBlock = useCallback((block: ContentBlock, input: { type: ContentType; title: string }) => {
    if (block.type === 'problem' && input.type !== 'problem') {
      const targetId = problemTargetId(block.id)
      if (targetId && (problemAnnotations.hasDocumentAnnotations(targetId) || problemWorkspace.hasWorkspaceState(targetId))) {
        return '풀이 판서 또는 확장 공간이 있는 문제는 다른 종류로 바꿀 수 없습니다.'
      }
    }
    contentBlocks.updateBlock(block.id, input)
    if (selectedContentId === block.id && input.type !== block.type) setSelectedContentId(null)
    return null
  }, [contentBlocks, problemAnnotations, problemTargetId, problemWorkspace, selectedContentId])

  const handleDeleteBlock = useCallback((block: ContentBlock) => {
    if (block.type === 'problem') {
      const targetId = problemTargetId(block.id)
      if (targetId) {
        problemAnnotations.removeDocumentAnnotations(targetId)
        problemWorkspace.removeWorkspace(targetId)
      }
    }
    contentBlocks.removeBlock(block.id)
    if (selectedContentId === block.id) setSelectedContentId(null)
  }, [contentBlocks, problemAnnotations, problemTargetId, problemWorkspace, selectedContentId])

  return (
    <div className="app-shell">
      <TopBar
        documentState={activeState}
        status={status}
        onZoomOut={() => activeState && changeScale(activeState.scale - SCALE_STEP)}
        onZoomIn={() => activeState && changeScale(activeState.scale + SCALE_STEP)}
        onPageFit={() => activeState && changeScale(activeState.scale, 'page-fit')}
        onWidthFit={() => activeState && changeScale(activeState.scale, 'width-fit')}
      />
      <PdfDropZone hasDocument={Boolean(activeState)} onFileSelected={handleFileSelected}>
        <LessonNavigator
          documentState={activeState}
          status={status}
          onFileSelected={handleFileSelected}
          onPageChange={changePage}
          onPreviousPage={() => movePage(-1)}
          onNextPage={() => movePage(1)}
          blocks={contentBlocks.blocks}
          selectedContentId={selectedContentId}
          onSelectBlock={handleSelectBlock}
          onUpdateBlock={handleUpdateBlock}
          onDeleteBlock={handleDeleteBlock}
          analysisScope={analysisScope}
          analysisProgress={analysisProgress}
          analysisCandidateCount={analysisCandidates.candidates.filter((candidate) => candidate.status !== 'accepted').length}
          analysisNotice={analysisNotice}
          onAnalysisScopeChange={setAnalysisScope}
          onAnalyze={() => { void handleAnalyze() }}
          onCancelAnalysis={() => analysisAbortRef.current?.abort()}
          onOpenAnalysisReview={() => { setSelectedContentId(null); setAnalysisReviewOpen(true) }}
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
              onReturnToTextbook={() => setSelectedContentId(null)}
              workspaceHeight={problemWorkspace.workspaceHeight}
              canExpandWorkspace={problemWorkspace.canExpand}
              onExpandWorkspace={problemWorkspace.expandWorkspace}
            />
          </section>
        ) : focusedCrop && loadedPdf ? (
          <section className="lesson-workspace" aria-label="콘텐츠 집중 보기">
            <ContentFocusView loadedPdf={loadedPdf} block={focusedCrop} onReturnToTextbook={() => setSelectedContentId(null)} />
          </section>
        ) : (
          <LessonWorkspace
            loadedPdf={loadedPdf}
            documentState={activeState}
            status={status}
            error={visibleError}
            onDismissError={() => setSelectionError(null)}
            onFileSelected={handleFileSelected}
            onScaleChange={changeScale}
            annotationStrokes={pageAnnotations.strokes}
            annotationTool={pageAnnotations.activeTool}
            annotationSettings={pageAnnotations.settings}
            annotationsVisible={pageAnnotations.isVisible}
            onAddStroke={pageAnnotations.addStroke}
            onEraseStrokes={pageAnnotations.eraseStrokes}
            blocks={contentBlocks.blocks}
            nextTitles={contentBlocks.nextTitles}
            activeContentBlock={originalPageSelection}
            onSaveBlock={handleSaveBlock}
            analysisCandidates={analysisCandidates.candidates}
            activeAnalysisCandidate={activeCandidate}
            editingCandidateRegionId={editingCandidateRegionId}
            onCandidateRegionChange={(candidateId, sourceRegion) => {
              analysisCandidates.updateCandidate(candidateId, { sourceRegion })
              setEditingCandidateRegionId(null)
              setAnalysisReviewOpen(true)
            }}
            onCancelCandidateRegionEdit={() => { setEditingCandidateRegionId(null); setAnalysisReviewOpen(true) }}
            reviewPanel={analysisReviewOpen ? (
              <AnalysisReviewPanel
                candidates={analysisCandidates.candidates}
                totalPages={activeState?.totalPages ?? 1}
                activeCandidateId={activeCandidateId}
                editingRegionCandidateId={editingCandidateRegionId}
                onSelect={handleSelectCandidate}
                onUpdate={handleUpdateCandidate}
                onAccept={handleAcceptCandidate}
                onAcceptMany={handleAcceptCandidates}
                onReject={(candidateId) => analysisCandidates.updateCandidate(candidateId, { status: 'rejected' })}
                onEditRegion={(candidateId) => {
                  setEditingCandidateRegionId(candidateId)
                  if (candidateId) setAnalysisReviewOpen(false)
                }}
                onClear={() => {
                  analysisCandidates.clearUnaccepted()
                  setActiveCandidateId(null)
                  setEditingCandidateRegionId(null)
                }}
                onClose={() => { setAnalysisReviewOpen(false); setEditingCandidateRegionId(null) }}
              />
            ) : undefined}
          />
        )}
      </PdfDropZone>
      <ToolBar
        hasDocument={Boolean(activeState) && !isCropFocus}
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
        allowRegionSelect={!focusedProblem && !focusedCrop}
        contextLabel={focusedProblem ? '문제 풀이' : focusedCrop ? '콘텐츠 보기' : '교과서'}
      />
    </div>
  )
}

export default App
