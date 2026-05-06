// GrowthFundCharts — Recharts components para el dashboard de comisiones
// Este archivo NO debe tener ssr. Importar siempre con dynamic({ ssr: false }).

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ─── LineChart: acumulación mensual del GrowthFund ───────────────────────────

interface GFLineData { month: string; amount: number }

export function GrowthFundLineChart({ data }: { data: GFLineData[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#4B6080', fontSize: 11 }}
          axisLine={{ stroke: '#1a2744' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#4B6080', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${(v / 100 / 1000).toFixed(0)}K`}
        />
        <Tooltip
          contentStyle={{ background: '#0D1B2A', border: '1px solid #1a2744', borderRadius: '12px', fontSize: 12 }}
          labelStyle={{ color: '#8BA0BB' }}
          formatter={(v) => [`$${((v as number) / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN`, 'GrowthFund']}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="url(#gfGradient)"
          strokeWidth={2.5}
          dot={{ fill: '#0066FF', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#00FF88' }}
        />
        <defs>
          <linearGradient id="gfGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0066FF" />
            <stop offset="100%" stopColor="#00FF88" />
          </linearGradient>
        </defs>
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── BarChart: proyecciones a 12 meses ───────────────────────────────────────

interface ProjData { month: string; net: number; growthfund: number }

export function ProjectionsBarChart({ data }: { data: ProjData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#4B6080', fontSize: 10 }}
          axisLine={{ stroke: '#1a2744' }}
          tickLine={false}
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
          formatter={(v) => `$${((v as number) / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN`}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#4B6080' }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="net"        name="Ganancia neta" fill="#00FF88" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="growthfund" name="GrowthFund"    fill="#0066FF" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
