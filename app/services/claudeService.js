/**
 * claudeService.js
 * Motor de inteligencia ContaFlow AI — Sesión 4
 * Llama directamente a la API de Anthropic sin SDK
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '';

async function llamarClaude(systemPrompt, userContent) {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';

  // Intentar parsear JSON si la respuesta lo contiene
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1] || jsonMatch[0]); } catch (_) {}
  }
  return text;
}

/**
 * Analiza un estado de cuenta (texto extraído del PDF/CSV/imagen)
 * y devuelve lista de movimientos estructurados.
 *
 * @param {string} contenido — texto crudo del estado de cuenta
 * @returns {Promise<{movimientos: Array<{fecha,concepto,cargo,abono,saldo}>}>}
 */
export async function analizarEstadoCuenta(contenido) {
  const system = `Eres un asistente contable especializado en estados de cuenta bancarios mexicanos.
Analiza el texto del estado de cuenta y extrae TODOS los movimientos.
Responde SOLO con JSON válido en este formato exacto:
{
  "banco": "nombre del banco",
  "periodo": "mes año",
  "cuenta": "últimos 4 dígitos si aparecen",
  "saldo_inicial": 0.00,
  "saldo_final": 0.00,
  "movimientos": [
    {
      "fecha": "YYYY-MM-DD",
      "concepto": "descripción del movimiento",
      "referencia": "número de referencia si existe",
      "cargo": 0.00,
      "abono": 0.00
    }
  ]
}
Usa null para campos que no puedas identificar. Los montos siempre como número decimal.`;

  return llamarClaude(system, `Analiza este estado de cuenta:\n\n${contenido}`);
}

/**
 * Concilia movimientos bancarios contra CFDIs registrados en el sistema.
 *
 * @param {Array} movimientos — lista de movimientos del estado de cuenta
 * @param {Array} cfdis — CFDIs registrados en Supabase para esa empresa
 * @returns {Promise<{pagados, pendientes, sin_cfdi, resumen}>}
 */
export async function conciliarMovimientos(movimientos, cfdis) {
  const system = `Eres un contador experto en conciliación bancaria para empresas mexicanas.
Compara los movimientos bancarios contra los CFDIs registrados.
Responde SOLO con JSON válido en este formato:
{
  "pagados": [
    { "cfdi_uuid": "...", "movimiento_concepto": "...", "monto": 0.00, "fecha": "YYYY-MM-DD" }
  ],
  "pendientes": [
    { "cfdi_uuid": "...", "total": 0.00, "fecha_emision": "YYYY-MM-DD", "motivo": "sin movimiento bancario" }
  ],
  "sin_cfdi": [
    { "concepto": "...", "monto": 0.00, "fecha": "YYYY-MM-DD", "sugerencia": "..." }
  ],
  "resumen": {
    "total_conciliado": 0.00,
    "total_pendiente": 0.00,
    "total_sin_cfdi": 0.00,
    "porcentaje_conciliacion": 0
  }
}`;

  const contenido = JSON.stringify({ movimientos, cfdis }, null, 2);
  return llamarClaude(system, `Realiza la conciliación:\n${contenido}`);
}

/**
 * Clasifica un CFDI: determina cuenta contable, deducibilidad y posibles correcciones.
 *
 * @param {Object} cfdi — objeto CFDI con uuid, tipo, subtotal, iva, total, descripcion
 * @returns {Promise<{cuenta_contable, es_deducible, tipo_deduccion, observaciones, correcciones}>}
 */
export async function clasificarCFDI(cfdi) {
  const system = `Eres un contador certificado (CPC) especializado en contabilidad fiscal mexicana.
Analiza el CFDI y clasifícalo según las normas del SAT y el catálogo de cuentas del IMCP.
Responde SOLO con JSON válido:
{
  "cuenta_contable": "NNN - Nombre de la cuenta",
  "subcuenta": "NNN.N - Subcuenta si aplica",
  "es_deducible": true,
  "tipo_deduccion": "100% | 53% | No deducible",
  "iva_acreditable": true,
  "categoria": "Gastos de operación | Activo fijo | Nómina | ...",
  "observaciones": "notas importantes",
  "correcciones": ["lista de posibles errores o advertencias"]
}`;

  return llamarClaude(system, `Clasifica este CFDI:\n${JSON.stringify(cfdi, null, 2)}`);
}
