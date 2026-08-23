import { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentLoadingTask } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { LoadedPdfDocument, PdfLoadStatus } from '../types/pdf'

const GENERIC_PDF_ERROR = '이 PDF 파일을 열 수 없습니다. 다른 파일을 선택해 주세요.'
const PDFJS_ASSET_BASE_URL = `${import.meta.env.BASE_URL}pdfjs/`

function getPdfErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === 'PasswordException') {
    return '암호로 보호된 PDF는 현재 열 수 없습니다.'
  }

  return GENERIC_PDF_ERROR
}

export function validatePdfFile(file: File) {
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf')
  const hasAllowedMimeType = !file.type || file.type === 'application/pdf'

  if (!hasPdfExtension || !hasAllowedMimeType) {
    return 'PDF 파일만 선택할 수 있습니다.'
  }

  return null
}

export function usePdfDocument() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdfDocument | null>(null)
  const [status, setStatus] = useState<PdfLoadStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null)
  const requestIdRef = useRef(0)

  const disposeCurrentDocument = useCallback(() => {
    loadingTaskRef.current?.destroy()
    loadingTaskRef.current = null

    setLoadedPdf(null)
  }, [])

  const openPdf = useCallback(async (file: File) => {
    const requestId = ++requestIdRef.current
    setStatus('loading')
    setError(null)
    disposeCurrentDocument()

    try {
      const { GlobalWorkerOptions, VerbosityLevel, getDocument } = await import('pdfjs-dist')
      GlobalWorkerOptions.workerSrc = pdfWorkerUrl
      const fileData = new Uint8Array(await file.arrayBuffer())

      if (requestId !== requestIdRef.current) {
        return
      }

      const loadingTask = getDocument({
        data: fileData,
        cMapUrl: `${PDFJS_ASSET_BASE_URL}cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${PDFJS_ASSET_BASE_URL}standard_fonts/`,
        wasmUrl: `${PDFJS_ASSET_BASE_URL}wasm/`,
        useSystemFonts: true,
        verbosity: VerbosityLevel.WARNINGS,
      })
      loadingTaskRef.current = loadingTask
      const document = await loadingTask.promise

      if (requestId !== requestIdRef.current) {
        await loadingTask.destroy()
        return
      }

      setLoadedPdf({
        documentId: `${file.name}:${file.size}:${file.lastModified}`,
        fileName: file.name,
        document,
      })
      setStatus('ready')
    } catch (loadError) {
      if (requestId !== requestIdRef.current) {
        return
      }

      await loadingTaskRef.current?.destroy()
      loadingTaskRef.current = null
      setStatus('error')
      setError(getPdfErrorMessage(loadError))
    }
  }, [disposeCurrentDocument])

  useEffect(() => {
    return () => {
      requestIdRef.current += 1
      loadingTaskRef.current?.destroy()
    }
  }, [])

  return {
    loadedPdf,
    status,
    error,
    openPdf,
  }
}
