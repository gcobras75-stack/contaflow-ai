'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase-server'
import { logServerError } from '@/lib/logger'

const ProductFormSchema = z.object({
  name:        z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  price:       z.coerce.number().positive('El precio debe ser mayor a 0').max(999_999),
  category:    z.string().max(100).trim().optional(),
  image_url:   z.string().url('URL de imagen inválida').optional().or(z.literal('')),
})

export async function createProductAction(
  _prev: unknown,
  formData: FormData
): Promise<{ error: string } | void> {
  const raw = {
    name:        formData.get('name'),
    description: formData.get('description') || undefined,
    price:       formData.get('price'),
    category:    formData.get('category') || undefined,
    image_url:   formData.get('image_url') || undefined,
  }

  const parsed = ProductFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, description, price, category, image_url } = parsed.data

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión expirada. Inicia sesión de nuevo.' }

  // Obtener vendor_id del usuario
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!vendor) return { error: 'Solo los vendedores pueden registrar productos.' }

  const images: string[] = image_url ? [image_url] : []

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      vendor_id:   vendor.id,
      name,
      description: description ?? null,
      price,
      category:    category ?? null,
      images,
      status:      'pending',
    })
    .select('id')
    .single()

  if (error || !product) {
    logServerError(error, 'createProductAction/insert')
    return { error: 'No se pudo registrar el producto. Intenta de nuevo.' }
  }

  // Trigger async scoring — vía API (fire-and-forget)
  const productId = product.id
  fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/products/${productId}/score`, {
    method: 'POST',
  }).catch(() => {/* silencioso */})

  redirect('/dashboard/products?created=true')
}
