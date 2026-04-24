'use client'

import { useState, useEffect } from 'react'
import { ChefHat } from 'lucide-react'

const DEFAULTS = { restaurantName: 'Sabor & Arte', slogan: 'gastronomia autoral', logoUrl: '' }

let cache = null
let listeners = []

export async function refreshBranding() {
  try {
    const res = await fetch('/api/settings')
    const data = await res.json()
    cache = data
    listeners.forEach((l) => l(data))
    return data
  } catch {
    return DEFAULTS
  }
}

export function useBranding() {
  const [branding, setBranding] = useState(cache || DEFAULTS)
  useEffect(() => {
    if (!cache) {
      refreshBranding().then(setBranding)
    } else {
      setBranding(cache)
    }
    const listener = (v) => setBranding(v)
    listeners.push(listener)
    return () => { listeners = listeners.filter((l) => l !== listener) }
  }, [])
  return branding
}

// Brand logo component — renders either custom logo image or default ChefHat icon
export function BrandLogo({ size = 'md', className = '' }) {
  const b = useBranding()
  const sizes = { sm: 'h-9 w-9', md: 'h-12 w-12', lg: 'h-14 w-14' }
  const iconSizes = { sm: 'h-5 w-5', md: 'h-6 w-6', lg: 'h-7 w-7' }
  const cls = sizes[size] || sizes.md
  if (b.logoUrl) {
    return (
      <div className={`${cls} overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 ${className}`}>
        <img src={b.logoUrl} alt={b.restaurantName} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 ${cls} ${className}`}>
      <ChefHat className={`${iconSizes[size] || iconSizes.md} text-white`} />
    </div>
  )
}

// Compact brand header with name + slogan
export function BrandHeader({ size = 'md' }) {
  const b = useBranding()
  const nameSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-3xl' : 'text-xl'
  return (
    <div className="flex items-center gap-2">
      <BrandLogo size={size} />
      <div className="leading-tight">
        <div className={`font-bold ${nameSize}`}>{b.restaurantName}</div>
        {b.slogan && <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80 sm:text-xs">{b.slogan}</div>}
      </div>
    </div>
  )
}
