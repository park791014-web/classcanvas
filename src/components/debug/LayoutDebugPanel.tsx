import { useEffect, useState } from 'react'

type LayoutDiagnostics = {
  viewport: string
  screen: string
  dpr: number
  pointerCoarse: boolean
  hoverNone: boolean
  standalone: boolean
  mobile: boolean
  tablet: boolean
  desktop: boolean
  mode: 'mobile' | 'tablet' | 'desktop'
  touchLandscapeCompact: boolean
  touchTablet: boolean
  effectiveUi: 'mobile' | 'mobile-landscape' | 'tablet' | 'tablet-touch' | 'desktop'
  navigatorWidth: string
  navigatorPosition: string
  pageControlsDisplay: string
  tabletZoomDisplay: string
  tabletToolbarDisplay: string
  navigatorOpen: boolean
  navigatorRect: string
  navigatorParentRect: string
  workspaceRect: string
  pdfRect: string
  canvasRect: string
  navigatorStyles: string
  navigatorParentStyles: string
  workspaceStyles: string
  pdfStyles: string
  canvasStyles: string
  navigatorPdfOverlap: string
  pdfCoveredByNavigator: boolean
}

function matches(query: string) {
  return window.matchMedia(query).matches
}

function computed(selector: string, property: keyof CSSStyleDeclaration) {
  const element = document.querySelector<HTMLElement>(selector)
  return element ? String(getComputedStyle(element)[property]) : '요소 없음'
}

function elementRect(element: Element | null) {
  if (!element) return '요소 없음'
  const rect = element.getBoundingClientRect()
  return `${Math.round(rect.x)}/${Math.round(rect.y)}/${Math.round(rect.width)}/${Math.round(rect.height)}`
}

function elementStyles(element: Element | null) {
  if (!element) return '요소 없음'
  const style = getComputedStyle(element)
  return [
    `pos:${style.position}`,
    `display:${style.display}`,
    `visible:${style.visibility}`,
    `opacity:${style.opacity}`,
    `z:${style.zIndex}`,
    `overflow:${style.overflow}`,
    `pointer:${style.pointerEvents}`,
    `transform:${style.transform}`,
  ].join(' · ')
}

function readDiagnostics(): LayoutDiagnostics {
  const mobile = matches('(max-width: 767px)')
  const tablet = matches('(min-width: 768px) and (max-width: 1199px)')
  const touchLandscapeCompact = matches(
    '(pointer: coarse) and (hover: none) and (orientation: landscape) and (min-width: 600px) and (max-width: 900px) and (max-height: 500px)',
  )
  const touchTablet = matches(
    '(pointer: coarse) and (hover: none) and (min-width: 901px) and (max-width: 1399px)',
  )
  const mode = mobile ? 'mobile' : tablet ? 'tablet' : 'desktop'
  const navigator = document.querySelector<HTMLElement>('.lesson-navigator')
  const navigatorParent = navigator?.parentElement ?? null
  const workspace = document.querySelector<HTMLElement>('.lesson-workspace')
  const pdf = document.querySelector<HTMLElement>('.pdf-scroll-viewport')
  const canvas = document.querySelector<HTMLCanvasElement>('.pdf-page-canvas')
  const navigatorRect = navigator?.getBoundingClientRect()
  const pdfRect = pdf?.getBoundingClientRect()
  const overlapWidth = navigatorRect && pdfRect
    ? Math.max(0, Math.min(navigatorRect.right, pdfRect.right) - Math.max(navigatorRect.left, pdfRect.left))
    : 0
  const overlapHeight = navigatorRect && pdfRect
    ? Math.max(0, Math.min(navigatorRect.bottom, pdfRect.bottom) - Math.max(navigatorRect.top, pdfRect.top))
    : 0
  const overlapArea = overlapWidth * overlapHeight
  const pdfArea = pdfRect ? pdfRect.width * pdfRect.height : 0
  const overlapRatio = pdfArea > 0 ? overlapArea / pdfArea : 0
  const pdfOutsideViewport = Boolean(pdfRect && (
    pdfRect.right <= 0 || pdfRect.bottom <= 0 || pdfRect.left >= window.innerWidth || pdfRect.top >= window.innerHeight
  ))

  return {
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    screen: `${window.screen.width} × ${window.screen.height}`,
    dpr: window.devicePixelRatio,
    pointerCoarse: matches('(pointer: coarse)'),
    hoverNone: matches('(hover: none)'),
    standalone:
      matches('(display-mode: standalone)') ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone),
    mobile,
    tablet,
    desktop: matches('(min-width: 1200px)'),
    mode,
    touchLandscapeCompact,
    touchTablet,
    effectiveUi: touchLandscapeCompact ? 'mobile-landscape' : touchTablet ? 'tablet-touch' : mode,
    navigatorWidth: computed('.lesson-navigator', 'width'),
    navigatorPosition: computed('.lesson-navigator', 'position'),
    pageControlsDisplay: computed('.topbar-page-controls', 'display'),
    tabletZoomDisplay: computed('.tablet-zoom-controls', 'display'),
    tabletToolbarDisplay: computed('.annotation-toolbar-controls', 'display'),
    navigatorOpen: Boolean(navigator && !navigator.classList.contains('lesson-navigator--collapsed')),
    navigatorRect: elementRect(navigator),
    navigatorParentRect: elementRect(navigatorParent),
    workspaceRect: elementRect(workspace),
    pdfRect: elementRect(pdf),
    canvasRect: elementRect(canvas),
    navigatorStyles: elementStyles(navigator),
    navigatorParentStyles: elementStyles(navigatorParent),
    workspaceStyles: elementStyles(workspace),
    pdfStyles: elementStyles(pdf),
    canvasStyles: elementStyles(canvas),
    navigatorPdfOverlap: `${Math.round(overlapArea)}px² / ${Math.round(overlapRatio * 100)}%`,
    pdfCoveredByNavigator: Boolean(pdfRect && (
      pdfRect.width <= 1 || pdfRect.height <= 1 || pdfOutsideViewport || overlapRatio >= 0.9
    )),
  }
}

export function LayoutDebugPanel() {
  const enabled = new URLSearchParams(window.location.search).get('debug') === 'layout'
  const [diagnostics, setDiagnostics] = useState<LayoutDiagnostics | null>(() =>
    enabled ? readDiagnostics() : null,
  )

  useEffect(() => {
    if (!enabled) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setDiagnostics(readDiagnostics()))
    }
    const observer = new MutationObserver(update)
    observer.observe(document.body, { attributes: true, childList: true, subtree: true })
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    update()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [enabled])

  if (!enabled || !diagnostics) return null

  return (
    <aside className="layout-debug-panel" aria-label="반응형 레이아웃 진단">
      <strong>Layout debug</strong>
      <span>Viewport: {diagnostics.viewport}</span>
      <span>Screen: {diagnostics.screen}</span>
      <span>DPR: {diagnostics.dpr}</span>
      <span>Pointer coarse: {String(diagnostics.pointerCoarse)}</span>
      <span>Hover none: {String(diagnostics.hoverNone)}</span>
      <span>Standalone: {String(diagnostics.standalone)}</span>
      <b>Media</b>
      <span>mobile(&lt;768): {String(diagnostics.mobile)}</span>
      <span>tablet(768-1199): {String(diagnostics.tablet)}</span>
      <span>desktop(&gt;=1200): {String(diagnostics.desktop)}</span>
      <strong>Mode: {diagnostics.mode}</strong>
      <span>Touch landscape compact: {String(diagnostics.touchLandscapeCompact)}</span>
      <span>Touch tablet: {String(diagnostics.touchTablet)}</span>
      <strong>Effective UI: {diagnostics.effectiveUi}</strong>
      <span>Navigator width: {diagnostics.navigatorWidth}</span>
      <span>Navigator position: {diagnostics.navigatorPosition}</span>
      <span>TopBar page controls: {diagnostics.pageControlsDisplay}</span>
      <span>Tablet zoom: {diagnostics.tabletZoomDisplay}</span>
      <span>Tablet toolbar: {diagnostics.tabletToolbarDisplay}</span>
      <b>Rects: x/y/w/h</b>
      <span>Navigator open: {String(diagnostics.navigatorOpen)}</span>
      <span>Navigator rect: {diagnostics.navigatorRect}</span>
      <span>Navigator parent rect: {diagnostics.navigatorParentRect}</span>
      <span>Workspace rect: {diagnostics.workspaceRect}</span>
      <span>PDF rect: {diagnostics.pdfRect}</span>
      <span>Canvas rect: {diagnostics.canvasRect}</span>
      <span>Overlap: {diagnostics.navigatorPdfOverlap}</span>
      <strong>PDF covered by navigator: {String(diagnostics.pdfCoveredByNavigator)}</strong>
      <b>Computed styles</b>
      <span>Navigator: {diagnostics.navigatorStyles}</span>
      <span>Navigator parent: {diagnostics.navigatorParentStyles}</span>
      <span>Workspace: {diagnostics.workspaceStyles}</span>
      <span>PDF: {diagnostics.pdfStyles}</span>
      <span>Canvas: {diagnostics.canvasStyles}</span>
    </aside>
  )
}
