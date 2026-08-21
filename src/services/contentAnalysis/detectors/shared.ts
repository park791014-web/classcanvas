import type { LegacyContentType } from '../../../types/content'
import type { DetectionSource } from '../../../types/analysis'
import type { TextLayoutLine } from '../textLayout'

export interface DetectionStart {
  type: LegacyContentType
  line: TextLayoutLine
  title: string
  confidence: number
  detectionSource: DetectionSource
}
