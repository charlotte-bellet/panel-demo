import styles from './WhatIfPanel.module.css'

const STEP = 25

export default function WhatIfPanel({
  delta, setDelta,
  betaCPI, betaUNRATE,
  latestCPI, latestUNRATE, latestFed,
}) {
  const projCPI   = latestCPI   + (delta / 100) * betaCPI   * 6
  const projUNRATE = latestUNRATE + (delta / 100) * betaUNRATE * 6
  const projFed   = latestFed   + delta / 100

  const diffCPI    = projCPI   - latestCPI
  const diffUNRATE = projUNRATE - latestUNRATE

  const fmt = (v, decimals = 2) => v !== null ? v.toFixed(decimals) : '—'
  const sign = v => v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)

  return (
    <div className={styles.panel}>
      <div className={styles.topRow}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>What-if Simulator</span>
          <span className={styles.disclaimer}>Illustrative only · linear interpolation from historical β</span>
        </div>

        <div className={styles.stepper}>
          <span className={styles.stepperLabel}>Fed rate change</span>
          <div className={styles.stepperControls}>
            <button className={styles.stepBtn} onClick={() => setDelta(d => Math.max(d - STEP, -300))}>−</button>
            <span className={`${styles.deltaVal} ${delta > 0 ? styles.hike : delta < 0 ? styles.cut : styles.neutral}`}>
              {delta > 0 ? `+${delta}bp` : delta < 0 ? `${delta}bp` : '0bp'}
            </span>
            <button className={styles.stepBtn} onClick={() => setDelta(d => Math.min(d + STEP, 300))}>+</button>
          </div>
          {delta !== 0 && (
            <button className={styles.resetBtn} onClick={() => setDelta(0)}>Reset</button>
          )}
        </div>
      </div>

      {delta !== 0 && (
        <div className={styles.projRow}>
          <div className={styles.projCard}>
            <span className={styles.projSeries} style={{ color: '#3b82f6' }}>Fed Funds</span>
            <span className={styles.projNow}>{fmt(latestFed)}%</span>
            <span className={styles.projArrow}>→</span>
            <span className={`${styles.projVal} ${delta > 0 ? styles.hike : styles.cut}`}>{fmt(projFed)}%</span>
            <span className={styles.projDiff}>{sign(delta / 100)}%</span>
          </div>
          <div className={styles.projCard}>
            <span className={styles.projSeries} style={{ color: '#a855f7' }}>CPI (6M)</span>
            <span className={styles.projNow}>{fmt(latestCPI)} pts</span>
            <span className={styles.projArrow}>→</span>
            <span className={styles.projVal}>{fmt(projCPI)} pts</span>
            <span className={`${styles.projDiff} ${diffCPI >= 0 ? styles.hike : styles.cut}`}>{sign(diffCPI)}</span>
          </div>
          <div className={styles.projCard}>
            <span className={styles.projSeries} style={{ color: '#06b6d4' }}>Unemployment (6M)</span>
            <span className={styles.projNow}>{fmt(latestUNRATE)}%</span>
            <span className={styles.projArrow}>→</span>
            <span className={styles.projVal}>{fmt(projUNRATE)}%</span>
            <span className={`${styles.projDiff} ${diffUNRATE <= 0 ? styles.cut : styles.hike}`}>{sign(diffUNRATE)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
