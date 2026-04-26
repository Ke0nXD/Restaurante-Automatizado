'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Info } from 'lucide-react'
import { BrandLogo, useBranding } from '@/lib/branding'
import { SiteFooter } from '@/components/site-footer'
import { RichText } from '@/components/rich-text'

function SobrePage() {
  const branding = useBranding()
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch('/api/about', { cache: 'no-store' }).then((r) => r.json()).then(setData).catch(() => setData({}))
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Início
          </Link>
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="hidden text-sm font-semibold sm:inline">{branding.restaurantName}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft">
            <Info className="h-6 w-6 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{data?.title || 'Sobre o estabelecimento'}</h1>
            {data?.subtitle && <p className="mt-1 text-muted-foreground">{data.subtitle}</p>}
          </div>
        </div>

        <Card className="border-border bg-card/60">
          <CardContent className="p-6 sm:p-8">
            {data ? (
              data.content ? <RichText source={data.content} /> : <p className="text-muted-foreground">Conteúdo ainda não cadastrado pelo administrador.</p>
            ) : (
              <p className="text-muted-foreground">Carregando...</p>
            )}
          </CardContent>
        </Card>
      </div>
      <SiteFooter />
    </main>
  )
}

export default SobrePage
