import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { formatQualifiedNumber } from '../../lib/formatCore.js'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange) {
  if (typeof window === 'undefined') return () => {}
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function reducedMotionSnapshot() {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, () => true)
}

function fractionDigits(value) {
  if (!Number.isFinite(value) || Number.isInteger(value)) return 0
  return Math.min((value.toFixed(10).replace(/0+$/, '').split('.')[1] || '').length, 6)
}

function easeOutCubic(progress) {
  return 1 - (1 - progress) ** 3
}

export function AnimatedNumber({
  value,
  qualifier,
  approx = false,
  signed = false,
  duration = 560,
  updateDuration = duration,
  animationKey,
  className = '',
}) {
  const reducedMotion = useReducedMotion()
  const previousValue = useRef()
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0)
  const digits = fractionDigits(value)
  const absoluteTarget = Math.abs(value)
  const prefix = signed ? (value > 0 ? '+' : value < 0 ? '−' : '') : ''
  const finalText = `${prefix}${formatQualifiedNumber(absoluteTarget, qualifier, approx, digits)}`

  useEffect(() => {
    if (!Number.isFinite(value)) return undefined
    if (reducedMotion) {
      previousValue.current = value
      return undefined
    }

    const isUpdate = previousValue.current !== undefined
    const animationDuration = isUpdate ? updateDuration : duration
    const target = Math.abs(value)
    let frame = 0
    let startedAt = null
    previousValue.current = value

    const tick = (now) => {
      if (startedAt === null) startedAt = now
      const progress = Math.min((now - startedAt) / animationDuration, 1)
      setDisplayValue(target * easeOutCubic(progress))
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick)
      } else {
        setDisplayValue(target)
      }
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [animationKey, duration, reducedMotion, updateDuration, value])

  if (!Number.isFinite(value)) return '—'
  const shownMagnitude = reducedMotion ? absoluteTarget : Math.abs(displayValue)
  const shown = formatQualifiedNumber(shownMagnitude, qualifier, approx, digits)

  return (
    <span
      className={`sw-animated-number${className ? ` ${className}` : ''}`}
      style={{ '--sw-number-width': `${Math.max(finalText.length, 1)}ch` }}
      data-final-value={finalText}
    >
      {prefix}
      {shown}
    </span>
  )
}
