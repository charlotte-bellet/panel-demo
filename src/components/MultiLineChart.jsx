import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import styles from './MultiLineChart.module.css'

const LEFT_AXIS  = ['FEDFUNDS', 'UNRATE']   // %
const RIGHT_AXIS = ['CPIAUCSL']              // index pts
const SERIES_ORDER = ['FEDFUNDS', 'CPIAUCSL', 'UNRATE']

function CustomTooltip({ active, payload, label, seriesMeta }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{label}</div>
      {payload.map(p => {
        if (!p.dataKey) return null
        const meta = seriesMeta[p.dataKey]
        if (!meta) return null
        const val = p.value
        return (
          <div key={p.dataKey} className={styles.tooltipRow}>
            <span className={styles.tooltipDot} style={{ background: p.color }} />
            <span className={styles.tooltipLabel}>{meta.label}</span>
            <span className={styles.tooltipVal}>
              {val !== null && val !== undefined ? val.toFixed(2) : '—'}
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
      <span className={styles.legendAxis}>
        <span className={styles.axisTag}>L</span> % &nbsp;
        <span className={styles.axisTag}>R</span> index pts
      </span>
    </div>
  )
}

function tickFormatter(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function MultiLineChart({ data, seriesMeta }) {
  const xTicks = data
    .filter((_, i) => i % 6 === 0)
    .map(d => d.date)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Macro Indicators</h2>
          <p className={styles.subtitle}>5-year monthly trend — dual axis</p>
        </div>
        <CustomLegend seriesMeta={seriesMeta} />
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 48, bottom: 0, left: -8 }}>
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
            yAxisId="left"
            tick={{ fill: '#505868', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}%`}
            width={38}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#505868', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v}
            width={42}
          />
          <Tooltip
            content={<CustomTooltip seriesMeta={seriesMeta} />}
            cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
          />
          <ReferenceLine yAxisId="left" y={0} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
          {SERIES_ORDER.map(sid => (
            <Line
              key={sid}
              yAxisId={LEFT_AXIS.includes(sid) ? 'left' : 'right'}
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
