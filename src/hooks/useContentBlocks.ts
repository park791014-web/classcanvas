import { useCallback, useEffect, useMemo, useState } from 'react'
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_OPTIONS, migrateLegacyContentBlock } from '../types/content'
import type { ContentBlock, ContentType, LegacyCompatibleContentBlock, SourceRegion } from '../types/content'

interface DocumentContentState {
  blocks: LegacyCompatibleContentBlock[]
  nextNumbers?: Partial<Record<ContentType, number>>
  nextProblemNumber?: number
}

export interface AddContentBlockInput {
  type: ContentType
  sourceFileName: string
  sourcePage: number
  sourceRegion: SourceRegion
  title?: string
  relatedContentId?: string
}

export interface UpdateContentBlockInput {
  type: ContentType
  title: string
}

const EMPTY_BLOCKS: ContentBlock[] = []

function createBlockId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export function useContentBlocks(documentId: string | null) {
  const [store, setStore] = useState<Record<string, DocumentContentState>>({})
  const currentState = documentId ? store[documentId] : undefined
  const blocks = useMemo(() => currentState?.blocks.map(migrateLegacyContentBlock) ?? EMPTY_BLOCKS, [currentState?.blocks])
  const nextTitles = useMemo(() => Object.fromEntries(CONTENT_TYPE_OPTIONS.map(({ value }) => [
    value,
    `${CONTENT_TYPE_LABELS[value]} ${currentState?.nextNumbers?.[value] ?? (value === 'problem' ? currentState?.nextProblemNumber : undefined) ?? 1}`,
  ])) as Record<ContentType, string>, [currentState])

  useEffect(() => {
    if (!documentId || !currentState?.blocks.some((block) => migrateLegacyContentBlock(block) !== block)) return
    setStore((currentStore) => {
      const documentState = currentStore[documentId]
      if (!documentState) return currentStore
      return {
        ...currentStore,
        [documentId]: {
          ...documentState,
          blocks: documentState.blocks.map(migrateLegacyContentBlock),
        },
      }
    })
  }, [currentState?.blocks, documentId])

  const addBlock = useCallback((input: AddContentBlockInput) => {
    if (!documentId) return null
    const id = createBlockId()

    setStore((currentStore) => {
      const documentState = currentStore[documentId] ?? { blocks: [], nextNumbers: {} }
      const nextNumber = documentState.nextNumbers?.[input.type]
        ?? (input.type === 'problem' ? documentState.nextProblemNumber : undefined)
        ?? 1
      const title = input.title?.trim() || `${CONTENT_TYPE_LABELS[input.type]} ${nextNumber}`
      const block: ContentBlock = {
        id,
        type: input.type,
        title,
        sourceDocumentId: documentId,
        sourceFileName: input.sourceFileName,
        sourcePage: input.sourcePage,
        sourceRegion: input.sourceRegion,
        createdAt: Date.now(),
        relatedContentId: input.relatedContentId,
      }

      return {
        ...currentStore,
        [documentId]: {
          blocks: [...documentState.blocks, block],
          nextNumbers: {
            ...documentState.nextNumbers,
            [input.type]: nextNumber + 1,
          },
          nextProblemNumber: input.type === 'problem' ? nextNumber + 1 : documentState.nextProblemNumber,
        },
      }
    })

    return id
  }, [documentId])

  const updateBlock = useCallback((blockId: string, input: UpdateContentBlockInput) => {
    if (!documentId || !input.title.trim()) return
    setStore((currentStore) => {
      const documentState = currentStore[documentId]
      if (!documentState) return currentStore
      return {
        ...currentStore,
        [documentId]: {
          ...documentState,
          blocks: documentState.blocks.map((storedBlock) => {
            const block = migrateLegacyContentBlock(storedBlock)
            return block.id === blockId ? { ...block, type: input.type, title: input.title.trim() } : block
          }),
        },
      }
    })
  }, [documentId])

  const removeBlock = useCallback((blockId: string) => {
    if (!documentId) return
    setStore((currentStore) => {
      const documentState = currentStore[documentId]
      if (!documentState) return currentStore
      return {
        ...currentStore,
        [documentId]: {
          ...documentState,
          blocks: documentState.blocks.filter((block) => block.id !== blockId),
        },
      }
    })
  }, [documentId])

  return {
    blocks,
    nextTitles,
    addBlock,
    updateBlock,
    removeBlock,
  }
}
