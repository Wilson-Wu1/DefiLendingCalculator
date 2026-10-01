import { useState } from 'react'

export function Mark({
  src,
  label,
  size = 20,
}: {
  src: string | null
  label: string
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const letter = label.trim().slice(0, 1).toUpperCase() || '?'
  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          background: 'var(--hc-pick-bg)',
          color: 'var(--hc-mark)',
          fontSize: Math.max(10, size * 0.45),
          fontWeight: 700,
        }}
      >
        {letter}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: '50%', flex: '0 0 auto', objectFit: 'cover' }}
    />
  )
}
