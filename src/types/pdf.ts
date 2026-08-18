import type { PDFDocumentProxy } from 'pdfjs-dist'

export type PdfLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export type ZoomMode = 'manual' | 'page-fit' | 'width-fit'

export interface DocumentState {
  fileName: string
  currentPage: number
  totalPages: number
  scale: number
  zoomMode: ZoomMode
}

export interface LoadedPdfDocument {
  fileName: string
  document: PDFDocumentProxy
}

export interface PdfViewportMetrics {
  pageNumber: number
  scale: number
  width: number
  height: number
  baseWidth: number
  baseHeight: number
  outputScale: number
}
