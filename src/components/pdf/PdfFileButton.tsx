import { useRef, type ChangeEvent } from 'react'

interface PdfFileButtonProps {
  label: string
  onFileSelected: (file: File) => void
  variant?: 'primary' | 'secondary'
}

export function PdfFileButton({
  label,
  onFileSelected,
  variant = 'secondary',
}: PdfFileButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (file) {
      onFileSelected(file)
    }

    event.target.value = ''
  }

  return (
    <>
      <button
        className={`file-button file-button--${variant}`}
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  )
}
