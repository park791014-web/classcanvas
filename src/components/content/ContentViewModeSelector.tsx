import { CONTENT_VIEW_MODE_LABELS } from '../../types/content'
import type { ContentViewMode } from '../../types/content'

interface ContentViewModeSelectorProps {
  value: ContentViewMode
  onChange: (mode: ContentViewMode) => void
}

const VIEW_MODES = Object.entries(CONTENT_VIEW_MODE_LABELS) as Array<[ContentViewMode, string]>

export function ContentViewModeSelector({ value, onChange }: ContentViewModeSelectorProps) {
  return (
    <div className="content-view-mode-selector" aria-label="콘텐츠 보기 방식">
      {VIEW_MODES.map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          className={value === mode ? 'is-active' : undefined}
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
