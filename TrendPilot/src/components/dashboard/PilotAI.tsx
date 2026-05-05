'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { X, Send, Bot, Sparkles, ChevronDown } from 'lucide-react'
import { cn } from '@/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Message {
  id:        string
  role:      'user' | 'assistant'
  content:   string
  timestamp: number
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: Message = {
  id:        'welcome',
  role:      'assistant',
  content:   '¡Hola! Soy Pilot AI 🧭\nTu asistente experto en TrendPilot.\n\nPuedo ayudarte con:\n📊 Cómo usar cada módulo\n🚀 Estrategias de marketing digital\n💰 Optimizar tus campañas\n👥 Conseguir y retener vendedores\n📈 Aumentar tus comisiones\n\n¿En qué te puedo ayudar hoy?',
  timestamp: Date.now(),
}

const QUICK_QUESTIONS = [
  '¿Cómo consigo mi primer vendedor?',
  '¿Por qué mi campaña está en rojo?',
  '¿Cómo funciona el GrowthFund?',
  '¿Cuándo debo aprobar un producto?',
  '¿Qué hace el worker automáticamente?',
  '¿Cómo mejoro el ROI de mis campañas?',
  '¿Cuándo son las mejores temporadas?',
  '¿Cómo uso el panel desde mi tablet?',
]

const FOLLOW_UP_CHIPS = [
  'Cuéntame más',
  '¿Cómo lo aplico?',
  'Tengo otra pregunta',
]

const STORAGE_KEY = 'pilotai_history'

// ─── Utilidades ──────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function formatContent(text: string) {
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {line}
      {i < text.split('\n').length - 1 && <br />}
    </span>
  ))
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function PilotAI() {
  const pathname = usePathname()

  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showQuick, setShowQuick] = useState(true)
  const [hasHistory, setHasHistory] = useState(false)
  const [restored,   setRestored]   = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  // Detectar historial guardado
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Message[]
        if (parsed.length > 1) setHasHistory(true)
      }
    } catch { /* ignorar */ }
  }, [])

  // Scroll al último mensaje
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [messages, open])

  // Foco en input al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  // Guardar historial en sessionStorage
  useEffect(() => {
    if (messages.length > 1) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)) } catch { /* ignorar */ }
    }
  }, [messages])

  function restoreHistory() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Message[]
        setMessages(parsed)
        setRestored(true)
        setShowQuick(false)
        setHasHistory(false)
      }
    } catch { /* ignorar */ }
  }

  function clearHistory() {
    sessionStorage.removeItem(STORAGE_KEY)
    setMessages([WELCOME_MESSAGE])
    setHasHistory(false)
    setRestored(false)
    setShowQuick(true)
  }

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setInput('')
    setShowQuick(false)

    const userMsg: Message = { id: uid(), role: 'user', content: trimmed, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      // Construir historial para la API (excluir mensaje de bienvenida fijo)
      const history = [...messages.filter((m) => m.id !== 'welcome'), userMsg]
        .slice(-12) // últimos 12 mensajes para no exceder contexto
        .map(({ role, content }) => ({ role, content }))

      const res = await fetch('/api/chat-agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history, pageContext: pathname }),
      })

      if (!res.ok) throw new Error(`Error ${res.status}`)
      const { reply } = await res.json()

      const aiMsg: Message = { id: uid(), role: 'assistant', content: reply, timestamp: Date.now() }
      setMessages((prev) => [...prev, aiMsg])
    } catch {
      const errMsg: Message = {
        id:        uid(),
        role:      'assistant',
        content:   'Ups, tuve un error al conectarme. ¿Puedes intentarlo de nuevo? 🔄',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }, [loading, messages, pathname])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Contexto de página para sugerencia automática
  const pageHint = (() => {
    if (pathname?.includes('/campaigns') && !pathname.includes('/campaigns/'))
      return '¿Tienes alguna campaña en rojo que necesites revisar? 🔴'
    if (pathname?.includes('/campaigns/'))
      return '¿Necesitas ayuda para optimizar esta campaña? 📊'
    if (pathname?.includes('/products'))
      return '¿Necesitas ayuda para aprobar algún producto o entender el ProductScore? ⭐'
    if (pathname?.includes('/vendors'))
      return '¿Buscas consejos para atraer más vendors o mejorar su TrustScore? 👥'
    if (pathname?.includes('/lead-finder'))
      return '¿Quieres consejos para convertir más prospectos en vendedores? 🎯'
    if (pathname?.includes('/trends'))
      return '¿Quieres saber cuál tendencia aprovechar primero? 🚀'
    return null
  })()

  return (
    <>
      {/* Panel de Chat */}
      <div
        ref={panelRef}
        className={cn(
          'fixed bottom-24 right-4 z-50 flex flex-col',
          'bg-[#0D1F3C] border border-brand-border rounded-2xl shadow-2xl shadow-black/40',
          'transition-all duration-300 origin-bottom-right',
          // Desktop: 380px ancho, 600px max alto
          'w-[calc(100vw-2rem)] sm:w-[380px]',
          'max-h-[600px]',
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-90 pointer-events-none',
        )}
        style={{ maxHeight: open ? '600px' : '0' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-brand-border shrink-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand-green rounded-full border-2 border-[#0D1F3C] animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Pilot AI</p>
            <p className="text-[10px] text-brand-muted">Experto en TrendPilot · En línea 24/7</p>
          </div>
          {messages.length > 1 && (
            <button
              onClick={clearHistory}
              className="text-[10px] text-brand-faint hover:text-brand-muted transition-colors px-2 py-1 rounded-lg hover:bg-brand-hover"
              title="Nueva conversación"
            >
              Nueva
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-brand-faint hover:text-white hover:bg-brand-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Prompt de restaurar historial */}
        {hasHistory && !restored && (
          <div className="mx-3 mt-3 p-3 bg-brand-primary/10 border border-brand-primary/25 rounded-xl shrink-0">
            <p className="text-xs text-brand-text mb-2">💬 Tienes una conversación anterior</p>
            <div className="flex gap-2">
              <button
                onClick={restoreHistory}
                className="flex-1 py-1.5 text-[11px] font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Continuar
              </button>
              <button
                onClick={() => { setHasHistory(false); sessionStorage.removeItem(STORAGE_KEY) }}
                className="flex-1 py-1.5 text-[11px] text-brand-muted bg-brand-hover rounded-lg hover:bg-brand-border transition-colors"
              >
                Empezar nuevo
              </button>
            </div>
          </div>
        )}

        {/* Sugerencia de contexto de página */}
        {pageHint && open && messages.length <= 1 && (
          <button
            onClick={() => sendMessage(pageHint)}
            className="mx-3 mt-3 px-3 py-2 text-left text-xs text-brand-primary bg-brand-primary/8 border border-brand-primary/20 rounded-xl hover:bg-brand-primary/15 transition-colors shrink-0"
          >
            💡 {pageHint}
          </button>
        )}

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg btn-gradient flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[78%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed',
                  msg.role === 'assistant'
                    ? 'bg-[#111827] text-brand-text rounded-tl-sm'
                    : 'bg-brand-primary text-white rounded-tr-sm',
                )}
              >
                {formatContent(msg.content)}
              </div>
            </div>
          ))}

          {/* Indicador de carga */}
          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-lg btn-gradient flex items-center justify-center shrink-0">
                <Bot size={14} className="text-white animate-pulse" />
              </div>
              <div className="bg-[#111827] px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Follow-up chips tras última respuesta */}
          {!loading && messages.length > 1 && messages[messages.length - 1].role === 'assistant' && (
            <div className="flex flex-wrap gap-1.5 pl-9">
              {FOLLOW_UP_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  className="px-2.5 py-1 text-[11px] bg-brand-hover border border-brand-border text-brand-muted rounded-full hover:border-brand-primary/40 hover:text-brand-text transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Preguntas rápidas — solo al inicio */}
        {showQuick && messages.length <= 1 && (
          <div className="px-3 pb-2 shrink-0">
            <p className="text-[10px] text-brand-faint mb-1.5 flex items-center gap-1">
              <ChevronDown size={10} /> Preguntas frecuentes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="px-2.5 py-1 text-[11px] bg-brand-hover border border-brand-border text-brand-muted rounded-full hover:border-brand-primary/40 hover:text-brand-text transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-3 pb-3 pt-2 border-t border-brand-border shrink-0">
          <div className="flex items-end gap-2 bg-brand-hover border border-brand-border rounded-xl px-3 py-2 focus-within:border-brand-primary transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregúntame lo que quieras..."
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-brand-text placeholder-brand-faint resize-none focus:outline-none max-h-24 leading-relaxed disabled:opacity-50"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = `${Math.min(t.scrollHeight, 96)}px`
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="p-1.5 rounded-lg btn-gradient text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0 mb-0.5"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-[9px] text-brand-faint mt-1.5 text-center">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>

      {/* Botón flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-5 right-5 z-50',
          'w-14 h-14 rounded-full btn-gradient shadow-lg shadow-brand-primary/30',
          'flex items-center justify-center',
          'transition-all duration-200 hover:scale-110 active:scale-95',
        )}
        aria-label="Abrir Pilot AI"
      >
        {open ? (
          <X size={22} className="text-white" />
        ) : (
          <div className="relative">
            <Bot size={22} className="text-white" />
            <Sparkles size={10} className="text-brand-green absolute -top-1.5 -right-1.5" />
          </div>
        )}

        {/* Badge verde — solo cuando cerrado */}
        {!open && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-brand-green rounded-full border-2 border-[#0A1628] animate-pulse" />
        )}
      </button>
    </>
  )
}
