import styles from './KpiCard.module.css'

function Sparkline({ color }) {
  // Decorative SVG bar spark
  const bars = [40, 55, 48, 70, 62, 80, 75, 90, 85, 95]
  const max = Math.max(...bars)
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" fill="none" aria-hidden>
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 7}
          y={28 - (h / max) * 28}
          width={5}
          height={(h / max) * 28}
          rx={1.5}
          fill={color}
          opacity={0.15 + (i / bars.length) * 0.55}
        />
      ))}
    </svg>
  )
}

export default function KpiCard({ label, icon, value, prevValue, unit, date, color }) {
  const delta = value !== null && prevValue !== null ? value - prevValue : null
  const pct   = prevValue ? ((delta / Math.abs(prevValue)) * 100) : null
  const up     = delta >= 0
  const noChange = delta === 0

  return (
    <div className={styles.card} style={{ '--accent': color }}>
      <div className={styles.top}>
        <div className={styles.labelRow}>
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>{label}</span>
        </div>
        <Sparkline color={color} />
      </div>

      <div className={styles.valueRow}>
        <span className={styles.value}>
          {value !== null ? value.toFixed(2) : '—'}
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
