import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts'
import styles from './MultiLineChart.module.css'

const LEFT_AXIS    = ['FEDFUNDS', 'UNRATE']
const SERIES_ORDER = ['FEDFUNDS', 'CPIAUCSL', 'UNRATE']

const REGIMES = {
  'Low Rate':   { color: 'rgba(59,130,246,0.06)',  label: 'Low Rate'   },
  'Tightening': { color: 'rgba(239,68,68,0.07)',   label: 'Tightening' },
  'Plateau':    { color: 'rgba(245,158,11,0.06)',  label: 'Plateau'    },
  'Easing':     { color: 'rgba(16,185,129,0.07)',  label: 'Easing'     },
}

function detectRegimes(data) {
  const fedfunds = data.map(d => ({ date: d.date, v: d.FEDFUNDS })).filter(d => d.v !== null)
  if (fedfunds.length < 4) return []

  const getRegime = (i) => {
    const v = fedfunds[i].v
    if (v < 1) return 'Low Rate'
    const slope = i >= 3 ? (fedfunds[i].v - fedfunds[i - 3].v) / 3 : 0
    if (slope > 0.2)  return 'Tightening'
    if (slope < -0.1) return 'Easing'
    return 'Plateau'
  }

  const areas = []
  let current = getRegime(0)
  let start = fedfunds[0].date

  for (let i = 1; i < fedfunds.length; i++) {
    const r = getRegime(i)
    if (r !== current) {
      areas.push({ start, end: fedfunds[i].date, regime: current })
      current = r
      start = fedfunds[i].date
    }
  }
  areas.push({ start, end: fedfunds[fedfunds.length - 1].date, regime: current })
  return areas
}

const FOMC_EVENTS = [
  { date: '2022-03-01', label: '+25bp', type: 'hike' },
  { date: '2022-05-01', label: '+50bp', type: 'hike' },
  { date: '2022-06-01', label: '+75bp', type: 'hike' },
  { date: '2022-07-01', label: '+75bp', type: 'hike' },
  { date: '2022-09-01', label: '+75bp', type: 'hike' },
  { date: '2022-11-01', label: '+75bp', type: 'hike' },
  { date: '2022-12-01', label: '+50bp', type: 'hike' },
  { date: '2023-02-01', label: '+25bp', type: 'hike' },
  { date: '2023-03-01', label: '+25bp', type: 'hike' },
  { date: '2023-05-01', label: '+25bp', type: 'hike' },
  { date: '2023-07-01', label: '+25bp', type: 'hike' },
  { date: '2024-09-01', label: '−50bp', type: 'cut' },
  { date: '2024-11-01', label: '−25bp', type: 'cut' },
  { date: '2024-12-01', label: '−25bp', type: 'cut' },
]

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

export default function MultiLineChart({ data, seriesMeta, projection = [] }) {
  const chartData = useMemo(() => (
    projection.length ? [...data, ...projection] : data
  ), [data, projection])

  const xTicks  = chartData.filter((_, i) => i % 6 === 0).map(d => d.date)
  const regimes = detectRegimes(data)
  const activeRegimes = [...new Set(regimes.map(r => r.regime))]

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Macro Indicators</h2>
          <p className={styles.subtitle}>5-year monthly trend — dual axis</p>
        </div>
        <CustomLegend seriesMeta={seriesMeta} />
      </div>

      <div className={styles.regimeLegend}>
        {activeRegimes.map(r => (
          <span key={r} className={styles.regimeItem}>
            <span className={styles.regimeSwatch} style={{ background: REGIMES[r].color.replace(/[\d.]+\)$/, '0.5)') }} />
            {REGIMES[r].label}
          </span>
        ))}
      </div>

      <div className={styles.fomcLegend}>
        <span className={styles.fomcItem}>
          <span className={styles.fomcDash} style={{ background: '#ef4444' }} />
          Fed hike
        </span>
        <span className={styles.fomcItem}>
          <span className={styles.fomcDash} style={{ background: '#10b981' }} />
          Fed cut
        </span>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 8, right: 48, bottom: 0, left: -8 }}>
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
          {regimes.map((r, i) => (
            <ReferenceArea
              key={i}
              yAxisId="left"
              x1={r.start}
              x2={r.end}
              fill={REGIMES[r.regime].color}
              strokeOpacity={0}
            />
          ))}
          <ReferenceLine yAxisId="left" y={0} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
          {FOMC_EVENTS.map(ev => (
            <ReferenceLine
              key={ev.date}
              yAxisId="left"
              x={ev.date}
              stroke={ev.type === 'hike' ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}
              strokeWidth={1}
              strokeDasharray="3 3"
              label={{
                value: ev.label,
                position: 'top',
                fontSize: 8,
                fontFamily: 'JetBrains Mono',
                fill: ev.type === 'hike' ? '#ef4444' : '#10b981',
              }}
            />
          ))}
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
          {projection.length > 0 && (
            <>
              <Line
                key="CPIAUCSL_proj"
                yAxisId="right"
                type="monotone"
                dataKey="CPIAUCSL_proj"
                stroke="rgba(168,85,247,0.55)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                connectNulls
              />
              <Line
                key="UNRATE_proj"
                yAxisId="left"
                type="monotone"
                dataKey="UNRATE_proj"
                stroke="rgba(6,182,212,0.55)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                connectNulls
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
