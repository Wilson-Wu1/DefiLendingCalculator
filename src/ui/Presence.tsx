import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TransitionEvent } from 'react'
import { useAnimations } from './animations.tsx'
import styles from './motion.module.css'

type PresenceProps = {
  present: boolean
  children: ReactNode
  /** Gap kept inside the collapsing region so it disappears with the content. */
  space?: string
  spaceAt?: 'before' | 'after'
  /** Hide exiting content from keyboard and screen readers. */
  conceal?: boolean
  onExited?: () => void
}

export function Presence({
  present,
  children,
  space,
  spaceAt = 'after',
  conceal = false,
  onExited,
}: PresenceProps) {
  const { enabled } = useAnimations()
  const [mounted, setMounted] = useState(present)
  const [open, setOpen] = useState(false)
  const [settled, setSettled] = useState(false)
  const presentRef = useRef(present)
  const onExitedRef = useRef(onExited)
  const snapshot = useRef(children)
  const seen = useRef(false)
  const exited = useRef(false)
  const generation = useRef(0)
  const openRef = useRef(open)
  openRef.current = open

  presentRef.current = present
  onExitedRef.current = onExited
  if (present) snapshot.current = children

  function finish() {
    if (exited.current || presentRef.current) return
    exited.current = true
    setMounted(false)
    onExitedRef.current?.()
  }

  useLayoutEffect(() => {
    if (!enabled) {
      if (present) {
        seen.current = true
        exited.current = false
        generation.current += 1
        setMounted(true)
        setOpen(true)
        setSettled(true)
        return
      }
      setOpen(false)
      setSettled(false)
      if (seen.current && !exited.current) finish()
      return
    }

    if (present) {
      seen.current = true
      exited.current = false
      generation.current += 1
      setMounted(true)
      if (openRef.current) {
        setSettled(true)
        return
      }
      setSettled(false)
      let second = 0
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => {
          if (presentRef.current) setOpen(true)
        })
      })
      return () => {
        cancelAnimationFrame(first)
        cancelAnimationFrame(second)
      }
    }

    setOpen(false)
    setSettled(false)
    if (!seen.current || exited.current) return
  }, [present, enabled])

  useEffect(() => {
    if (!mounted || !enabled) return
    const gen = generation.current
    const timer = window.setTimeout(() => {
      if (generation.current !== gen) return
      if (presentRef.current) {
        setSettled(true)
        return
      }
      finish()
    }, 480)
    return () => window.clearTimeout(timer)
  }, [mounted, open, present, enabled])

  function onTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    if (event.propertyName !== 'grid-template-rows') return
    if (presentRef.current) {
      setSettled(true)
      return
    }
    finish()
  }

  if (!mounted) return null

  const content = present ? children : snapshot.current
  const spacer = space ? <div className={styles.spacer} style={{ ['--presence-space' as string]: space }} /> : null

  return (
    <div
      className={styles.presence}
      data-open={open ? '' : undefined}
      data-settled={settled ? '' : undefined}
      inert={conceal && !open ? true : undefined}
      onTransitionEnd={onTransitionEnd}
    >
      <div className={styles.presenceInner}>
        {spaceAt === 'before' ? spacer : null}
        {content}
        {spaceAt === 'after' ? spacer : null}
      </div>
    </div>
  )
}
