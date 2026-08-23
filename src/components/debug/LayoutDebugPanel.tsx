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
  navigatorWidth: string
  navigatorPosition: string
  pageControlsDisplay: string
  tabletZoomDisplay: string
  tabletToolbarDisplay: string
}

function matches(query: string) {
  return window.matchMedia(query).matches
}

function computed(selector: string, property: keyof CSSStyleDeclaration) {
  const element = document.querySelector<HTMLElement>(selector)
  return element ? String(getComputedStyle(element)[property]) : '요소 없음'
}

function readDiagnostics(): LayoutDiagnostics {
  const mobile = matches('(max-width: 767px)')
  const tablet = matches('(min-width: 768px) and (max-width: 1199px)')

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
    mode: mobile ? 'mobile' : tablet ? 'tablet' : 'desktop',
    navigatorWidth: computed('.lesson-navigator', 'width'),
    navigatorPosition: computed('.lesson-navigator', 'position'),
    pageControlsDisplay: computed('.topbar-page-controls', 'display'),
    tabletZoomDisplay: computed('.tablet-zoom-controls', 'display'),
    tabletToolbarDisplay: computed('.annotation-toolbar-controls', 'display'),
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
      <span>Navigator width: {diagnostics.navigatorWidth}</span>
      <span>Navigator position: {diagnostics.navigatorPosition}</span>
      <span>TopBar page controls: {diagnostics.pageControlsDisplay}</span>
      <span>Tablet zoom: {diagnostics.tabletZoomDisplay}</span>
      <span>Tablet toolbar: {diagnostics.tabletToolbarDisplay}</span>
    </aside>
  )
}
