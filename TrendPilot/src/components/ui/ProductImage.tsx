'use client'

import { useState, useEffect } from 'react'
import {
  Smartphone, Shirt, Home, Sparkles, Dumbbell,
  Apple, Gamepad2, Wrench, Package,
} from 'lucide-react'
import { cn } from '@/utils'

// ─── Gradientes determinísticos ──────────────────────────────────────────────

const GRADIENTS: [string, string][] = [
  ['#0066FF', '#7C3AED'],
  ['#7C3AED', '#EC4899'],
  ['#059669', '#0066FF'],
  ['#D97706', '#DC2626'],
  ['#0891B2', '#059669'],
  ['#1D4ED8', '#7C3AED'],
  ['#EC4899', '#F59E0B'],
  ['#7C3AED', '#0066FF'],
]

function strHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function getIcon(keyword: string) {
  const k = keyword.toLowerCase()
  if (/audífono|celular|iphone|tablet|laptop|electr|cable|cargador|bluetooth|inalámbr/.test(k)) return Smartphone
  if (/ropa|camisa|pantalón|vestido|moda|tenis|zapato|playera|chamarra|suéter/.test(k))        return Shirt
  if (/hogar|casa|cocina|mueble|lamp|silla|mesa|almohada|aspirador/.test(k))                   return Home
  if (/belleza|crema|suplemento|colágeno|vitamina|maquillaj|perfume|shampoo|skin/.test(k))     return Sparkles
  if (/deport|gym|pesa|yoga|ejercicio|bicicleta|fitness|proteína/.test(k))                     return Dumbbell
  if (/alimento|comida|bebida|snack|café|fruta|orgánico/.test(k))                              return Apple
  if (/game|consola|videojuego|nintendo|playstation|xbox|teclado|gaming/.test(k))              return Gamepad2
  if (/herramienta|tornillo|taladro|martillo|llave|construcción/.test(k))                      return Wrench
  return Package
}

// ─── Componente ──────────────────────────────────────────────────────────────

interface ProductImageProps {
  keyword:    string
  src?:       string | null
  size?:      number
  radius?:    number
  className?: string
}

export function ProductImage({
  keyword,
  src,
  size   = 72,
  radius = 12,
  className,
}: ProductImageProps) {
  const [imgSrc,  setImgSrc]  = useState<string | null>(src ?? null)
  const [loading, setLoading] = useState(!src)
  const [failed,  setFailed]  = useState(false)

  useEffect(() => {
    if (src) { setImgSrc(src); setLoading(false); setFailed(false); return }
    if (!keyword) { setLoading(false); return }

    let cancelled = false
    setLoading(true)
    setFailed(false)
    setImgSrc(null)

    fetch(`/api/images/ml-thumbnail?q=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then(({ thumbnail }) => {
        if (cancelled) return
        if (thumbnail) setImgSrc(thumbnail)
        else setFailed(true)
      })
      .catch(() => { if (!cancelled) setFailed(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [keyword, src])

  const hash      = strHash(keyword || 'producto')
  const [c1, c2]  = GRADIENTS[hash % GRADIENTS.length]
  const Icon      = getIcon(keyword || '')
  const initials  = (keyword || '?').split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

  const boxStyle: React.CSSProperties = {
    width: size, height: size, borderRadius: radius, flexShrink: 0,
  }

  // Imagen cargada
  if (!failed && imgSrc) {
    return (
      <div style={boxStyle} className={cn('overflow-hidden shrink-0', className)}>
        <img
          src={imgSrc}
          alt={keyword}
          style={{ width: size, height: size, objectFit: 'cover', display: 'block' }}
          onError={() => { setImgSrc(null); setFailed(true) }}
        />
      </div>
    )
  }

  // Skeleton mientras carga
  if (loading) {
    return <div style={boxStyle} className={cn('skeleton shrink-0', className)} />
  }

  // Placeholder con gradiente + ícono
  return (
    <div
      style={{ ...boxStyle, background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      className={cn('flex flex-col items-center justify-center shrink-0', className)}
    >
      <Icon size={Math.round(size * 0.32)} className="text-white/75 mb-0.5" />
      <span className="text-white/60 font-bold leading-none" style={{ fontSize: Math.round(size * 0.14) }}>
        {initials}
      </span>
    </div>
  )
}
