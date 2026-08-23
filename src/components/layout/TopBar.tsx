import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { DocumentState, PdfLoadStatus } from '../../types/pdf'
import { PdfViewerControls } from '../pdf/PdfViewerControls'
import { PdfFileButton } from '../pdf/PdfFileButton'
import packageMetadata from '../../../package.json'
import { MAX_ZOOM_SCALE, MIN_MANUAL_ZOOM_SCALE } from '../../constants/zoom'

interface TopBarProps {
  documentState: DocumentState | null
  status: PdfLoadStatus
  onZoomOut: () => void
  onZoomIn: () => void
  onPageFit: () => void
  onWidthFit: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  onFileSelected: (file: File) => void
}

export function TopBar({
  documentState,
  status,
  onZoomOut,
  onZoomIn,
  onPageFit,
  onWidthFit,
  onPreviousPage,
  onNextPage,
  onFileSelected,
}: TopBarProps) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const aboutTriggerRef = useRef<HTMLButtonElement>(null)
  const aboutDialogRef = useRef<HTMLDivElement>(null)
  const aboutCloseRef = useRef<HTMLButtonElement>(null)
  const statusText = status === 'loading' ? 'PDF 불러오는 중' : documentState?.fileName ?? '현재 자료 없음'
  const privacyPolicyUrl = `${import.meta.env.BASE_URL}privacy/`

  useEffect(() => {
    if (!aboutOpen) return
    aboutCloseRef.current?.focus()
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setAboutOpen(false)
      aboutTriggerRef.current?.focus()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [aboutOpen])

  const closeAbout = () => {
    setAboutOpen(false)
    aboutTriggerRef.current?.focus()
  }

  const keepFocusInDialog = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const focusable = [...(aboutDialogRef.current?.querySelectorAll<HTMLElement>('button, a[href]') ?? [])]
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable.at(-1)!
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  return (
    <header className="top-bar">
      <div className="brand-block">
        <span className="brand-mark" aria-hidden="true">L</span>
        <h1>LessonCanvas</h1>
        <button ref={aboutTriggerRef} type="button" className="about-trigger" aria-label="LessonCanvas 정보" aria-haspopup="dialog"
          aria-expanded={aboutOpen} onClick={() => setAboutOpen(true)}>ⓘ</button>
      </div>
      <div className="material-status" aria-label="현재 수업 자료 상태" title={statusText}>
        <span className="status-indicator" aria-hidden="true" />
        <span className="material-file-name">{statusText}</span>
        {documentState && <PdfFileButton label="다른 PDF 열기" onFileSelected={onFileSelected} />}
      </div>
      <PdfViewerControls
        documentState={documentState}
        onZoomOut={onZoomOut}
        onZoomIn={onZoomIn}
        onPageFit={onPageFit}
        onWidthFit={onWidthFit}
      />
      <nav className="topbar-page-controls" aria-label="PDF 페이지 이동">
        <button type="button" disabled={!documentState || documentState.currentPage === 1} onClick={onPreviousPage} aria-label="이전 페이지">‹</button>
        <output aria-label="현재 교과서 페이지">{documentState ? `p.${documentState.currentPage}` : 'p.-'}</output>
        <button type="button" disabled={!documentState || documentState.currentPage === documentState.totalPages} onClick={onNextPage} aria-label="다음 페이지">›</button>
        <span className="tablet-zoom-controls" aria-label="태블릿 PDF 보기 조절">
          <button type="button" onClick={onZoomOut} disabled={!documentState || documentState.scale <= MIN_MANUAL_ZOOM_SCALE} aria-label="태블릿 PDF 축소">−</button>
          <output aria-label="태블릿 PDF 확대 비율">{Math.round((documentState?.scale ?? 1) * 100)}%</output>
          <button type="button" onClick={onZoomIn} disabled={!documentState || documentState.scale >= MAX_ZOOM_SCALE} aria-label="태블릿 PDF 확대">＋</button>
          <button type="button" className="tablet-fit-button" onClick={onPageFit} disabled={!documentState}
            aria-label="높이 맞춤" title="높이 맞춤" aria-pressed={documentState?.zoomMode === 'page-fit'}>↕</button>
          <button type="button" className="tablet-fit-button" onClick={onWidthFit} disabled={!documentState}
            aria-label="폭 맞춤" title="폭 맞춤" aria-pressed={documentState?.zoomMode === 'width-fit'}>↔</button>
        </span>
      </nav>
      {aboutOpen && (
        <div className="about-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) closeAbout() }}>
          <div ref={aboutDialogRef} className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title" onKeyDown={keepFocusInDialog}>
            <div className="about-dialog-heading">
              <h2 id="about-title">LessonCanvas v{packageMetadata.version}</h2>
              <button ref={aboutCloseRef} type="button" aria-label="정보 닫기" onClick={closeAbout}>닫기</button>
            </div>
            <strong>Designed by Mordenai</strong>
            <p>수업 및 교육 활동 지원용 도구</p>
            <div className="about-contact">
              <span>문의</span>
              <a href="mailto:equations@naver.com">equations@naver.com</a>
            </div>
            <a className="about-privacy-link" href={privacyPolicyUrl} target="_blank" rel="noreferrer">
              개인정보 처리 안내
            </a>
            <p className="about-copyright">외부 교과서·문제·이미지의 저작권은<br />각 원저작권자에게 있습니다.</p>
          </div>
        </div>
      )}
    </header>
  )
}
