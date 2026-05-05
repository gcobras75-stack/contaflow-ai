import { MapPin, Users, Radio, DollarSign, Building2, TrendingUp } from 'lucide-react'

interface Region {
  id:        string
  name:      string
  slug:      string
  operator:  string
  email:     string
  states:    string[]
  vendors:   number
  campaigns: number
  commission: string   // MXN formateado
  color:     string
}

const REGIONS: Region[] = [
  {
    id: '1', name: 'Sinaloa', slug: 'sinaloa',
    operator: 'José Luis Cobras', email: 'jose@trendpilot.marketing',
    states: ['Sinaloa', 'Sonora'],
    vendors: 12, campaigns: 8, commission: '$45,200',
    color: 'bg-blue-500',
  },
  {
    id: '2', name: 'Occidente', slug: 'occidente',
    operator: 'Carlos Mendoza', email: 'carlos@trendpilot.marketing',
    states: ['Jalisco', 'Nayarit', 'Colima'],
    vendors: 18, campaigns: 14, commission: '$67,800',
    color: 'bg-purple-500',
  },
  {
    id: '3', name: 'Guadalajara', slug: 'guadalajara',
    operator: 'Ana García', email: 'ana@trendpilot.marketing',
    states: ['Zona Metro GDL'],
    vendors: 24, campaigns: 19, commission: '$89,400',
    color: 'bg-pink-500',
  },
  {
    id: '4', name: 'Sureste', slug: 'sureste',
    operator: 'Roberto Chan', email: 'roberto@trendpilot.marketing',
    states: ['Yucatán', 'Quintana Roo', 'Tabasco'],
    vendors: 9, campaigns: 6, commission: '$31,500',
    color: 'bg-teal-500',
  },
  {
    id: '5', name: 'Centro', slug: 'centro',
    operator: 'Miguel Ángel Torres', email: 'miguel@trendpilot.marketing',
    states: ['CDMX', 'EdoMex', 'Hidalgo'],
    vendors: 31, campaigns: 25, commission: '$112,700',
    color: 'bg-orange-500',
  },
  {
    id: '6', name: 'Norte', slug: 'norte',
    operator: 'Luis Hernández', email: 'luis@trendpilot.marketing',
    states: ['Nuevo León', 'Coahuila', 'Chihuahua'],
    vendors: 15, campaigns: 11, commission: '$53,900',
    color: 'bg-red-500',
  },
]

export default function FranquiciaPage() {
  const totalVendors   = REGIONS.reduce((s, r) => s + r.vendors, 0)
  const totalCampaigns = REGIONS.reduce((s, r) => s + r.campaigns, 0)

  return (
    <div className="space-y-6 max-w-[1200px]">

      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
            <Building2 size={15} className="text-brand-primary" />
          </div>
          Franquicia Familiar
        </h1>
        <p className="text-sm text-brand-muted mt-1">Red de 6 regiones · Operación nacional · Mayo 2026</p>
      </div>

      {/* Resumen Nacional */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '40ms' }}>
        {[
          { label: 'Regiones activas',   value: '6',         icon: MapPin,      color: 'text-brand-primary' },
          { label: 'Vendors totales',     value: String(totalVendors),   icon: Users,       color: 'text-brand-green' },
          { label: 'Campañas activas',    value: String(totalCampaigns), icon: Radio,       color: 'text-brand-yellow' },
          { label: 'Comisiones mayo',     value: '$400,500',  icon: DollarSign,  color: 'text-brand-green' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-brand-card border border-brand-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={color} />
              <span className="text-[11px] text-brand-faint uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Distribución Antonio */}
      <div className="bg-brand-primary/8 border border-brand-primary/25 rounded-2xl p-4 flex items-center gap-3 animate-fade-in" style={{ animationDelay: '60ms' }}>
        <TrendingUp size={18} className="text-brand-primary shrink-0" />
        <div>
          <p className="text-sm font-semibold text-brand-text">
            Antonio recibe <span className="text-brand-primary">30%</span> de todas las regiones
          </p>
          <p className="text-xs text-brand-muted mt-0.5">
            = <span className="text-brand-green font-mono font-bold">$120,150 MXN</span> este mes · Split: 70% operador / 30% central
          </p>
        </div>
      </div>

      {/* Grid de regiones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '80ms' }}>
        {REGIONS.map((region) => (
          <div key={region.id} className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4 hover:border-brand-primary/30 transition-colors">

            {/* Header región */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-3 h-3 rounded-full ${region.color} shrink-0`} />
                <div>
                  <p className="font-bold text-brand-text text-sm">{region.name}</p>
                  <p className="text-[10px] text-brand-faint font-mono">{region.slug}.trendpilot.marketing</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-brand-green/15 text-brand-green rounded-full font-medium">Activa</span>
            </div>

            {/* Operador */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-brand-muted">Operador</p>
              <p className="text-sm text-brand-text">{region.operator}</p>
              <p className="text-[11px] text-brand-faint font-mono">{region.email}</p>
            </div>

            {/* Estados */}
            <div>
              <p className="text-xs font-semibold text-brand-muted mb-1.5">Estados</p>
              <div className="flex flex-wrap gap-1">
                {region.states.map((s) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 bg-brand-hover border border-brand-border rounded-full text-brand-faint">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-brand-border">
              <div className="text-center">
                <p className="text-sm font-bold text-brand-text font-mono">{region.vendors}</p>
                <p className="text-[10px] text-brand-faint">Vendors</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-brand-primary font-mono">{region.campaigns}</p>
                <p className="text-[10px] text-brand-faint">Campañas</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-brand-green font-mono">{region.commission}</p>
                <p className="text-[10px] text-brand-faint">Comisión</p>
              </div>
            </div>

            {/* Split */}
            <p className="text-[10px] text-brand-faint text-center">70% operador · 30% central</p>
          </div>
        ))}
      </div>

    </div>
  )
}
