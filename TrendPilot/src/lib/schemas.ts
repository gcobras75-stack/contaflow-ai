import { z } from 'zod'

// ─── Vendors ───────────────────────────────────────────────
export const VendorCreateSchema = z.object({
  name:             z.string().min(2).max(100).trim(),
  email:            z.string().email().toLowerCase().trim(),
  phone:            z.string().regex(/^\+?[0-9]{10,15}$/, 'Teléfono inválido').optional(),
  whatsapp_number:  z.string().regex(/^\+?[0-9]{10,15}$/, 'WhatsApp inválido').optional(),
  plan:             z.enum(['despegue','piloto','comandante','flota']).default('despegue'),
})

export const VendorUpdateSchema = VendorCreateSchema.partial().omit({
  email: true,   // el email no se puede cambiar
  plan: true,    // el plan no lo cambia el vendedor directamente
}).extend({
  // Solo admin puede cambiar el estado de un vendor
  status: z.enum(['active', 'suspended', 'pending']).optional(),
})

// ─── Products ──────────────────────────────────────────────
export const ProductCreateSchema = z.object({
  name:        z.string().min(3).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  price:       z.number().positive().max(999_999),
  category:    z.string().max(100).trim().optional(),
  images:      z.array(z.string().url()).max(10).default([]),
})

export const ProductUpdateSchema = ProductCreateSchema.partial()

// ─── Campaigns (solo admin/sistema puede crearlas) ─────────
export const CampaignCreateSchema = z.object({
  product_id:   z.string().uuid(),
  vendor_id:    z.string().uuid(),
  platform:     z.enum(['meta','tiktok','both']),
  budget_total: z.number().positive().max(1_000_000),
})

// ─── Webhook Mercado Pago ──────────────────────────────────
export const MPWebhookSchema = z.object({
  action: z.enum(['payment.created','payment.updated']),
  api_version: z.string(),
  data: z.object({
    id: z.string(),
  }),
  date_created: z.string(),
  id: z.number(),
  live_mode: z.boolean(),
  type: z.enum(['payment','plan','subscription','invoice','point_integration_wh']),
  user_id: z.string(),
})

// ─── Pagination ────────────────────────────────────────────
export const PaginationSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ─── IDs ───────────────────────────────────────────────────
export const UUIDSchema = z.string().uuid('ID inválido')

// Tipo inferido de Zod
export type VendorCreate = z.infer<typeof VendorCreateSchema>
export type VendorUpdate = z.infer<typeof VendorUpdateSchema>
export type ProductCreate = z.infer<typeof ProductCreateSchema>
export type CampaignCreate = z.infer<typeof CampaignCreateSchema>
export type MPWebhook = z.infer<typeof MPWebhookSchema>
