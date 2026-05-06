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
  if (/audífono|celular|iphone|tablet|laptop|electr|cable|cargador|bluetooth|inalámbr|smartwatch|reloj inteligente/.test(k)) return Smartphone
  if (/ropa|camisa|pantalón|vestido|moda|tenis|zapato|playera|chamarra|suéter/.test(k))        return Shirt
  if (/hogar|casa|cocina|mueble|lamp|silla|mesa|almohada|aspirador|airfryer|freidora/.test(k)) return Home
  if (/belleza|crema|suero|vitamina|colágeno|maquillaj|perfume|shampoo|skin|serum/.test(k))    return Sparkles
  if (/deport|gym|pesa|yoga|ejercicio|bicicleta|fitness|proteína/.test(k))                     return Dumbbell
  if (/alimento|comida|bebida|snack|café|fruta|orgánico/.test(k))                              return Apple
  if (/game|consola|videojuego|nintendo|playstation|xbox|teclado|gaming|gamer/.test(k))        return Gamepad2
  if (/herramienta|tornillo|taladro|martillo|llave|construcción/.test(k))                      return Wrench
  return Package
}

// Emojis por categoría de producto (fallback visual)
function getEmoji(keyword: string): string {
  const k = keyword.toLowerCase()
  if (/airfryer|freidora/.test(k))                                           return '🍳'
  if (/smartwatch|reloj inteligente/.test(k))                                return '⌚'
  if (/teclado/.test(k))                                                     return '⌨️'
  if (/suero|vitamina|colágeno|serum/.test(k))                               return '💊'
  if (/gps|mascota|perro|gato/.test(k))                                      return '🐾'
  if (/audífono|auricular|headphone|bluetooth/.test(k))                      return '🎧'
  if (/celular|iphone|smartphone/.test(k))                                   return '📱'
  if (/cargador|cable|batería/.test(k))                                      return '🔋'
  if (/ropa|vestido|camisa|playera/.test(k))                                 return '👕'
  if (/zapato|tenis/.test(k))                                                return '👟'
  if (/bolsa|mochila/.test(k))                                               return '👜'
  if (/crema|perfume|maquillaj|shampoo|belleza/.test(k))                     return '✨'
  if (/consola|videojuego|gaming|gamer/.test(k))                             return '🎮'
  if (/herramienta|taladro|martillo/.test(k))                                return '🔧'
  if (/comida|alimento|snack|café/.test(k))                                  return '🍽️'
  if (/yoga|gym|deport|fitness/.test(k))                                     return '💪'
  return '📦'
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ImageSize = 'sm' | 'md' | 'lg' | 'hero' | number

const NAMED_SIZES: Record<'sm' | 'md' | 'lg', number> = { sm: 40, md: 72, lg: 120 }

function resolvePixelSize(size: ImageSize): number | null {
  if (size === 'hero') return null
  if (typeof size === 'number') return size
  return NAMED_SIZES[size]
}

// ─── Componente ──────────────────────────────────────────────────────────────

interface ProductImageProps {
  keyword:    string
  src?:       string | null
  size?:      ImageSize
  radius?:    number
  className?: string
}

export function ProductImage({
  keyword,
  src,
  size   = 'md',
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

  const hash     = strHash(keyword || 'producto')
  const [c1, c2] = GRADIENTS[hash % GRADIENTS.length]
  const Icon     = getIcon(keyword || '')
  const emoji    = getEmoji(keyword || '')

  const px     = resolvePixelSize(size)
  const isHero = px === null

  // ── Hero mode: ocupa 100% del contenedor padre ────────────────────────────
  if (isHero) {
    if (!failed && imgSrc) {
      return (
        <div className={cn('w-full h-full overflow-hidden', className)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={keyword}
            loading="lazy"
            className="w-full h-full object-cover block"
            onError={() => { setImgSrc(null); setFailed(true) }}
          />
        </div>
      )
    }
    if (loading) {
      return <div className={cn('w-full h-full skeleton', className)} />
    }
    // Placeholder hero
    return (
      <div
        className={cn('w-full h-full flex flex-col items-center justify-center', className)}
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      >
        <span className="text-5xl mb-1 select-none">{emoji}</span>
        <Icon size={20} className="text-white/40" />
      </div>
    )
  }

  // ── Tamaño fijo ───────────────────────────────────────────────────────────
  const boxStyle: React.CSSProperties = {
    width: px, height: px, borderRadius: radius, flexShrink: 0,
  }

  // Imagen cargada
  if (!failed && imgSrc) {
    return (
      <div style={boxStyle} className={cn('overflow-hidden shrink-0', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={keyword}
          loading="lazy"
          style={{ width: px, height: px, objectFit: 'cover', display: 'block' }}
          onError={() => { setImgSrc(null); setFailed(true) }}
        />
      </div>
    )
  }

  // Skeleton mientras carga
  if (loading) {
    return <div style={boxStyle} className={cn('skeleton shrink-0', className)} />
  }

  // Placeholder con gradiente + emoji
  return (
    <div
      style={{ ...boxStyle, background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      className={cn('flex flex-col items-center justify-center shrink-0', className)}
    >
      <span className="select-none leading-none" style={{ fontSize: Math.round(px * 0.44) }}>{emoji}</span>
    </div>
  )
}
