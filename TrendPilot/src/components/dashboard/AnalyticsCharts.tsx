// AnalyticsCharts — Recharts para /dashboard/analytics
// Importar siempre con dynamic({ ssr: false }).

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ─── SpendRevenueChart — Gasto vs Ingresos 30 días ───────────────────────────

interface DayData {
  date:    string   // YYYY-MM-DD o abreviado
  spend:   number   // centavos
  revenue: number   // centavos
}

export function SpendRevenueChart({ data }: { data: DayData[] }) {
  // Formatear etiquetas de fecha (tomar solo día)
  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(5),  // MM-DD
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={formatted} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00FF88" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0066FF" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#4B6080', fontSize: 10 }}
          axisLine={{ stroke: '#1a2744' }}
          tickLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fill: '#4B6080', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${(v / 100 / 1000).toFixed(0)}K`}
        />
        <Tooltip
          contentStyle={{ background: '#0D1B2A', border: '1px solid #1a2744', borderRadius: '12px', fontSize: 12 }}
          labelStyle={{ color: '#8BA0BB' }}
          formatter={(v, name) => [
            `$${((v as number) / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN`,
            name === 'revenue' ? 'Ingresos' : 'Gasto',
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#4B6080' }}
          iconType="circle"
          iconSize={8}
          formatter={(v) => v === 'revenue' ? 'Ingresos' : 'Gasto'}
        />
        <Area type="monotone" dataKey="revenue" stroke="#00FF88" strokeWidth={2} fill="url(#gradRevenue)" dot={false} />
        <Area type="monotone" dataKey="spend"   stroke="#0066FF" strokeWidth={2} fill="url(#gradSpend)"   dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── TopAdsChart — CTR de los mejores anuncios ────────────────────────────────

interface AdBar {
  name:  string
  ctr:   number
  roas:  number
}

export function TopAdsChart({ data }: { data: AdBar[] }) {
  // Truncar nombres largos
  const formatted = data.map((d) => ({
    ...d,
    label: d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#4B6080', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: '#8BA0BB', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={{ background: '#0D1B2A', border: '1px solid #1a2744', borderRadius: '12px', fontSize: 12 }}
          formatter={(v) => [`${v}%`, 'CTR']}
          labelStyle={{ color: '#8BA0BB' }}
        />
        <Bar dataKey="ctr" name="CTR" fill="#0066FF" radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}
