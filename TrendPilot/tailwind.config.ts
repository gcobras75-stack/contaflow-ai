import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:      '#0A0F1E',
          card:    '#111827',
          hover:   '#1F2937',
          surface: '#111827',
          border:  '#1E293B',
          text:    '#F8FAFC',
          muted:   '#94A3B8',
          faint:   '#475569',
          primary: '#0066FF',
          green:   '#00FF88',
          red:     '#FF3B30',
          yellow:  '#FFB800',
          purple:  '#7C3AED',
        },
      },
      backgroundImage: {
        'gradient-brand':  'linear-gradient(135deg, #0066FF 0%, #7C3AED 100%)',
        'gradient-green':  'linear-gradient(135deg, #00FF88 0%, #00D4AA 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      animation: {
        shimmer:     'shimmer 1.5s infinite',
        'fade-in':   'fadeIn 0.4s ease both',
        'slide-up':  'slideUp 0.3s ease both',
        'ping-slow': 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        card:        '0 4px 24px rgba(0,0,0,0.3)',
        'card-hover':'0 8px 32px rgba(0,102,255,0.12)',
        'glow-blue': '0 0 24px rgba(0,102,255,0.3)',
        'glow-green':'0 0 24px rgba(0,255,136,0.2)',
      },
    },
  },
  plugins: [],
}

export default config
