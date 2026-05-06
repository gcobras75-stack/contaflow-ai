'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role:    'user' | 'assistant'
  content: string
}

export default function ImportChatbot() {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '👋 ¡Hola! Soy el asesor de importación TrendPilot. ¿En qué te puedo ayudar hoy? Puedes preguntarme sobre proveedores, impuestos, permisos o cómo importar desde China.' }
  ])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)

    try {
      const res = await fetch('/api/import/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
        }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply ?? 'Error al responder.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Error de conexión. Intenta de nuevo.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0066FF, #7C3AED)',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,102,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, transition: 'transform 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        title="Asesor TrendPilot — Gratis"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 96, right: 24, zIndex: 999,
          width: 360, maxHeight: 520,
          background: '#0D1B2E', border: '1px solid rgba(0,102,255,0.3)',
          borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Inter, sans-serif',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(135deg, rgba(0,102,255,0.15), rgba(124,58,237,0.15))',
            borderRadius: '20px 20px 0 0',
          }}>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>💬 Asesor TrendPilot</div>
            <div style={{ color: '#7ab4ff', fontSize: 12, marginTop: 2 }}>Experto en importación China-México · Gratis</div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200, maxHeight: 340 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? '#0066FF' : 'rgba(255,255,255,0.07)',
                  color: '#fff', fontSize: 13, lineHeight: 1.5,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,0.07)', color: '#7ab4ff', fontSize: 13 }}>
                  ✦ Escribiendo...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          <div style={{ padding: '8px 16px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['¿Cuánto pago de arancel?', '¿Cómo verificar proveedor?', '¿Qué es Trade Assurance?'].map(q => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                style={{
                  padding: '4px 10px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                  background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.3)',
                  color: '#7ab4ff',
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px 16px', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Escribe tu pregunta..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={loading}
              style={{
                padding: '10px 14px', borderRadius: 12, background: loading ? '#333' : '#0066FF',
                color: '#fff', fontWeight: 700, border: 'none', cursor: loading ? 'default' : 'pointer',
                fontSize: 16,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  )
}
