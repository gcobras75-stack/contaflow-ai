'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Radio, Zap, Loader2, AlertCircle, CheckCircle2, Users } from 'lucide-react'
import { cn } from '@/utils'

interface AudienceSuggestion {
  gender:     string
  age_min:    number
  age_max:    number
  interests:  string[]
  cities:     string[]
  devices:    string
  best_hours: string[]
}

interface AdCreativePreview {
  headlines:    string[]
  descriptions: string[]
  cta_options:  string[]
  audience:     AudienceSuggestion
}

const PLATFORMS = [
  { value: 'meta',   label: 'Meta (Facebook + Instagram)', icon: '📘' },
  { value: 'tiktok', label: 'TikTok Ads',                  icon: '🎵' },
  { value: 'both',   label: 'Ambas plataformas',           icon: '🚀' },
]

export default function NewCampaignPage() {
  const router = useRouter()
  const [step, setStep]         = useState<1 | 2 | 3>(1)
  const [isPending, startTrans] = useTransition()
  const [error, setError]       = useState<string | null>(null)

  // Datos del formulario
  const [productId, setProductId]   = useState('')
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState(0)
  const [productCat, setProductCat] = useState('')
  const [vendorId, setVendorId]     = useState('')
  const [platform, setPlatform]     = useState<'meta' | 'tiktok' | 'both'>('meta')
  const [dailyBudget, setDailyBudget] = useState('')
  const [durationDays, setDurationDays] = useState('15')

  // Resultado AdBuilder
  const [creatives, setCreatives]     = useState<AdCreativePreview | null>(null)
  const [selectedHeadline, setSelectedHeadline] = useState(0)
  const [selectedDesc, setSelectedDesc] = useState(0)
  const [selectedCta, setSelectedCta]   = useState('Comprar ahora')
  const [campaignId, setCampaignId]     = useState<string | null>(null)

  const totalBudget = Math.round(Number(dailyBudget) * Number(durationDays) * 100)

  // STEP 1 → Crear campaña + generar creativos
  async function handleCreateCampaign() {
    if (!productId || !vendorId || !dailyBudget || !durationDays) {
      setError('Completa todos los campos')
      return
    }
    setError(null)

    startTrans(async () => {
      try {
        // Crear campaña
        const campRes = await fetch('/api/campaigns', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id:   productId,
            vendor_id:    vendorId,
            platform,
            budget_total: totalBudget,
          }),
        })

        if (!campRes.ok) {
          const err = await campRes.json()
          throw new Error(err.error ?? 'Error al crear campaña')
        }

        const { data: camp } = await campRes.json()
        setCampaignId(camp.id)

        // Generar creativos con AdBuilder
        const adRes = await fetch('/api/ad-creatives', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_id:   camp.id,
            product_name:  productName || 'Producto',
            product_price: productPrice || 0,
            category:      productCat,
            platform,
          }),
        })

        if (adRes.ok) {
          const { creatives: adCreatives } = await adRes.json()
          setCreatives(adCreatives)
        }

        setStep(2)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al crear campaña')
      }
    })
  }

  // STEP 2 → Aprobar creativos
  function handleApproveCreatives() {
    setStep(3)
  }

  // STEP 3 → Finalizar
  function handleFinish() {
    if (campaignId) {
      router.push(`/dashboard/campaigns/${campaignId}`)
    } else {
      router.push('/dashboard/campaigns')
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-brand-border transition-colors text-brand-muted hover:text-white">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio size={20} className="text-brand-primary" />
            Nueva campaña
          </h1>
          <p className="text-sm text-brand-muted mt-0.5">AdBuilder generará los creativos automáticamente</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
              step === s ? 'bg-brand-primary text-white' :
              step > s  ? 'bg-[#00FF88] text-brand-bg' :
              'bg-brand-border text-brand-muted'
            )}>
              {step > s ? '✓' : s}
            </div>
            <span className={cn('text-xs', step >= s ? 'text-white' : 'text-brand-muted')}>
              {s === 1 ? 'Configurar' : s === 2 ? 'Revisar creativos' : 'Confirmar'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-brand-border mx-1" />}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl px-4 py-3 mb-4 text-sm text-[#FF3B30]">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {/* STEP 1 — Configuración */}
      {step === 1 && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-5">
          {/* Producto — input manual simplificado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-brand-muted mb-1.5 block">ID del producto *</label>
              <input
                type="text" value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="UUID del producto aprobado"
                className="w-full bg-brand-border border border-brand-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-brand-muted mb-1.5 block">ID del vendor *</label>
              <input
                type="text" value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                placeholder="UUID del vendor"
                className="w-full bg-brand-border border border-brand-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>
          </div>

          {/* Nombre del producto para AdBuilder */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-brand-muted mb-1.5 block">Nombre del producto</label>
              <input
                type="text" value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Para que la IA genere creativos"
                className="w-full bg-brand-border border border-brand-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-brand-muted mb-1.5 block">Precio (MXN)</label>
              <input
                type="number" value={productPrice || ''}
                onChange={(e) => setProductPrice(Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-brand-border border border-brand-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-brand-muted mb-1.5 block">Categoría</label>
            <input
              type="text" value={productCat}
              onChange={(e) => setProductCat(e.target.value)}
              placeholder="Ej: Electrónica, Moda, Cosméticos"
              className="w-full bg-brand-border border border-brand-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Plataforma */}
          <div>
            <label className="text-xs text-brand-muted mb-2 block">Plataforma *</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((p) => (
                <label
                  key={p.value}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-colors',
                    platform === p.value
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-brand-border hover:border-brand-primary/50'
                  )}
                >
                  <input
                    type="radio" name="platform" value={p.value}
                    checked={platform === p.value}
                    onChange={() => setPlatform(p.value as typeof platform)}
                    className="sr-only"
                  />
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-[10px] text-white text-center leading-tight">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Presupuesto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-brand-muted mb-1.5 block">Presupuesto diario (MXN) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brand-muted">$</span>
                <input
                  type="number" value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  placeholder="500"
                  min="100"
                  className="w-full bg-brand-border border border-brand-border rounded-lg pl-7 pr-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-brand-muted mb-1.5 block">Duración (días) *</label>
              <input
                type="number" value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="15"
                min="1" max="365"
                className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>
          </div>

          {/* Resumen presupuesto */}
          {dailyBudget && durationDays && (
            <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-3 text-sm">
              <p className="text-brand-muted text-xs mb-1">Resumen presupuesto</p>
              <p className="text-white font-semibold">
                Total: ${(Number(dailyBudget) * Number(durationDays)).toLocaleString('es-MX')} MXN
              </p>
              <p className="text-xs text-brand-muted">${Number(dailyBudget).toLocaleString('es-MX')} MXN/día × {durationDays} días</p>
            </div>
          )}

          {/* Info AdBuilder */}
          <div className="bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-xl p-3">
            <p className="text-xs text-[#00FF88] font-semibold mb-1 flex items-center gap-1.5">
              <Zap size={12} /> AdBuilder con IA
            </p>
            <p className="text-xs text-brand-muted">
              Claude generará 3 headlines, 3 descripciones y una audiencia sugerida basada en el producto.
              Podrás revisarlos en el siguiente paso.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => router.back()} className="flex-1 px-4 py-2.5 bg-brand-border text-white rounded-lg text-sm hover:bg-brand-border/80 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleCreateCampaign}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Generando IA…</> : 'Crear y generar creativos →'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Revisar creativos */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Zap size={16} className="text-[#00FF88]" />
              Creativos generados por AdBuilder
            </h2>

            {!creatives ? (
              <div className="text-center py-8">
                <Loader2 size={24} className="animate-spin text-brand-primary mx-auto mb-2" />
                <p className="text-sm text-brand-muted">Generando creativos con IA…</p>
              </div>
            ) : (
              <>
                {/* Headlines */}
                <div>
                  <label className="text-xs text-brand-muted mb-2 block">Headline (título) — elige uno:</label>
                  <div className="space-y-2">
                    {creatives.headlines.map((h, i) => (
                      <label key={i} className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedHeadline === i ? 'border-brand-primary bg-brand-primary/10' : 'border-brand-border hover:border-brand-primary/50'
                      )}>
                        <input type="radio" name="headline" checked={selectedHeadline === i} onChange={() => setSelectedHeadline(i)} className="mt-0.5 accent-[#0066FF]" />
                        <div>
                          <p className="text-sm text-white">{h}</p>
                          <p className="text-[10px] text-brand-muted">{h.length}/40 chars</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Descripciones */}
                <div>
                  <label className="text-xs text-brand-muted mb-2 block">Descripción — elige una:</label>
                  <div className="space-y-2">
                    {creatives.descriptions.map((d, i) => (
                      <label key={i} className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedDesc === i ? 'border-brand-primary bg-brand-primary/10' : 'border-brand-border hover:border-brand-primary/50'
                      )}>
                        <input type="radio" name="desc" checked={selectedDesc === i} onChange={() => setSelectedDesc(i)} className="mt-0.5 accent-[#0066FF]" />
                        <div>
                          <p className="text-sm text-white">{d}</p>
                          <p className="text-[10px] text-brand-muted">{d.length}/125 chars</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div>
                  <label className="text-xs text-brand-muted mb-2 block">Call to Action:</label>
                  <div className="flex flex-wrap gap-2">
                    {creatives.cta_options.map((cta) => (
                      <button
                        key={cta}
                        onClick={() => setSelectedCta(cta)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm transition-colors border',
                          selectedCta === cta ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-border text-brand-muted border-brand-border hover:text-white'
                        )}
                      >
                        {cta}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audiencia */}
                <div className="bg-brand-bg/60 border border-brand-border rounded-xl p-4">
                  <p className="text-xs text-brand-muted mb-2 flex items-center gap-1.5">
                    <Users size={12} /> Audiencia sugerida por IA
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-brand-muted">Género:</span> <span className="text-white">{creatives.audience.gender === 'all' ? 'Todos' : creatives.audience.gender}</span></div>
                    <div><span className="text-brand-muted">Edad:</span> <span className="text-white">{creatives.audience.age_min}-{creatives.audience.age_max} años</span></div>
                    <div className="col-span-2"><span className="text-brand-muted">Intereses:</span> <span className="text-white">{creatives.audience.interests.join(', ')}</span></div>
                    <div className="col-span-2"><span className="text-brand-muted">Ciudades:</span> <span className="text-white">{creatives.audience.cities.join(', ')}</span></div>
                    <div><span className="text-brand-muted">Dispositivos:</span> <span className="text-white">{creatives.audience.devices}</span></div>
                    <div><span className="text-brand-muted">Mejores horas:</span> <span className="text-white">{creatives.audience.best_hours.join(', ')}</span></div>
                  </div>
                </div>

                {/* Imagen placeholder */}
                <div className="relative bg-gradient-to-br from-brand-primary/20 to-[#00FF88]/10 border border-brand-primary/30 rounded-xl h-32 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">{productName || 'Tu Producto'}</p>
                    <p className="text-xs text-brand-muted mt-1">Vista previa del anuncio</p>
                    <p className="text-[10px] text-brand-primary mt-0.5">DALL-E 3 se conecta en sesión 5</p>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 px-4 py-2.5 bg-brand-border text-white rounded-lg text-sm hover:bg-brand-border/80 transition-colors">
                ← Modificar
              </button>
              <button
                onClick={handleApproveCreatives}
                className="flex-1 px-4 py-2.5 bg-brand-primary hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Aprobar y continuar →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 — Confirmación */}
      {step === 3 && (
        <div className="bg-brand-surface border border-[#00FF88]/30 rounded-2xl p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/30 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-[#00FF88]" />
          </div>
          <h2 className="text-lg font-bold text-white">¡Campaña creada!</h2>
          <p className="text-sm text-brand-muted">
            La campaña está en estado <span className="text-[#FFB800] font-medium">Amarillo (configurando)</span>.
            El equipo la activará cuando esté lista.
          </p>
          <div className="bg-brand-bg/60 rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-muted">Headline:</span>
              <span className="text-white">{creatives?.headlines[selectedHeadline]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">CTA:</span>
              <span className="text-white">{selectedCta}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">Plataforma:</span>
              <span className="text-white capitalize">{platform}</span>
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="w-full px-4 py-2.5 bg-brand-primary hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Ver campaña →
          </button>
        </div>
      )}
    </div>
  )
}
