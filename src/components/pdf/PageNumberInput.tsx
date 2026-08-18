import { useEffect, useState, type FormEvent } from 'react'

interface PageNumberInputProps {
  currentPage: number
  totalPages: number
  onPageChange: (pageNumber: number) => void
  compact?: boolean
}

export function PageNumberInput({
  currentPage,
  totalPages,
  onPageChange,
  compact = false,
}: PageNumberInputProps) {
  const [value, setValue] = useState(String(currentPage))

  useEffect(() => setValue(String(currentPage)), [currentPage])

  const submitPage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const requestedPage = Number.parseInt(value, 10)

    if (!Number.isFinite(requestedPage)) {
      setValue(String(currentPage))
      return
    }

    const safePage = Math.min(totalPages, Math.max(1, requestedPage))
    setValue(String(safePage))
    onPageChange(safePage)
  }

  return (
    <form className={`page-number-form${compact ? ' page-number-form--compact' : ''}`} onSubmit={submitPage} noValidate>
      <label className="visually-hidden" htmlFor={compact ? 'navigator-page-number' : 'toolbar-page-number'}>
        이동할 페이지
      </label>
      <input
        id={compact ? 'navigator-page-number' : 'toolbar-page-number'}
        type="number"
        min={1}
        max={totalPages}
        inputMode="numeric"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          if (value === '') setValue(String(currentPage))
        }}
      />
      <span aria-hidden="true">/</span>
      <span className="page-total">{totalPages}</span>
      <button type="submit">이동</button>
    </form>
  )
}
