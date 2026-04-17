import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import styles from './MultiLineChart.module.css'

const SERIES_ORDER = ['FEDFUNDS', 'CPIAUCSL', 'UNRATE']

// Normalise all series to 0-100 scale for visual overlay
function normalise(data, keys) {
  const stats = {}
  keys.forEach(k => {
    const vals = data.map(d => d[k]).filter(v => v !== null && v !== undefined)
    stats[k] = { min: Math.min(...vals), max: Math.max(...vals) }
  })
  return data.map(d => {
    const point = { date: d.date }
    keys.forEach(k => {
      const { min, max } = stats[k]
      point[k] = d[k] !== null && d[k] !== undefined
        ? ((d[k] - min) / (max - min)) * 100
        : null
      point[`${k}_raw`] = d[k]
    })
    return point
  })
}

function CustomTooltip({ active, payload, label, seriesMeta }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{label}</div>
      {payload.map(p => {
        if (!p.dataKey || p.dataKey.endsWith('_raw')) return null
        const meta = seriesMeta[p.dataKey]
        const raw  = p.payload[`${p.dataKey}_raw`]
        return (
          <div key={p.dataKey} className={styles.tooltipRow}>
            <span className={styles.tooltipDot} style={{ background: p.color }} />
            <span className={styles.tooltipLabel}>{meta.label}</span>
            <span className={styles.tooltipVal}>
              {raw !== null && raw !== undefined ? raw.toFixed(2) : '—'}
              {meta.unit}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function CustomLegend({ seriesMeta }) {
  return (
    <div className={styles.legend}>
      {SERIES_ORDER.map(sid => (
        <div key={sid} className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: seriesMeta[sid].color }} />
          <span className={styles.legendLabel}>{seriesMeta[sid].label}</span>
          <span className={styles.legendUnit}>{seriesMeta[sid].unit.trim()}</span>
        </div>
      ))}
      <span className={styles.legendNote}>Normalised 0–100 for comparison</span>
    </div>
  )
}

function tickFormatter(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function MultiLineChart({ data, seriesMeta }) {
  const normalised = normalise(data, SERIES_ORDER)

  // Show every 6th date label
  const xTicks = normalised
    .filter((_, i) => i % 6 === 0)
    .map(d => d.date)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Macro Indicators</h2>
          <p className={styles.subtitle}>5-year monthly trend — normalised overlay</p>
        </div>
        <CustomLegend seriesMeta={seriesMeta} />
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={normalised} margin={{ top: 8, right: 24, bottom: 0, left: -8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            ticks={xTicks}
            tickFormatter={tickFormatter}
            tick={{ fill: '#505868', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#1f2535' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#505868', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}`}
          />
          <Tooltip
            content={<CustomTooltip seriesMeta={seriesMeta} />}
            cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
          />
          <ReferenceLine y={50} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
          {SERIES_ORDER.map(sid => (
            <Line
              key={sid}
              type="monotone"
              dataKey={sid}
              stroke={seriesMeta[sid].color}
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
