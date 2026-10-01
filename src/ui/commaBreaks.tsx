import type { ReactNode } from 'react'

/** Let a formatted number wrap after a thousands separator. */
export function commaBreaks(value: string): ReactNode {
  const parts = value.split(',')
  if (parts.length < 2) return value
  return parts.map((part, index) => (
    <span key={index}>
      {index > 0 ? ',' : null}
      {index > 0 ? <wbr /> : null}
      {part}
    </span>
  ))
}
