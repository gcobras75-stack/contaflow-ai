'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { logServerError } from '@/lib/logger'
import { createProduct } from '@/lib/queries/products'
import { getVendorById } from '@/lib/queries/vendors'

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

  const session = await auth()
  if (!session?.user) return { error: 'Sesión expirada. Inicia sesión de nuevo.' }

  const vendorId = session.user.vendorId
  if (!vendorId) return { error: 'Solo los vendedores pueden registrar productos.' }

  const vendor = await getVendorById(vendorId)
  if (!vendor) return { error: 'Solo los vendedores pueden registrar productos.' }

  const images: string[] = image_url ? [image_url] : []

  try {
    const product = await createProduct({
      vendor_id:   vendor.id,
      name,
      description: description ?? undefined,
      price,
      category:    category ?? undefined,
      images,
    })

    // Trigger async scoring — vía API (fire-and-forget)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/products/${product.id}/score`, {
      method: 'POST',
    }).catch(() => {/* silencioso */})
  } catch (error) {
    logServerError(error, 'createProductAction/insert')
    return { error: 'No se pudo registrar el producto. Intenta de nuevo.' }
  }

  redirect('/dashboard/products?created=true')
}
