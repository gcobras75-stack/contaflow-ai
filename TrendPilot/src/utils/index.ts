import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { SemaphoreColor } from '@/types'

// Combinar clases de Tailwind sin conflictos
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatear moneda en MXN
export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount)
}

// Formatear número compacto
export function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

// Calcular color del semáforo según ROI
export function getSemaphoreColor(roi: number): SemaphoreColor {
  if (roi > 150) return 'green'
  if (roi >= 80) return 'yellow'
  return 'red'
}

// Clases CSS para cada color de semáforo
export function getSemaphoreClasses(color: SemaphoreColor): string {
  switch (color) {
    case 'green':
      return 'text-[#00FF88] bg-[#00FF88]/10 border-[#00FF88]/30'
    case 'yellow':
      return 'text-[#FFB800] bg-[#FFB800]/10 border-[#FFB800]/30'
    case 'red':
    case 'paused':
      return 'text-[#FF3B30] bg-[#FF3B30]/10 border-[#FF3B30]/30'
  }
}

// Etiqueta legible para cada color de semáforo
export function getSemaphoreLabel(color: SemaphoreColor): string {
  switch (color) {
    case 'green': return 'Activa'
    case 'yellow': return 'En revisión'
    case 'red': return 'Pausada'
    case 'paused': return 'Pausada'
  }
}
