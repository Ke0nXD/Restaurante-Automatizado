'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export const DEFAULT_THEME = {
  mode: 'dark',
  brand: { from: '#f59e0b', to: '#ea580c' },
  dark: {
    background: '#09090b',
    foreground: '#fafafa',
    card: '#18181b',
    border: '#27272a',
    primary: '#f59e0b',
    primaryForeground: '#0a0a0a',
    secondary: '#27272a',
    secondaryForeground: '#fafafa',
    accent: '#f59e0b',
    muted: '#27272a',
    mutedForeground: '#a1a1aa',
    destructive: '#ef4444',
  },
  light: {
    background: '#ffffff',
    foreground: '#0a0a0a',
    card: '#ffffff',
    border: '#e5e7eb',
    primary: '#f59e0b',
    primaryForeground: '#ffffff',
    secondary: '#f4f4f5',
    secondaryForeground: '#0a0a0a',
    accent: '#f59e0b',
    muted: '#f4f4f5',
    mutedForeground: '#71717a',
    destructive: '#dc2626',
  },
}

// Convert "#rrggbb" → "h s% l%" string (for Tailwind HSL vars)
export function hexToHslString(hex) {
  if (!hex || typeof hex !== 'string') return '0 0% 0%'
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let hh = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break
      case g: hh = (b - r) / d + 2; break
      case b: hh = (r - g) / d + 4; break
    }
    hh /= 6
  }
  return `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

// Compute relative luminance for WCAG
function luminance(hex) {
  const h = (hex || '#000').replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const toLin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b)
}
export function contrastRatio(fg, bg) {
  const a = luminance(fg), b = luminance(bg)
  const lighter = Math.max(a, b), darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}
export function wcagLabel(ratio) {
  if (ratio >= 7) return { label: 'AAA', color: 'text-emerald-400' }
  if (ratio >= 4.5) return { label: 'AA', color: 'text-emerald-400' }
  if (ratio >= 3) return { label: 'AA Large', color: 'text-amber-400' }
  return { label: 'Falhou', color: 'text-red-400' }
}

function resolveMode(mode) {
  if (mode === 'auto') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
  }
  return mode === 'light' ? 'light' : 'dark'
}

export function buildCssVariables(theme) {
  const resolved = resolveMode(theme?.mode || 'dark')
  const palette = theme?.[resolved] || DEFAULT_THEME[resolved]
  const brand = theme?.brand || DEFAULT_THEME.brand
  const vars = {
    '--background': hexToHslString(palette.background),
    '--foreground': hexToHslString(palette.foreground),
    '--card': hexToHslString(palette.card),
    '--card-foreground': hexToHslString(palette.foreground),
    '--popover': hexToHslString(palette.card),
    '--popover-foreground': hexToHslString(palette.foreground),
    '--primary': hexToHslString(palette.primary),
    '--primary-foreground': hexToHslString(palette.primaryForeground),
    '--secondary': hexToHslString(palette.secondary),
    '--secondary-foreground': hexToHslString(palette.secondaryForeground),
    '--muted': hexToHslString(palette.muted),
    '--muted-foreground': hexToHslString(palette.mutedForeground),
    '--accent': hexToHslString(palette.accent),
    '--accent-foreground': hexToHslString(palette.primaryForeground),
    '--destructive': hexToHslString(palette.destructive),
    '--destructive-foreground': hexToHslString(palette.primaryForeground),
    '--border': hexToHslString(palette.border),
    '--input': hexToHslString(palette.border),
    '--ring': hexToHslString(palette.primary),
    // Custom brand tokens
    '--brand-from': brand.from,
    '--brand-to': brand.to,
    '--brand-primary': palette.primary,
  }
  return { vars, resolved }
}

const ThemeCtx = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  resolvedMode: 'dark',
  refresh: async () => {},
})

const THEME_CACHE_KEY = 'sabor_theme_v1'

function readCachedTheme() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(THEME_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_THEME, ...parsed, dark: { ...DEFAULT_THEME.dark, ...(parsed?.dark || {}) }, light: { ...DEFAULT_THEME.light, ...(parsed?.light || {}) }, brand: { ...DEFAULT_THEME.brand, ...(parsed?.brand || {}) } }
  } catch { return null }
}

export function ThemeProvider({ children }) {
  // Initialize state SYNCHRONOUSLY from cache (eliminates FOUC on subsequent loads)
  const [theme, setThemeState] = useState(() => readCachedTheme() || DEFAULT_THEME)
  const [resolvedMode, setResolvedMode] = useState(() => {
    const t = readCachedTheme() || DEFAULT_THEME
    return resolveMode(t?.mode || 'dark')
  })

  const applyTheme = useCallback((t) => {
    const { vars, resolved } = buildCssVariables(t)
    const root = typeof document !== 'undefined' ? document.documentElement : null
    if (root) {
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
      root.setAttribute('data-theme-mode', t?.mode || 'dark')
    }
    setResolvedMode(resolved)
    // Persist cache
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(t))
    } catch {}
  }, [])

  // Apply cached theme on mount (before fetch resolves)
  useEffect(() => {
    applyTheme(theme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/theme', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const merged = { ...DEFAULT_THEME, ...data, dark: { ...DEFAULT_THEME.dark, ...(data?.dark || {}) }, light: { ...DEFAULT_THEME.light, ...(data?.light || {}) }, brand: { ...DEFAULT_THEME.brand, ...(data?.brand || {}) } }
        setThemeState(merged)
        applyTheme(merged)
      }
    } catch {}
  }, [applyTheme])

  useEffect(() => { refresh() }, [refresh])

  // Listen to system color scheme changes when mode = auto
  useEffect(() => {
    if (theme?.mode !== 'auto' || typeof window === 'undefined') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => applyTheme(theme)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [theme, applyTheme])

  const setTheme = useCallback((t) => {
    setThemeState(t)
    applyTheme(t)
  }, [applyTheme])

  const value = useMemo(() => ({ theme, setTheme, resolvedMode, refresh }), [theme, setTheme, resolvedMode, refresh])
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  return useContext(ThemeCtx)
}
