import { useState, useMemo } from 'react'
import styles from './CorrelationHeatmap.module.css'

const SERIES_IDS = ['FEDFUNDS', 'CPIAUCSL', 'UNRATE']

function computePearson(timeSeries, sidA, sidB, window) {
  const pts = timeSeries
    .filter(d => d[sidA] !== null && d[sidB] !== null)
    .slice(-window)

  if (pts.length < 3) return null

  const n  = pts.length
  const xs = pts.map(d => d[sidA])
  const ys = pts.map(d => d[sidB])

  const sumX  = xs.reduce((a, b) => a + b, 0)
  const sumY  = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0)
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0)
  const sumY2 = ys.reduce((acc, y) => acc + y * y, 0)

  const num = n * sumXY - sumX * sumY
  const den = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2))

  return den === 0 ? null : Math.max(-1, Math.min(1, num / den))
}

function CorrSparkline({ a, b, rollingCorr }) {
  const key = [`${a}_vs_${b}`, `${b}_vs_${a}`].find(k => rollingCorr?.[k])
  if (!key) return null

  const entries = Object.entries(rollingCorr[key])
    .sort(([x], [y]) => x.localeCompare(y))
    .slice(-10)

  if (entries.length < 2) return null

  const vals  = entries.map(([, v]) => v)
  const min   = Math.min(...vals)
  const max   = Math.max(...vals)
  const range = max - min || 0.01
  const last  = vals[vals.length - 1]
  const color = last >= 0 ? '#3b82f6' : '#ef4444'
  const trend = vals[vals.length - 1] > vals[vals.length - 2] ? '↑' : '↓'

  const W = 40, H = 16
  const points = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * W
      const y = H - ((v - min) / range) * H
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className={styles.sparkRow}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="visible">
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      </svg>
      <span className={styles.trendArrow} style={{ color }}>{trend}</span>
    </div>
  )
}

function corrToColor(val) {
  if (val === null) return 'rgba(255,255,255,0.03)'
  if (val === 1)    return 'rgba(59,130,246,0.18)'
  const abs = Math.abs(val)
  if (val > 0) {
    const a = 0.1 + abs * 0.55
    return `rgba(59,130,246,${a.toFixed(2)})`
  } else {
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

export default function CorrelationHeatmap({ matrix: initialMatrix, seriesMeta, rollingCorr, timeSeries }) {
  const [corrWindow, setCorrWindow] = useState(12)

  const matrix = useMemo(() => {
    if (!timeSeries) return initialMatrix
    const m = {}
    SERIES_IDS.forEach(a => {
      m[a] = {}
      SERIES_IDS.forEach(b => {
        m[a][b] = a === b ? 1 : computePearson(timeSeries, a, b, corrWindow)
      })
    })
    return m
  }, [timeSeries, corrWindow, initialMatrix])

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Correlation Matrix</h2>
          <p className={styles.subtitle}>{corrWindow}-month rolling · latest reading</p>
        </div>
        <div className={styles.sliderRow}>
          <span className={styles.sliderLabel}>Window</span>
          <input
            type="range"
            min={3}
            max={60}
            step={1}
            value={corrWindow}
            onChange={e => setCorrWindow(Number(e.target.value))}
            className={styles.sliderInput}
          />
          <span className={styles.sliderValue}>{corrWindow}M</span>
        </div>
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
                    <>
                      <span className={styles.cellStrength}>{strengthLabel(val)}</span>
                      <CorrSparkline a={rowId} b={colId} rollingCorr={rollingCorr} />
                    </>
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
