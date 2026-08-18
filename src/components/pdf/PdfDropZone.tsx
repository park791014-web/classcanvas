import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { validatePdfFile } from '../../hooks/usePdfDocument'

interface PdfDropZoneProps {
  children: ReactNode
  hasDocument: boolean
  onFileSelected: (file: File) => void
}

function containsFiles(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes('Files')
}

export function PdfDropZone({ children, hasDocument, onFileSelected }: PdfDropZoneProps) {
  const dragDepthRef = useRef(0)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!containsFiles(event)) return
    event.preventDefault()
    dragDepthRef.current += 1
    setIsDraggingFile(true)
  }

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!containsFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (dragDepthRef.current === 0) dragDepthRef.current = 1
    setIsDraggingFile(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (dragDepthRef.current === 0) return
    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDraggingFile(false)
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    dragDepthRef.current = 0
    setIsDraggingFile(false)

    const file = event.dataTransfer.files[0]
    if (!file) return

    const validationError = validatePdfFile(file)
    if (validationError) {
      setDropError('PDF 파일만 열 수 있습니다.')
      return
    }

    setDropError(null)
    onFileSelected(file)
  }

  return (
    <main
      className={`lesson-layout pdf-drop-zone${isDraggingFile ? ' is-dragging-file' : ''}`}
      aria-label="수업 작업 영역"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDraggingFile && (
        <div className="pdf-drop-overlay" aria-hidden="true">
          <strong>PDF를 여기에 놓으세요</strong>
          <span>{hasDocument ? '놓으면 현재 PDF를 새 파일로 교체합니다.' : '파일은 브라우저 안에서만 열립니다.'}</span>
        </div>
      )}
      {dropError && (
        <div className="pdf-drop-error" role="alert">
          <span>{dropError}</span>
          <button type="button" onClick={() => setDropError(null)} aria-label="드롭 오류 메시지 닫기">닫기</button>
        </div>
      )}
    </main>
  )
}
