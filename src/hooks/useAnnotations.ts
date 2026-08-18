import { useCallback, useEffect, useState } from 'react'
import type {
  AnnotationSettings,
  AnnotationStroke,
  AnnotationTool,
  DocumentAnnotations,
  DrawingStyle,
  DrawingTool,
  PageAnnotationHistory,
} from '../types/annotation'

const EMPTY_STROKES: AnnotationStroke[] = []

const DEFAULT_SETTINGS: AnnotationSettings = {
  pen: { color: '#111827', widthPreset: 'normal' },
  highlighter: { color: '#facc15', widthPreset: 'normal' },
}

function createPageHistory(): PageAnnotationHistory {
  return { past: [], present: [], future: [] }
}

function createDocumentAnnotations(): DocumentAnnotations {
  return { pages: {}, isVisible: true }
}

export function useAnnotations(documentId: string | null, pageNumber: number) {
  const [store, setStore] = useState<Record<string, DocumentAnnotations>>({})
  const [activeTool, setActiveTool] = useState<AnnotationTool>('none')
  const [settings, setSettings] = useState<AnnotationSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    setActiveTool('none')
  }, [documentId])

  const currentDocument = documentId ? store[documentId] : undefined
  const currentHistory = currentDocument?.pages[pageNumber]
  const strokes = currentHistory?.present ?? EMPTY_STROKES
  const isVisible = currentDocument?.isVisible ?? true

  const commitStrokes = useCallback((getNext: (current: AnnotationStroke[]) => AnnotationStroke[]) => {
    if (!documentId) return

    setStore((currentStore) => {
      const documentAnnotations = currentStore[documentId] ?? createDocumentAnnotations()
      const pageHistory = documentAnnotations.pages[pageNumber] ?? createPageHistory()
      const nextStrokes = getNext(pageHistory.present)

      if (nextStrokes === pageHistory.present) return currentStore

      return {
        ...currentStore,
        [documentId]: {
          ...documentAnnotations,
          pages: {
            ...documentAnnotations.pages,
            [pageNumber]: {
              past: [...pageHistory.past, pageHistory.present],
              present: nextStrokes,
              future: [],
            },
          },
        },
      }
    })
  }, [documentId, pageNumber])

  const addStroke = useCallback((stroke: AnnotationStroke) => {
    commitStrokes((current) => [...current, stroke])
  }, [commitStrokes])

  const eraseStrokes = useCallback((strokeIds: string[]) => {
    if (strokeIds.length === 0) return
    const ids = new Set(strokeIds)
    commitStrokes((current) => {
      const next = current.filter((stroke) => !ids.has(stroke.id))
      return next.length === current.length ? current : next
    })
  }, [commitStrokes])

  const undo = useCallback(() => {
    if (!documentId) return

    setStore((currentStore) => {
      const documentAnnotations = currentStore[documentId]
      const pageHistory = documentAnnotations?.pages[pageNumber]
      if (!documentAnnotations || !pageHistory || pageHistory.past.length === 0) return currentStore

      const previous = pageHistory.past.at(-1) ?? []
      return {
        ...currentStore,
        [documentId]: {
          ...documentAnnotations,
          pages: {
            ...documentAnnotations.pages,
            [pageNumber]: {
              past: pageHistory.past.slice(0, -1),
              present: previous,
              future: [pageHistory.present, ...pageHistory.future],
            },
          },
        },
      }
    })
  }, [documentId, pageNumber])

  const redo = useCallback(() => {
    if (!documentId) return

    setStore((currentStore) => {
      const documentAnnotations = currentStore[documentId]
      const pageHistory = documentAnnotations?.pages[pageNumber]
      if (!documentAnnotations || !pageHistory || pageHistory.future.length === 0) return currentStore

      const [next, ...remainingFuture] = pageHistory.future
      return {
        ...currentStore,
        [documentId]: {
          ...documentAnnotations,
          pages: {
            ...documentAnnotations.pages,
            [pageNumber]: {
              past: [...pageHistory.past, pageHistory.present],
              present: next,
              future: remainingFuture,
            },
          },
        },
      }
    })
  }, [documentId, pageNumber])

  const toggleVisibility = useCallback(() => {
    if (!documentId) return
    setStore((currentStore) => {
      const documentAnnotations = currentStore[documentId] ?? createDocumentAnnotations()
      return {
        ...currentStore,
        [documentId]: {
          ...documentAnnotations,
          isVisible: !documentAnnotations.isVisible,
        },
      }
    })
  }, [documentId])

  const updateDrawingStyle = useCallback((tool: DrawingTool, nextStyle: Partial<DrawingStyle>) => {
    setSettings((current) => ({
      ...current,
      [tool]: { ...current[tool], ...nextStyle },
    }))
  }, [])

  return {
    activeTool,
    setActiveTool,
    settings,
    updateDrawingStyle,
    strokes,
    addStroke,
    eraseStrokes,
    undo,
    redo,
    canUndo: Boolean(currentHistory?.past.length),
    canRedo: Boolean(currentHistory?.future.length),
    isVisible,
    toggleVisibility,
  }
}
