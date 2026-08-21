import type { LegacyContentType } from '../../../types/content'
import type { TextLayoutLine } from '../textLayout'
import type { DetectionStart } from './shared'

const PATTERNS: Array<{ type: LegacyContentType; pattern: RegExp; confidence: number }> = [
  { type: 'example', pattern: /^(?:예제|example|보기)(?:\s*\d{1,2})?(?=\s|[.:)]|$)/i, confidence: 0.93 },
  { type: 'concept', pattern: /^(?:개념|정의|성질|정리|공식|핵심|알아두기)(?:\s|\d|$)/i, confidence: 0.84 },
  { type: 'thinking', pattern: /^(?:생각\s*(?:열기|해\s*보기)|생각하기)(?:\s|$)/i, confidence: 0.86 },
  { type: 'activity', pattern: /^(?:탐구|활동|해\s*보기)(?:\s|\d|$)/i, confidence: 0.84 },
  { type: 'visual', pattern: /^(?:그림|그래프|도형|좌표평면|표)(?:\s*\d{1,2})?(?=\s|[.:)]|$)/i, confidence: 0.72 },
  { type: 'solution', pattern: /^(?:풀이|해설|solution|정답)(?:\s|\d|$)/i, confidence: 0.88 },
]

export function detectHeaders(lines: TextLayoutLine[]): DetectionStart[] {
  return lines.flatMap((line) => {
    const detector = PATTERNS.find(({ pattern }) => pattern.test(line.text))
    if (!detector) return []
    const matched = line.text.match(detector.pattern)?.[0].trim()
    return [{
      type: detector.type,
      line,
      title: matched || line.text.slice(0, 30),
      confidence: detector.confidence,
      detectionSource: detector.type === 'visual' ? 'visual' as const : 'text' as const,
    }]
  })
}
