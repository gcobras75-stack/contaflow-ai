'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, Send, Clock, CheckCircle, XCircle, Filter } from 'lucide-react'
import { cn } from '@/utils'

interface WAMessage {
  id:          string
  vendor_id:   string | null
  vendor_name: string | null
  phone_to:    string
  message:     string
  type:        string
  status:      string
  twilio_sid:  string | null
  error:       string | null
  created_at:  string
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  welcome:           { label: 'Bienvenida',       color: 'text-brand-green bg-brand-green/10'    },
  product_approved:  { label: 'Prod. aprobado',   color: 'text-brand-green bg-brand-green/10'    },
  product_rejected:  { label: 'Prod. rechazado',  color: 'text-brand-red bg-brand-red/10'        },
  campaign_red:      { label: 'Campaña pausada',  color: 'text-brand-red bg-brand-red/10'        },
  campaign_green:    { label: 'Campaña activa',   color: 'text-brand-green bg-brand-green/10'    },
  season_alert:      { label: 'Alerta temporada', color: 'text-brand-primary bg-brand-primary/10' },
  weekly_report:     { label: 'Reporte semanal',  color: 'text-brand-purple bg-brand-purple/10'  },
  early_signal:      { label: 'EarlySignal',      color: 'text-brand-yellow bg-brand-yellow/10'  },
  manual:            { label: 'Manual',            color: 'text-brand-muted bg-brand-hover'       },
}

// Mock data para cuando la tabla está vacía
const MOCK_MESSAGES: WAMessage[] = [
  { id: '1', vendor_id: 'v1', vendor_name: 'Artes Mexicanas SA',  phone_to: '526675039081', message: '¡Hola Artes Mexicanas SA! 🚀 Bienvenido a TrendPilot!', type: 'welcome',          status: 'sent',   twilio_sid: 'SM123', error: null, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '2', vendor_id: 'v2', vendor_name: 'Moda Sustentable MX', phone_to: '526675039082', message: '✅ Bolsas ecológicas tela fue aprobado!',                type: 'product_approved', status: 'sent',   twilio_sid: 'SM124', error: null, created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: '3', vendor_id: 'v3', vendor_name: 'Tech Gadgets CDMX',   phone_to: '526675039083', message: '📊 Tu campaña de Audífonos fue pausada. ROI: 61%',      type: 'campaign_red',     status: 'sent',   twilio_sid: 'SM125', error: null, created_at: new Date(Date.now() - 3600000 * 8).toISOString() },
  { id: '4', vendor_id: null, vendor_name: null,                   phone_to: '526675039081', message: '⚡ Oportunidad temprana: Bolsas ecológicas tela',       type: 'early_signal',     status: 'sent',   twilio_sid: 'SM126', error: null, created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: '5', vendor_id: 'v4', vendor_name: 'Suplementos Vitales', phone_to: '526675039084', message: '⚠️ Suplementos proteína necesita ajustes.',              type: 'product_rejected', status: 'failed', twilio_sid: null,    error: 'Invalid phone number', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
]

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)   return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} hr`
  return `hace ${Math.floor(diff / 86400)} días`
}

export default function WhatsAppPage() {
  const [messages, setMessages]   = useState<WAMessage[]>([])
  const [loading, setLoading]     = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  // Manual message form
  const [sendForm, setSendForm]   = useState(false)
  const [phone, setPhone]         = useState('')
  const [text, setText]           = useState('')
  const [sending, setSending]     = useState(false)
  const [sendMsg, setSendMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/whatsapp?limit=100')
      if (res.ok) {
        const json = await res.json()
        const list = json.data ?? []
        setMessages(list.length > 0 ? list : MOCK_MESSAGES)
      } else {
        setMessages(MOCK_MESSAGES)
      }
    } catch {
      setMessages(MOCK_MESSAGES)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  async function handleSend() {
    if (!phone.trim() || !text.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/whatsapp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: phone.trim(), message: text.trim() }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setSendMsg({ type: 'ok', text: 'Mensaje enviado.' })
        setPhone('')
        setText('')
        setSendForm(false)
        fetchMessages()
      } else {
        setSendMsg({ type: 'err', text: json.error ?? 'Error al enviar.' })
      }
    } catch {
      setSendMsg({ type: 'err', text: 'Error de red.' })
    } finally {
      setSending(false)
      setTimeout(() => setSendMsg(null), 4000)
    }
  }

  const filtered = typeFilter === 'all' ? messages : messages.filter((m) => m.type === typeFilter)
  const sent     = messages.filter((m) => m.status === 'sent').length
  const failed   = messages.filter((m) => m.status === 'failed').length

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Encabezado */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
              <MessageSquare size={15} className="text-brand-primary" />
            </div>
            DirectPilot — WhatsApp
          </h1>
          <p className="text-sm text-brand-muted mt-1">Mensajes automáticos y manuales del sistema</p>
        </div>
        <button
          onClick={() => setSendForm((v) => !v)}
          className="btn-gradient flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold"
        >
          <Send size={14} /> Enviar mensaje
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '60ms' }}>
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
          <p className="text-[10px] text-brand-faint uppercase tracking-widest mb-2">Total enviados</p>
          <p className="text-2xl font-bold font-mono text-brand-text">{loading ? '—' : messages.length}</p>
        </div>
        <div className="bg-brand-card border border-brand-green/25 bg-brand-green/5 rounded-2xl p-4">
          <p className="text-[10px] text-brand-faint uppercase tracking-widest mb-2">Exitosos</p>
          <p className="text-2xl font-bold font-mono text-brand-green">{loading ? '—' : sent}</p>
        </div>
        <div className="bg-brand-card border border-brand-red/25 bg-brand-red/5 rounded-2xl p-4">
          <p className="text-[10px] text-brand-faint uppercase tracking-widest mb-2">Fallidos</p>
          <p className="text-2xl font-bold font-mono text-brand-red">{loading ? '—' : failed}</p>
        </div>
      </div>

      {/* Formulario manual */}
      {sendForm && (
        <div className="bg-brand-card border border-brand-primary/25 rounded-2xl p-5 animate-scale-in space-y-4">
          <p className="text-sm font-semibold text-brand-text">Enviar mensaje manual</p>
          {sendMsg && (
            <div className={cn('text-xs px-3 py-2 rounded-lg border', sendMsg.type === 'ok' ? 'bg-brand-green/10 border-brand-green/30 text-brand-green' : 'bg-brand-red/10 border-brand-red/30 text-brand-red')}>
              {sendMsg.text}
            </div>
          )}
          <input
            type="tel"
            placeholder="Número con código de país: 526675039081"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary transition-colors"
          />
          <textarea
            placeholder="Escribe el mensaje…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary resize-none transition-colors"
          />
          <div className="flex gap-3">
            <button onClick={() => setSendForm(false)} className="px-4 py-2 bg-brand-hover text-brand-text rounded-xl text-sm hover:bg-brand-border transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !phone.trim() || !text.trim()}
              className="flex items-center gap-2 px-4 py-2 btn-gradient text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {sending ? <><Clock size={13} className="animate-spin" /> Enviando…</> : <><Send size={13} /> Enviar</>}
            </button>
          </div>
        </div>
      )}

      {/* Filtro por tipo */}
      <div className="flex gap-2 flex-wrap animate-fade-in" style={{ animationDelay: '100ms' }}>
        <button
          onClick={() => setTypeFilter('all')}
          className={cn('flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
            typeFilter === 'all' ? 'btn-gradient text-white border-transparent' : 'bg-brand-card text-brand-muted border-brand-border hover:text-brand-text')}
        >
          <Filter size={11} /> Todos
        </button>
        {Object.entries(TYPE_LABELS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)}
            className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
              typeFilter === key ? 'btn-gradient text-white border-transparent' : 'bg-brand-card text-brand-muted border-brand-border hover:text-brand-text')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Historial */}
      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '140ms' }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-5 py-4 border-b border-brand-border">
              <div className="h-4 skeleton rounded w-20 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 skeleton rounded w-1/3" />
                <div className="h-3 skeleton rounded w-3/4" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-brand-faint">
            <MessageSquare size={28} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No hay mensajes con este filtro.</p>
          </div>
        ) : (
          filtered.map((msg, idx) => {
            const typeCfg = TYPE_LABELS[msg.type] ?? { label: msg.type, color: 'text-brand-muted bg-brand-hover' }
            return (
              <div
                key={msg.id}
                className={cn('flex items-start gap-4 px-5 py-3.5 hover:bg-brand-hover/40 transition-colors', idx < filtered.length - 1 && 'border-b border-brand-border')}
              >
                {/* Status */}
                <div className="shrink-0 mt-0.5">
                  {msg.status === 'sent'
                    ? <CheckCircle size={14} className="text-brand-green" />
                    : <XCircle    size={14} className="text-brand-red"   />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', typeCfg.color)}>
                      {typeCfg.label}
                    </span>
                    {msg.vendor_name && (
                      <span className="text-xs text-brand-muted">{msg.vendor_name}</span>
                    )}
                    <span className="text-[10px] text-brand-faint font-mono">{msg.phone_to}</span>
                  </div>
                  <p className="text-sm text-brand-text leading-relaxed line-clamp-2">{msg.message}</p>
                  {msg.error && (
                    <p className="text-[10px] text-brand-red mt-1">Error: {msg.error}</p>
                  )}
                </div>

                {/* Tiempo */}
                <span className="text-[10px] text-brand-faint whitespace-nowrap shrink-0 mt-1">
                  {timeAgo(msg.created_at)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
