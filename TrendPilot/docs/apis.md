# APIs externas — TrendPilot

## Google Trends
Librería: pytrends (Python) / google-trends-api (Node)
Sin API key — rate limit 1 req/5 segundos
Datos: hasta 5 años historial por keyword
Endpoint proxy: Railway worker cada 6 horas

## MercadoLibre API
Registro: developers.mercadolibre.com.mx
Endpoints:
  GET /trends/MLM → tendencias México hoy
  GET /sites/MLM/search?q={keyword} → buscar productos
  GET /sites/MLM/categories → categorías
Token: OAuth2, renovar cada 6 horas via Railway cron

## Meta Ads Library (gratis)
Token: Facebook Developer App
Uso: analizar anuncios exitosos de competencia

## Meta Ads API (campañas reales)
App ID: registrar en developers.facebook.com
Permisos: ads_management, ads_read

## TikTok Ads API
Registro: ads.tiktok.com/marketing_api
Requiere cuenta TikTok Business verificada

## Mercado Pago Marketplace
Split automático en cada venta
Webhook: Railway → /api/webhook-mp

## Twilio WhatsApp
Mismo account que AFORIA
Nuevo sender para TrendPilot

## DocuSeal
Mismo account que AFORIA
Nuevo template contrato vendedor TrendPilot

## DALL-E 3
OpenAI API key
Uso: generar imágenes de anuncios automáticamente

## Resend
Uso: emails transaccionales y reportes semanales
