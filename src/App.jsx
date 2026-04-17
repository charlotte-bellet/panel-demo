import { useEffect, useState, useCallback } from 'react'
import KpiCard from './components/KpiCard'
import MultiLineChart from './components/MultiLineChart'
import CorrelationHeatmap from './components/CorrelationHeatmap'
import styles from './App.module.css'

const SERIES_META = {
  FEDFUNDS: { label: 'Fed Funds Rate', unit: '%',   color: '#3b82f6', icon: '🏦' },
  CPIAUCSL: { label: 'CPI',            unit: ' pts', color: '#a855f7', icon: '📊' },
  UNRATE:   { label: 'Unemployment',  unit: '%',   color: '#06b6d4', icon: '👷' },
}

function parseData(raw) {
  // Build time-series array sorted by date
  const allDates = new Set()
  Object.values(raw.series).forEach(s => Object.keys(s).forEach(d => allDates.add(d)))
  const dates = Array.from(allDates).sort()

  const timeSeries = dates.map(date => {
    const point = { date }
    Object.keys(raw.series).forEach(sid => {
      const val = raw.series[sid][date]
      point[sid] = val !== undefined ? val : null
    })
    return point
  })

  // KPI: last value + previous value for delta
  const kpis = {}
  Object.keys(SERIES_META).forEach(sid => {
    const entries = Object.entries(raw.series[sid]).sort(([a], [b]) => a.localeCompare(b))
    const last = entries[entries.length - 1]
    const prev = entries[entries.length - 2]
    kpis[sid] = {
      value: last?.[1] ?? null,
      prevValue: prev?.[1] ?? null,
      date: last?.[0] ?? '',
    }
  })

  // Correlation matrix — latest rolling corr values
  const pairs = raw.rolling_correlations
  const matrix = {}
  const seriesIds = Object.keys(SERIES_META)
  seriesIds.forEach(a => {
    matrix[a] = {}
    seriesIds.forEach(b => {
      if (a === b) { matrix[a][b] = 1; return }
      const key = [`${a}_vs_${b}`, `${b}_vs_${a}`].find(k => pairs[k])
      if (!key) { matrix[a][b] = null; return }
      const entries = Object.entries(pairs[key]).sort(([x], [y]) => x.localeCompare(y))
      matrix[a][b] = entries[entries.length - 1]?.[1] ?? null
    })
  })

  // Full rolling correlations for the chart tooltip
  const rollingCorr = pairs

  return { timeSeries, kpis, matrix, rollingCorr, metadata: raw.metadata }
}

function formatAge(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  return `${mins} mins ago`
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/data/macro_data.json?_=${refreshKey}`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(raw => { setData(parseData(raw)); setLastUpdated(Date.now()) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [refreshKey])

  if (error) return (
    <div className={styles.errorState}>
      <span className={styles.errorIcon}>⚠</span>
      <p>Failed to load macro data</p>
      <code>{error}</code>
    </div>
  )

  if (!data && !error) return (
    <div className={styles.loadingState}>
      <div className={styles.spinner} />
      <p>Loading macro data…</p>
    </div>
  )

  const { timeSeries, kpis, matrix, metadata } = data

  return (
    <div className={styles.layout}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <span className={styles.logoDot} />
            <span className={styles.logoText}>MacroPulse</span>
          </div>
          <span className={styles.headerBadge}>FRED · Federal Reserve</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.headerMeta}>
            {metadata.start_date} → {metadata.end_date}
          </span>
          <span className={styles.headerMeta}>
            {metadata.rolling_window_months}M rolling window
          </span>
          {lastUpdated && (
            <span className={styles.headerMeta}>
              Updated {formatAge(lastUpdated)}
            </span>
          )}
          <button
            className={styles.refreshBtn}
            onClick={refresh}
            disabled={loading}
            title="Refresh data"
          >
            <svg
              className={loading ? styles.spinning : ''}
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <div className={styles.liveTag}>
            <span className={styles.liveDot} />
            LIVE
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* KPI row */}
        <section className={styles.kpiRow}>
          {Object.entries(SERIES_META).map(([sid, meta]) => (
            <KpiCard
              key={sid}
              label={meta.label}
              icon={meta.icon}
              value={kpis[sid].value}
              prevValue={kpis[sid].prevValue}
              unit={meta.unit}
              date={kpis[sid].date}
              color={meta.color}
            />
          ))}
        </section>

        {/* Charts row */}
        <section className={styles.chartsRow}>
          <div className={styles.chartPrimary}>
            <MultiLineChart data={timeSeries} seriesMeta={SERIES_META} />
          </div>
          <div className={styles.chartSecondary}>
            <CorrelationHeatmap matrix={matrix} seriesMeta={SERIES_META} />
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <span>Source: Federal Reserve Bank of St. Louis (FRED)</span>
          <span>Generated {metadata.generated_at}</span>
        </footer>
      </main>
    </div>
  )
}
