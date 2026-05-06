// DocuSeal — Contratos digitales para vendors de TrendPilot
// API: https://api.docuseal.com
// Requiere DOCUSEAL_API_KEY y DOCUSEAL_TEMPLATE_ID en variables de entorno
// Sin credenciales: modo mock con URL de firma ficticia

const API_URL      = 'https://api.docuseal.com'
const HAS_DOCUSEAL = Boolean(process.env.DOCUSEAL_API_KEY && process.env.DOCUSEAL_TEMPLATE_ID)

export interface DocuSealSubmission {
  id:       string
  status:   'pending' | 'completed' | 'declined'
  sign_url: string
}

// ─── Crear contrato para un vendor ────────────────────────────────────────────

export async function createVendorContract(params: {
  vendorId:   string
  vendorName: string
  email:      string
  phone?:     string
}): Promise<DocuSealSubmission> {
  if (!HAS_DOCUSEAL) {
    // Mock: URL de firma ficticia para desarrollo
    return {
      id:       `mock_${Date.now()}`,
      status:   'pending',
      sign_url: `https://docuseal.com/sign/demo-${params.vendorId}`,
    }
  }

  const res = await fetch(`${API_URL}/submissions`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token':  process.env.DOCUSEAL_API_KEY!,
    },
    body: JSON.stringify({
      template_id: Number(process.env.DOCUSEAL_TEMPLATE_ID),
      send_email:  false,   // enviamos el link por WhatsApp y email manualmente
      submitters: [
        {
          role:  'Vendor',
          email: params.email,
          name:  params.vendorName,
          fields: [
            { name: 'VendorID',   default_value: params.vendorId },
            { name: 'VendorName', default_value: params.vendorName },
            { name: 'Phone',      default_value: params.phone ?? '' },
            { name: 'Date',       default_value: new Date().toLocaleDateString('es-MX') },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`DocuSeal error ${res.status}: ${errText}`)
  }

  const data       = await res.json()
  const submitter  = Array.isArray(data.submitters) ? data.submitters[0] : null
  const signUrl    = submitter?.slug
    ? `https://docuseal.com/s/${submitter.slug}`
    : (data.audit_log_url ?? '')

  return {
    id:       String(data.id),
    status:   'pending',
    sign_url: signUrl,
  }
}

// ─── Verificar estado de un submission ────────────────────────────────────────

export async function getSubmissionStatus(submissionId: string): Promise<DocuSealSubmission> {
  if (!HAS_DOCUSEAL || submissionId.startsWith('mock_')) {
    return { id: submissionId, status: 'pending', sign_url: '' }
  }

  const res = await fetch(`${API_URL}/submissions/${submissionId}`, {
    headers: { 'X-Auth-Token': process.env.DOCUSEAL_API_KEY! },
  })

  if (!res.ok) throw new Error(`DocuSeal GET error ${res.status}`)
  const data = await res.json()

  const status: DocuSealSubmission['status'] =
    data.status === 'completed' ? 'completed' :
    data.status === 'declined'  ? 'declined'  : 'pending'

  return { id: String(data.id), status, sign_url: data.audit_log_url ?? '' }
}

// ─── Eliminar submission (si el vendor rechaza) ───────────────────────────────

export async function deleteSubmission(submissionId: string): Promise<void> {
  if (!HAS_DOCUSEAL || submissionId.startsWith('mock_')) return

  await fetch(`${API_URL}/submissions/${submissionId}`, {
    method:  'DELETE',
    headers: { 'X-Auth-Token': process.env.DOCUSEAL_API_KEY! },
  })
}
