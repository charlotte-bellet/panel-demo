import { useEffect, useRef, useState } from 'react'
import styles from './KpiCard.module.css'

function useCountUp(target, duration = 400) {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)

  useEffect(() => {
    if (target === null || target === undefined) { setDisplay(target); return }
    const from = prev.current ?? target
    prev.current = target
    if (from === target) return

    const start = performance.now()
    let raf

    const tick = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (target - from) * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return display
}

function Sparkline({ color, data }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const bars = data.map(v => ((v - min) / range) * 100)
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" fill="none" aria-hidden>
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 7}
          y={28 - (h / 100) * 28}
          width={5}
          height={(h / 100) * 28}
          rx={1.5}
          fill={color}
          opacity={0.15 + (i / bars.length) * 0.55}
        />
      ))}
    </svg>
  )
}

export default function KpiCard({ label, icon, value, prevValue, unit, date, color, sparkData }) {
  const animated = useCountUp(value)
  const delta    = value !== null && prevValue !== null ? value - prevValue : null
  const pct      = prevValue ? ((delta / Math.abs(prevValue)) * 100) : null
  const up       = delta >= 0
  const noChange = delta === 0

  return (
    <div className={styles.card} style={{ '--accent': color }}>
      <div className={styles.top}>
        <div className={styles.labelRow}>
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>{label}</span>
        </div>
        <Sparkline color={color} data={sparkData} />
      </div>

      <div className={styles.valueRow}>
        <span className={styles.value}>
          {animated !== null ? animated.toFixed(2) : '—'}
          <span className={styles.unit}>{unit}</span>
        </span>
        {delta !== null && !noChange && (
          <span className={`${styles.badge} ${up ? styles.up : styles.down}`}>
            {up ? '▲' : '▼'} {Math.abs(delta).toFixed(2)}{unit}
            {pct !== null && (
              <span className={styles.pct}> ({Math.abs(pct).toFixed(1)}%)</span>
            )}
          </span>
        )}
      </div>

      <div className={styles.meta}>
        <span>vs previous month</span>
        <span className={styles.date}>{date}</span>
      </div>

      <div className={styles.accentBar} />
    </div>
  )
}
