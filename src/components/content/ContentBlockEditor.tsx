import { CONTENT_TYPE_OPTIONS } from '../../types/content'
import type { ContentType } from '../../types/content'

interface ContentBlockEditorProps {
  type: ContentType
  title: string
  onTypeChange: (type: ContentType) => void
  onTitleChange: (title: string) => void
  compact?: boolean
}

export function ContentBlockEditor({ type, title, onTypeChange, onTitleChange, compact = false }: ContentBlockEditorProps) {
  return (
    <div className={compact ? 'content-block-editor is-compact' : 'content-block-editor'}>
      {compact ? (
        <label>
          <span>콘텐츠 종류</span>
          <select value={type} onChange={(event) => onTypeChange(event.target.value as ContentType)}>
            {CONTENT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ) : (
        <fieldset>
          <legend>콘텐츠 종류</legend>
          <div className="content-type-options">
            {CONTENT_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={type === option.value ? 'is-selected' : ''}
                aria-pressed={type === option.value}
                onClick={() => onTypeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <label>
        <span>제목</span>
        <input
          value={title}
          maxLength={60}
          placeholder="비워 두면 자동으로 이름을 붙입니다."
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>
    </div>
  )
}
