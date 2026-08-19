import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import type { PDFPageProxy } from 'pdfjs-dist'

export interface TextLayoutLine {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontHeight: number
}

interface PositionedTextItem extends TextLayoutLine {}

const LINE_TOLERANCE = 0.012

function isTextItem(item: unknown): item is TextItem {
  return typeof item === 'object' && item !== null && 'str' in item && 'transform' in item
}

export async function extractTextLayout(page: PDFPageProxy) {
  const viewport = page.getViewport({ scale: 1 })
  const textContent = await page.getTextContent()
  const items: PositionedTextItem[] = textContent.items.filter(isTextItem).map((item) => {
    const itemHeight = Math.max(item.height || 0, Math.abs(item.transform[3]) || 8)
    return {
      text: item.str.trim(),
      x: item.transform[4] / viewport.width,
      y: (viewport.height - item.transform[5] - itemHeight) / viewport.height,
      width: Math.max(0.001, item.width / viewport.width),
      height: Math.max(0.008, itemHeight / viewport.height),
      fontHeight: itemHeight / viewport.height,
    }
  }).filter((item) => item.text)

  items.sort((a, b) => a.y - b.y || a.x - b.x)
  const lines: TextLayoutLine[] = []
  for (const item of items) {
    let line: TextLayoutLine | undefined
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (Math.abs(lines[index].y - item.y) <= LINE_TOLERANCE) {
        line = lines[index]
        break
      }
    }
    if (!line) {
      lines.push({ ...item })
      continue
    }
    const right = Math.max(line.x + line.width, item.x + item.width)
    line.text = `${line.text} ${item.text}`.replace(/\s+/g, ' ').trim()
    line.x = Math.min(line.x, item.x)
    line.y = Math.min(line.y, item.y)
    line.width = right - line.x
    line.height = Math.max(line.height, item.height)
    line.fontHeight = Math.max(line.fontHeight, item.fontHeight)
  }

  return { lines, textItemCount: items.length }
}
