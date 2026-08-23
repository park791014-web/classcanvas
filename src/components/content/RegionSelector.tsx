import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { CONTENT_TYPE_LABELS } from '../../types/content'
import type { ContentBlock, ContentType, SourceRegion } from '../../types/content'
import { ContentBlockEditor } from './ContentBlockEditor'

interface RegionSelectorProps {
  active: boolean
  defaultTitles: Record<ContentType, string>
  savedBlocks: ContentBlock[]
  activeBlockId: string | null
  onSave: (region: SourceRegion, type: ContentType, title: string) => void
}

interface NormalizedPosition {
  x: number
  y: number
}

const MIN_SELECTION_SIZE = 28
const PANEL_GAP = 10
const VIEWPORT_PADDING = 8

function clamp(value: number) {
  return Math.min(1, Math.max(0, value))
}

function toRegion(start: NormalizedPosition, end: NormalizedPosition): SourceRegion {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

function regionStyle(region: SourceRegion) {
  return {
    left: `${region.x * 100}%`,
    top: `${region.y * 100}%`,
    width: `${region.width * 100}%`,
    height: `${region.height * 100}%`,
  }
}

export function RegionSelector({ active, defaultTitles, savedBlocks, activeBlockId, onSave }: RegionSelectorProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const draftOutlineRef = useRef<HTMLDivElement>(null)
  const savePanelRef = useRef<HTMLFormElement>(null)
  const pointerIdRef = useRef<number | null>(null)
  const startRef = useRef<NormalizedPosition | null>(null)
  const [draftRegion, setDraftRegion] = useState<SourceRegion | null>(null)
  const [draftType, setDraftType] = useState<ContentType>('problem')
  const [draftTitle, setDraftTitle] = useState(defaultTitles.problem)
  const [message, setMessage] = useState<string | null>(null)
  const [savePanelPosition, setSavePanelPosition] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    if (!draftRegion) setDraftTitle(defaultTitles[draftType])
  }, [defaultTitles, draftRegion, draftType])

  useEffect(() => {
    if (active) return
    pointerIdRef.current = null
    startRef.current = null
    setDraftRegion(null)
    setMessage(null)
    setSavePanelPosition(null)
  }, [active])

  const positionSavePanel = useCallback(() => {
    const selectionOutline = draftOutlineRef.current
    const panel = savePanelRef.current
    if (!draftRegion || !selectionOutline || !panel) return

    const selectionBounds = selectionOutline.getBoundingClientRect()
    const panelBounds = panel.getBoundingClientRect()
    const visualViewport = window.visualViewport
    const viewportLeft = visualViewport?.offsetLeft ?? 0
    const viewportTop = visualViewport?.offsetTop ?? 0
    const viewportRight = viewportLeft + (visualViewport?.width ?? window.innerWidth)
    const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight)
    const selectionLeft = selectionBounds.left
    const selectionTop = selectionBounds.top
    const selectionRight = selectionBounds.right
    const selectionBottom = selectionBounds.bottom
    const panelWidth = panelBounds.width
    const panelHeight = panelBounds.height
    const clampLeft = (value: number) => Math.min(
      viewportRight - panelWidth - VIEWPORT_PADDING,
      Math.max(viewportLeft + VIEWPORT_PADDING, value),
    )
    const clampTop = (value: number) => Math.min(
      viewportBottom - panelHeight - VIEWPORT_PADDING,
      Math.max(viewportTop + VIEWPORT_PADDING, value),
    )

    const centeredLeft = clampLeft(selectionLeft + (selectionBounds.width - panelWidth) / 2)
    const centeredTop = clampTop(selectionTop + (selectionBounds.height - panelHeight) / 2)
    const belowTop = selectionBottom + PANEL_GAP
    const aboveTop = selectionTop - panelHeight - PANEL_GAP
    const rightLeft = selectionRight + PANEL_GAP
    const leftLeft = selectionLeft - panelWidth - PANEL_GAP
    let left = centeredLeft
    let top = belowTop

    if (belowTop + panelHeight <= viewportBottom - VIEWPORT_PADDING) {
      top = belowTop
    } else if (aboveTop >= viewportTop + VIEWPORT_PADDING) {
      top = aboveTop
    } else if (rightLeft + panelWidth <= viewportRight - VIEWPORT_PADDING) {
      left = rightLeft
      top = centeredTop
    } else if (leftLeft >= viewportLeft + VIEWPORT_PADDING) {
      left = leftLeft
      top = centeredTop
    } else {
      top = clampTop(belowTop)
    }

    setSavePanelPosition({ left: clampLeft(left), top: clampTop(top) })
  }, [draftRegion])

  useLayoutEffect(() => {
    if (!draftRegion || pointerIdRef.current !== null) return
    positionSavePanel()
    const panel = savePanelRef.current
    const resizeObserver = panel ? new ResizeObserver(positionSavePanel) : null
    if (panel) resizeObserver?.observe(panel)
    window.addEventListener('resize', positionSavePanel)
    window.addEventListener('scroll', positionSavePanel, true)
    window.visualViewport?.addEventListener('resize', positionSavePanel)
    window.visualViewport?.addEventListener('scroll', positionSavePanel)
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', positionSavePanel)
      window.removeEventListener('scroll', positionSavePanel, true)
      window.visualViewport?.removeEventListener('resize', positionSavePanel)
      window.visualViewport?.removeEventListener('scroll', positionSavePanel)
    }
  }, [draftRegion, positionSavePanel])

  const toPosition = (event: ReactPointerEvent<HTMLDivElement>): NormalizedPosition => {
    const bounds = surfaceRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0 }
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!active || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerIdRef.current = event.pointerId
    const start = toPosition(event)
    startRef.current = start
    setDraftRegion({ x: start.x, y: start.y, width: 0, height: 0 })
    setMessage(null)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId || !startRef.current) return
    event.preventDefault()
    setDraftRegion(toRegion(startRef.current, toPosition(event)))
  }

  const finishSelection = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (pointerIdRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const finalRegion = startRef.current ? toRegion(startRef.current, toPosition(event)) : null
    pointerIdRef.current = null
    startRef.current = null

    if (cancelled || !finalRegion) {
      setDraftRegion(null)
      return
    }

    if (finalRegion.width * bounds.width < MIN_SELECTION_SIZE || finalRegion.height * bounds.height < MIN_SELECTION_SIZE) {
      setDraftRegion(null)
      setMessage('선택 영역이 너무 작습니다. 문제 전체가 들어가도록 다시 드래그해 주세요.')
      return
    }

    setDraftRegion(finalRegion)
    setDraftType('problem')
    setDraftTitle(defaultTitles.problem)
  }

  const cancelDraft = () => {
    setDraftRegion(null)
    setDraftType('problem')
    setDraftTitle(defaultTitles.problem)
    setMessage(null)
    setSavePanelPosition(null)
  }

  const saveDraft = () => {
    if (!draftRegion) return
    onSave(draftRegion, draftType, draftTitle)
    cancelDraft()
  }

  const changeDraftType = (nextType: ContentType) => {
    const previousDefault = defaultTitles[draftType]
    setDraftType(nextType)
    if (!draftTitle.trim() || draftTitle === previousDefault) setDraftTitle(defaultTitles[nextType])
  }

  return (
    <div className="region-selector-layer" data-selection-active={active}>
      {savedBlocks.map((block) => (
        <div
          key={block.id}
          className={`saved-region-outline${activeBlockId === block.id ? ' is-active' : ''}`}
          style={regionStyle(block.sourceRegion)}
          aria-hidden="true"
        >
          <span>{CONTENT_TYPE_LABELS[block.type]} · {block.title}</span>
        </div>
      ))}

      {active && (
        <div
          ref={surfaceRef}
          className="region-selection-surface"
          aria-label="콘텐츠 영역 선택"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishSelection(event, false)}
          onPointerCancel={(event) => finishSelection(event, true)}
        />
      )}

      {draftRegion && <div ref={draftOutlineRef} className="draft-region-outline" style={regionStyle(draftRegion)} aria-hidden="true" />}

      {active && draftRegion && draftRegion.width > 0 && draftRegion.height > 0 && pointerIdRef.current === null && createPortal((
        <form
          ref={savePanelRef}
          className="region-save-panel"
          style={{
            left: savePanelPosition?.left ?? VIEWPORT_PADDING,
            top: savePanelPosition?.top ?? VIEWPORT_PADDING,
            visibility: savePanelPosition ? 'visible' : 'hidden',
          } as CSSProperties}
          onSubmit={(event) => { event.preventDefault(); saveDraft() }}
        >
          <strong>선택 영역 저장</strong>
          <ContentBlockEditor
            type={draftType}
            title={draftTitle}
            onTypeChange={changeDraftType}
            onTitleChange={setDraftTitle}
          />
          <div>
            <button type="button" onClick={cancelDraft}>취소</button>
            <button type="submit" className="primary-action">저장</button>
          </div>
        </form>
      ), document.body)}

      {active && message && <div className="region-selection-message" role="status">{message}</div>}
      {active && !draftRegion && !message && <div className="region-selection-guide">저장할 콘텐츠 영역을 드래그해 선택하세요.</div>}
    </div>
  )
}
