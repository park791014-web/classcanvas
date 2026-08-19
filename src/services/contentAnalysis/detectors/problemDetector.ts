import type { TextLayoutLine } from '../textLayout'
import type { DetectionStart } from './shared'

const NAMED_PROBLEM = /^(?:(?:확인|연습|탐구)\s*)?문제(?:\s*\d{1,2})?(?=\s|[.:)]|$)/i
const NUMBERED_PROBLEM = /^(\d{1,2})(?:[.)]|번)(?:\s|$)/

export function detectProblems(lines: TextLayoutLine[]): DetectionStart[] {
  const numeric = lines.map((line) => ({ line, match: line.text.match(NUMBERED_PROBLEM) }))
    .filter((entry): entry is { line: TextLayoutLine; match: RegExpMatchArray } => Boolean(entry.match) && entry.line.x < 0.28)
  const sequentialNumbers = new Set(numeric.filter((entry, index) => {
    const number = Number(entry.match[1])
    const previous = numeric[index - 1] ? Number(numeric[index - 1].match[1]) : null
    const next = numeric[index + 1] ? Number(numeric[index + 1].match[1]) : null
    return previous === number - 1 || next === number + 1
  }).map((entry) => entry.line))

  const detections: DetectionStart[] = []
  for (const line of lines) {
    if (NAMED_PROBLEM.test(line.text)) {
      const title = line.text.match(NAMED_PROBLEM)?.[0].trim() || '문제'
      detections.push({ type: 'problem', line, title, confidence: 0.92, detectionSource: 'text' })
      continue
    }
    const match = line.text.match(NUMBERED_PROBLEM)
    if (!match || line.x >= 0.28 || !sequentialNumbers.has(line)) continue
    detections.push({ type: 'problem', line, title: `문제 ${match[1]}`, confidence: 0.78, detectionSource: 'mixed' })
  }
  return detections
}
