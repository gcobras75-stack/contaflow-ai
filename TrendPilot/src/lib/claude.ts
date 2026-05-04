// Cliente de la API de Claude para TrendPilot

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeOptions {
  maxTokens?: number
  systemPrompt?: string
}

export async function askClaude(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {}
): Promise<string> {
  const { maxTokens = 1024, systemPrompt } = options

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} — ${error}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// Genera sugerencias de IA para una campaña
export async function generateCampaignSuggestions(campaignData: {
  product: string
  budget: number
  platform: string
  currentROI: number
}): Promise<string> {
  return askClaude(
    [
      {
        role: 'user',
        content: `Analiza esta campaña de marketing y sugiere optimizaciones:
Producto: ${campaignData.product}
Presupuesto: $${campaignData.budget} MXN
Plataforma: ${campaignData.platform}
ROI actual: ${campaignData.currentROI}%

Dame 3 sugerencias concretas para mejorar el rendimiento.`,
      },
    ],
    {
      maxTokens: 512,
      systemPrompt:
        'Eres un experto en marketing digital para e-commerce en México. Tus sugerencias son concisas, prácticas y basadas en datos.',
    }
  )
}
