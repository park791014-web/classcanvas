import { useCallback, useState } from 'react'
import type { ProblemContentBlock, SourceRegion } from '../types/content'

interface DocumentContentState {
  blocks: ProblemContentBlock[]
  nextProblemNumber: number
}

interface AddProblemInput {
  sourceFileName: string
  sourcePage: number
  sourceRegion: SourceRegion
  title?: string
}

const EMPTY_BLOCKS: ProblemContentBlock[] = []

function createBlockId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export function useContentBlocks(documentId: string | null) {
  const [store, setStore] = useState<Record<string, DocumentContentState>>({})
  const currentState = documentId ? store[documentId] : undefined
  const problems = currentState?.blocks ?? EMPTY_BLOCKS
  const nextProblemTitle = `문제 ${currentState?.nextProblemNumber ?? 1}`

  const addProblem = useCallback((input: AddProblemInput) => {
    if (!documentId) return null
    const id = createBlockId()

    setStore((currentStore) => {
      const documentState = currentStore[documentId] ?? { blocks: [], nextProblemNumber: 1 }
      const title = input.title?.trim() || `문제 ${documentState.nextProblemNumber}`
      const block: ProblemContentBlock = {
        id,
        type: 'problem',
        title,
        sourceDocumentId: documentId,
        sourceFileName: input.sourceFileName,
        sourcePage: input.sourcePage,
        sourceRegion: input.sourceRegion,
        createdAt: Date.now(),
      }

      return {
        ...currentStore,
        [documentId]: {
          blocks: [...documentState.blocks, block],
          nextProblemNumber: documentState.nextProblemNumber + 1,
        },
      }
    })

    return id
  }, [documentId])

  const renameProblem = useCallback((problemId: string, title: string) => {
    if (!documentId || !title.trim()) return
    setStore((currentStore) => {
      const documentState = currentStore[documentId]
      if (!documentState) return currentStore
      return {
        ...currentStore,
        [documentId]: {
          ...documentState,
          blocks: documentState.blocks.map((block) => block.id === problemId
            ? { ...block, title: title.trim() }
            : block),
        },
      }
    })
  }, [documentId])

  const removeProblem = useCallback((problemId: string) => {
    if (!documentId) return
    setStore((currentStore) => {
      const documentState = currentStore[documentId]
      if (!documentState) return currentStore
      return {
        ...currentStore,
        [documentId]: {
          ...documentState,
          blocks: documentState.blocks.filter((block) => block.id !== problemId),
        },
      }
    })
  }, [documentId])

  return {
    problems,
    nextProblemTitle,
    addProblem,
    renameProblem,
    removeProblem,
  }
}
