# TrendPilot — Contexto completo del proyecto

## ¿Qué es TrendPilot?
Plataforma SaaS de marketing automatizado con IA 
para e-commerce en México. Detecta tendencias de 
productos en tiempo real, encuentra vendedores 
óptimos, lanza campañas publicitarias automáticas 
en Meta y TikTok, y cobra comisiones por ventas 
generadas. Dominio: trendpilot.marketing

## Propietarios
- Antonio (PC) — arquitectura, finanzas, supervisión
- José Antonio (tablet Android) — operación diaria

## Stack tecnológico OBLIGATORIO
- Frontend web: Next.js 14 + Tailwind CSS
- Panel móvil: Expo React Native (--lan siempre)
- Base de datos: Supabase (proyecto nuevo TrendPilot)
- Hosting frontend: Vercel
- Backend/workers: Railway
- IA central: Claude API claude-sonnet-4-20250514
- Imágenes IA: DALL-E 3 API
- Pagos: Mercado Pago Marketplace API (split)
- WhatsApp: Twilio
- Contratos digitales: DocuSeal
- Campañas: Meta Ads API + TikTok Ads API
- Tendencias: Google Trends + MercadoLibre API
- Scraping: Puppeteer MCP
- Email: Resend

## Identidad visual OBLIGATORIA
- Azul profundo: #0A1628 (fondo principal)
- Azul eléctrico: #0066FF (acciones primarias)
- Verde activo: #00FF88 (campañas funcionando)
- Rojo pausado: #FF3B30 (campañas pausadas)
- Amarillo alerta: #FFB800 (campañas en revisión)
- Fuente: Inter
- Estilo: Dark mode, moderno, premium

## Los 14 módulos del sistema
1.  TrendRadar     — Motor tendencias tiempo real
2.  EarlySignal    — Detector temprano oportunidades
3.  ProductScore   — Score producto antes de aceptar
4.  SellerHunter   — Cazador automático vendedores
5.  AdBuilder      — Creador anuncios con IA
6.  SplitTest      — A/B Testing automático
7.  CampaignPilot  — Monitor semáforo campañas 24/7
8.  ReachBack      — Retargeting automático
9.  DirectPilot    — WhatsApp marketing automático
10. InfluMatch     — Matching micro-influencers
11. GrowthFund     — Fondo rotativo 40% comisiones
12. TrustScore     — Reputación vendedores
13. MarketSpy      — Inteligencia competitiva
14. SeasonAlert    — Calendario temporadas México

## Modelo de negocio
- 100% por comisión — sin suscripciones, sin mensualidades
- Registro gratis — sin tarjeta de crédito
- Productos y campañas ilimitadas desde el primer día
- Solo 25% de comisión cuando hay una venta real generada
- Si no vendemos → el vendor no paga nada
- GrowthFund: 40% de comisiones se reinvierte en nuevas campañas
- Split automático Mercado Pago: vendor 75% / TrendPilot 25%
- commission_rate configurable por vendor (default 25, rango 10-50)

## Reglas de desarrollo SIEMPRE
- Código y variables: inglés
- Contenido UI para usuario: español
- Mobile-first — optimizado para tablet Android
- Cada módulo es independiente y desacoplado
- NUNCA hardcodear secrets — siempre .env.local
- Siempre manejar errores de APIs externas con retry
- Siempre loading states en operaciones async
- Comentarios en código: español

## Entorno de trabajo
- PC: Windows 11, usuario ECApro
- Credenciales: C:\Users\ECApro\mis-credenciales.txt
- Vercel team: team_unVVQEqURoqUL7pdY3kHLWGp
- Expo: siempre usar --lan nunca --tunnel

## Semáforo de campañas
- VERDE: ROI mayor 150% → continúa automático
- AMARILLO: ROI entre 80-150% → monitoreo
- ROJO: ROI menor 80% o 0 ventas 48hrs → pausa

## Nano Banana — Generación de imágenes (Sesión 17)
- Módulo: `src/lib/image-providers/nano-banana.ts`
- API: Google Gemini `gemini-2.0-flash-exp` con `responseModalities: ['IMAGE', 'TEXT']`
- Header: `x-goog-api-key: {GOOGLE_API_KEY}` (NO Authorization Bearer)
- Funciones: `generateProductImage`, `generateImageWithText`, `generateProductVariants`, `generateComparatorImage`
- 3 estilos: `product_only`, `lifestyle`, `comparison`
- Prioridad en AdBuilder: GOOGLE_API_KEY → Nano Banana, OPENAI_API_KEY → DALL-E 3, ninguno → null
- Mock automático si GOOGLE_API_KEY no está configurada

## Google Shopping Ads — Tercera plataforma (Sesión 17)
- Módulo: `src/lib/google-ads.ts` — mock por defecto si no hay credenciales
- Setup guide: `/dashboard/setup/google-ads` (superadmin only) — 5 pasos interactivos
- Variables de entorno necesarias: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_REFRESH_TOKEN
- `GOOGLE_API_KEY` ya está configurada en Vercel (usada para Nano Banana + Google Shopping base)
- Funciones: `createMerchantCenterProduct`, `createShoppingCampaign`, `getCampaignMetrics`, `getAllShoppingCampaigns`, `getGoogleShoppingSummary`
- Badge en CampaignCard: `bg-[#4285F4]/15 text-[#4285F4]` (azul Google)
- Platform enum DB: `['meta', 'tiktok', 'both']` — Google Shopping usa mock data, no inserta en DB aún
- Analytics: tab "Google Shopping" con KPIs, tabla comparativa Multi-plataforma
- AdBuilder PLATFORMS: meta, tiktok, both, google (4 opciones en grid 2x2)
