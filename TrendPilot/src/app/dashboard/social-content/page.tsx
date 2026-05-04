'use client'

import { useState } from 'react'
import { Share2, Copy, Check, Sparkles, Users2, Camera, Video, MessageCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils'

type Platform = 'facebook' | 'instagram' | 'tiktok' | 'whatsapp'
type PostStyle = 'educational' | 'promotional' | 'testimonial' | 'viral'

const PLATFORMS: Array<{ id: Platform; label: string; icon: LucideIcon; color: string; maxChars: number }> = [
  { id: 'facebook',  label: 'Facebook Grupo',    icon: Users2,        color: 'text-blue-400',    maxChars: 500 },
  { id: 'instagram', label: 'Instagram Story',   icon: Camera,        color: 'text-pink-400',    maxChars: 150 },
  { id: 'tiktok',    label: 'TikTok Caption',    icon: Video,         color: 'text-[#00FF88]',   maxChars: 150 },
  { id: 'whatsapp',  label: 'WhatsApp Estado',   icon: MessageCircle, color: 'text-[#00FF88]',   maxChars: 139 },
]

const STYLES: Array<{ id: PostStyle; label: string; desc: string }> = [
  { id: 'educational',  label: 'Educativo',   desc: 'Enseña algo valioso sobre el producto' },
  { id: 'promotional',  label: 'Promocional', desc: 'Destaca oferta o beneficio directo' },
  { id: 'testimonial',  label: 'Testimonio',  desc: 'Historia de éxito de un cliente' },
  { id: 'viral',        label: 'Viral',       desc: 'Hook fuerte para máximo alcance' },
]

const TOPICS = [
  'Audífonos bluetooth',
  'Ropa deportiva mujer',
  'Suplementos proteína',
  'Skincare / Cuidado de piel',
  'Teclados mecánicos gaming',
  'Fundas de celular',
  'Cargadores inalámbricos',
  'Artesanías / Joyería',
]

interface GeneratedPost {
  platform: Platform
  style:    PostStyle
  topic:    string
  content:  string
  hashtags: string[]
}

export default function SocialContentPage() {
  const [platform, setPlatform]   = useState<Platform>('facebook')
  const [style, setStyle]         = useState<PostStyle>('educational')
  const [topic, setTopic]         = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [loading, setLoading]     = useState(false)
  const [posts, setPosts]         = useState<GeneratedPost[]>([])
  const [copied, setCopied]       = useState<number | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const effectiveTopic = customTopic.trim() || topic

  async function generatePost() {
    if (!effectiveTopic) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/social-content', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ platform, style, topic: effectiveTopic }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Error ${res.status}`)
      }

      const data = await res.json()
      const newPost: GeneratedPost = {
        platform,
        style,
        topic: effectiveTopic,
        content:  data.content,
        hashtags: data.hashtags ?? [],
      }

      setPosts((prev) => [newPost, ...prev.slice(0, 9)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando contenido')
    } finally {
      setLoading(false)
    }
  }

  async function copyPost(idx: number, post: GeneratedPost) {
    const text = post.hashtags.length > 0
      ? `${post.content}\n\n${post.hashtags.join(' ')}`
      : post.content
    await navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  const selectedPlatform = PLATFORMS.find((p) => p.id === platform)!

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center">
          <Share2 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">SocialProspect</h1>
          <p className="text-sm text-brand-muted mt-0.5">Genera posts con IA para tus vendedores</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Panel de configuración */}
        <div className="lg:col-span-2 space-y-5">

          {/* Plataforma */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-brand-text">Plataforma</h2>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => {
                const Icon = p.icon
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                      platform === p.id
                        ? 'border-brand-primary bg-brand-primary/10 text-white'
                        : 'border-brand-border text-brand-muted hover:border-brand-primary/50 hover:text-white',
                    )}
                  >
                    <Icon size={18} className={platform === p.id ? p.color : undefined} />
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Estilo */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-brand-text">Estilo del post</h2>
            <div className="space-y-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border text-xs transition-all',
                    style === s.id
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-brand-border hover:border-brand-primary/50',
                  )}
                >
                  <span className={cn('font-semibold', style === s.id ? 'text-white' : 'text-brand-text')}>
                    {s.label}
                  </span>
                  <span className="block text-brand-muted mt-0.5">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tema / producto */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-brand-text">Tema / Producto</h2>

            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTopic(t); setCustomTopic('') }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs border transition-all',
                    topic === t && !customTopic
                      ? 'bg-brand-primary border-brand-primary text-white'
                      : 'border-brand-border text-brand-muted hover:border-brand-primary/50 hover:text-white',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={customTopic}
              onChange={(e) => { setCustomTopic(e.target.value); setTopic('') }}
              placeholder="O escribe tu producto..."
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text placeholder-brand-faint focus:border-brand-primary focus:outline-none"
            />

            <button
              onClick={generatePost}
              disabled={loading || !effectiveTopic}
              className="w-full btn-gradient text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <Sparkles size={16} className={cn(loading && 'animate-pulse')} />
              {loading ? 'Generando...' : 'Generar con IA'}
            </button>

            {error && (
              <p className="text-xs text-[#FF3B30] bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Posts generados */}
        <div className="lg:col-span-3 space-y-4">
          {posts.length === 0 && !loading && (
            <div className="bg-brand-card border border-brand-border rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center">
                <Share2 size={20} className="text-brand-primary" />
              </div>
              <p className="text-brand-text font-medium">Genera tu primer post</p>
              <p className="text-sm text-brand-muted max-w-xs">
                Selecciona plataforma, estilo y producto. La IA creará contenido optimizado para cada canal.
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-brand-card border border-brand-border rounded-2xl p-8 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full btn-gradient flex items-center justify-center animate-pulse">
                <Sparkles size={18} className="text-white" />
              </div>
              <p className="text-sm text-brand-muted">Generando contenido con Claude...</p>
            </div>
          )}

          {posts.map((post, idx) => {
            const plt   = PLATFORMS.find((p) => p.id === post.platform)!
            const Icon  = plt.icon
            const chars = post.content.length
            const over  = chars > plt.maxChars

            return (
              <div key={idx} className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-3">
                {/* Header del post */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={plt.color} />
                    <span className="text-xs font-semibold text-brand-text">{plt.label}</span>
                    <span className="text-xs text-brand-faint">·</span>
                    <span className="text-xs text-brand-muted capitalize">{STYLES.find(s => s.id === post.style)?.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-mono', over ? 'text-[#FF3B30]' : 'text-brand-faint')}>
                      {chars}/{plt.maxChars}
                    </span>
                    <button
                      onClick={() => copyPost(idx, post)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-xs text-brand-muted hover:text-white hover:border-brand-primary transition-colors"
                    >
                      {copied === idx
                        ? <><Check size={12} className="text-[#00FF88]" /> Copiado</>
                        : <><Copy size={12} /> Copiar</>
                      }
                    </button>
                  </div>
                </div>

                {/* Chip de tema */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary border border-brand-primary/30">
                    {post.topic}
                  </span>
                </div>

                {/* Contenido */}
                <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
                  <p className="text-sm text-brand-text whitespace-pre-wrap leading-relaxed">{post.content}</p>
                </div>

                {/* Hashtags */}
                {post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.hashtags.map((tag, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-brand-hover border border-brand-border text-brand-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {over && (
                  <p className="text-xs text-[#FFB800]">
                    ⚠ Supera el límite de {plt.maxChars} caracteres para {plt.label}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
