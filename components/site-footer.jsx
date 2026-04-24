'use client'

import { useEffect, useState } from 'react'
import { MapPin, Phone, MessageCircle, Clock, Instagram, Bike } from 'lucide-react'
import Link from 'next/link'

export function SiteFooter() {
  const [f, setF] = useState(null)
  useEffect(() => {
    fetch('/api/footer', { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((d) => setF(d || {})).catch(() => setF({}))
  }, [])
  if (!f) return null
  const waHref = f.whatsapp ? `https://wa.me/55${String(f.whatsapp).replace(/\D/g, '')}` : null
  const anyField = f.address || f.phone || f.whatsapp || f.openingHours || f.instagramUrl || f.deliveryNotice
  if (!anyField && !f.copyrightText) return null

  return (
    <footer className="mt-10 border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {f.address && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-brand" /> Endereço</div>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{f.address}</p>
          </div>
        )}
        {(f.phone || f.whatsapp) && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold"><Phone className="h-4 w-4 text-brand" /> Contato</div>
            {f.phone && <p className="text-sm text-muted-foreground">{f.phone}</p>}
            {f.whatsapp && (
              <a href={waHref} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-emerald-400 hover:underline">
                <MessageCircle className="h-3 w-3" /> {f.whatsapp}
              </a>
            )}
          </div>
        )}
        {f.openingHours && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-brand" /> Horário</div>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{f.openingHours}</p>
          </div>
        )}
        <div className="space-y-1">
          {f.deliveryNotice && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold"><Bike className="h-4 w-4 text-brand" /> Área atendida</div>
              <p className="text-sm text-muted-foreground">{f.deliveryNotice}</p>
            </div>
          )}
          {f.instagramUrl && (
            <Link href={f.instagramUrl} target="_blank" className="mt-2 inline-flex items-center gap-1 text-sm text-pink-400 hover:underline">
              <Instagram className="h-4 w-4" /> Instagram
            </Link>
          )}
        </div>
      </div>
      {f.copyrightText && (
        <div className="border-t border-border py-3 text-center text-[11px] text-muted-foreground">{f.copyrightText}</div>
      )}
    </footer>
  )
}

export default SiteFooter
