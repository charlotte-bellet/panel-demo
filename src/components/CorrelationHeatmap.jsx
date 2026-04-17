import styles from './CorrelationHeatmap.module.css'

const SERIES_IDS = ['FEDFUNDS', 'CPIAUCSL', 'UNRATE']

// Map correlation -1…1 to a dark-theme colour
function corrToColor(val) {
  if (val === null) return 'rgba(255,255,255,0.03)'
  if (val === 1)    return 'rgba(59,130,246,0.18)'  // diagonal
  const abs = Math.abs(val)
  if (val > 0) {
    // positive: blue shades
    const a = 0.1 + abs * 0.55
    return `rgba(59,130,246,${a.toFixed(2)})`
  } else {
    // negative: red shades
    const a = 0.1 + abs * 0.55
    return `rgba(239,68,68,${a.toFixed(2)})`
  }
}

function corrToText(val) {
  if (val === null) return '—'
  if (val === 1)    return '1.00'
  return (val >= 0 ? '+' : '') + val.toFixed(2)
}

function strengthLabel(val) {
  if (val === null || val === 1) return ''
  const abs = Math.abs(val)
  if (abs >= 0.7) return 'Strong'
  if (abs >= 0.4) return 'Moderate'
  return 'Weak'
}

export default function CorrelationHeatmap({ matrix, seriesMeta }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>Correlation Matrix</h2>
        <p className={styles.subtitle}>12-month rolling · latest reading</p>
      </div>

      <div className={styles.grid}>
        {/* Column headers */}
        <div className={styles.cornerCell} />
        {SERIES_IDS.map(sid => (
          <div key={sid} className={styles.colHeader}>
            <span className={styles.dot} style={{ background: seriesMeta[sid].color }} />
            {sid}
          </div>
        ))}

        {/* Rows */}
        {SERIES_IDS.map(rowId => (
          <>
            <div key={`row-${rowId}`} className={styles.rowHeader}>
              <span className={styles.dot} style={{ background: seriesMeta[rowId].color }} />
              {rowId}
            </div>
            {SERIES_IDS.map(colId => {
              const val = matrix[rowId]?.[colId] ?? null
              const isDiag = rowId === colId
              return (
                <div
                  key={`${rowId}-${colId}`}
                  className={`${styles.cell} ${isDiag ? styles.diag : ''}`}
                  style={{ background: corrToColor(val) }}
                  title={`${rowId} × ${colId}: ${corrToText(val)}`}
                >
                  <span className={styles.cellVal}>{corrToText(val)}</span>
                  {!isDiag && val !== null && (
                    <span className={styles.cellStrength}>{strengthLabel(val)}</span>
                  )}
                </div>
              )
            })}
          </>
        ))}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendScale}>
          <span className={styles.legendNeg}>−1 Neg</span>
          <div className={styles.legendGradient} />
          <span className={styles.legendPos}>Pos +1</span>
        </div>
      </div>

      {/* Pairs summary */}
      <div className={styles.pairs}>
        {SERIES_IDS.flatMap((a, i) =>
          SERIES_IDS.slice(i + 1).map(b => {
            const val = matrix[a]?.[b] ?? null
            return (
              <div key={`${a}-${b}`} className={styles.pairRow}>
                <span className={styles.pairNames}>
                  <span style={{ color: seriesMeta[a].color }}>{a}</span>
                  <span className={styles.pairSep}>×</span>
                  <span style={{ color: seriesMeta[b].color }}>{b}</span>
                </span>
                <div className={styles.pairBar}>
                  <div
                    className={styles.pairFill}
                    style={{
                      width: `${Math.abs(val ?? 0) * 100}%`,
                      background: val >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)',
                      marginLeft: val < 0 ? 'auto' : undefined,
                    }}
                  />
                </div>
                <span className={`${styles.pairVal} ${val >= 0 ? styles.pos : styles.neg}`}>
                  {corrToText(val)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
