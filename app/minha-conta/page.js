'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Utensils, Bike, Clock, Check, Receipt, ShoppingBag, Eye, LogIn } from 'lucide-react'
import { apiFetch, getUser } from '@/lib/auth'
import { BrandLogo, useBranding } from '@/lib/branding'
import { SiteFooter } from '@/components/site-footer'

const brl = (n) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (s) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function statusBadge(s) {
  const map = {
    aberta: { className: 'bg-emerald-500/20 text-emerald-300', label: '🟢 Aberta' },
    aguardando_pagamento: { className: 'bg-amber-500/20 text-amber-300', label: '⏳ Aguardando pagamento' },
    paga: { className: 'bg-blue-500/20 text-blue-300', label: '✅ Paga' },
    fechada: { className: 'bg-zinc-500/20 text-zinc-300', label: '🔒 Fechada' },
  }
  const c = map[s] || { className: 'bg-white/10 text-foreground', label: s }
  return <Badge className={c.className}>{c.label}</Badge>
}

function paymentBadge(order) {
  const st = order?.payment?.status
  const m = order?.payment?.method
  const label = { pix: 'PIX', card_delivery: 'Cartão (entrega)', cash_delivery: 'Dinheiro (entrega)' }[m] || m
  if (st === 'pago' || st === 'Pago') return <Badge className="bg-emerald-500/20 text-emerald-300">💰 Pago · {label}</Badge>
  if (st === 'aguardando_pagamento') return <Badge className="bg-amber-500/20 text-amber-300">⏳ PIX pendente</Badge>
  if (st === 'pendente_entrega') return <Badge variant="outline" className="border-blue-500/30 text-blue-300">📦 Pagar na entrega</Badge>
  if (st === 'expirado') return <Badge className="bg-red-500/20 text-red-300">⌛ Expirado</Badge>
  return <Badge variant="outline" className="border-white/10 text-muted-foreground">{st || '—'}</Badge>
}

function MinhaContaPage() {
  const router = useRouter()
  const branding = useBranding()
  const [user, setUser] = useState(null)
  const [comandas, setComandas] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = getUser()
    if (!u) {
      router.push('/login')
      return
    }
    setUser(u)
    Promise.all([
      apiFetch('/api/me/comandas').catch(() => []),
      apiFetch('/api/me/orders').catch(() => []),
    ]).then(([c, o]) => {
      setComandas(c || [])
      setOrders(o || [])
    }).finally(() => setLoading(false))
  }, [router])

  const activeComandas = comandas.filter((c) => ['aberta', 'aguardando_pagamento'].includes(c.status))
  const pastComandas = comandas.filter((c) => !['aberta', 'aguardando_pagamento'].includes(c.status))

  if (!user) return null

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="text-sm font-semibold">{branding.restaurantName}</span>
          </Link>
          <Link href="/"><Button size="sm" variant="outline" className="border-white/10"><ArrowLeft className="mr-1 h-4 w-4" /> Início</Button></Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Minha Conta</h1>
          <p className="text-sm text-muted-foreground">Olá, <strong className="text-foreground">{user.name || user.email}</strong> — aqui estão suas comandas e pedidos.</p>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-8">
            {/* Active comandas */}
            {activeComandas.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <Receipt className="h-5 w-5 text-brand" /> Comanda ativa
                </h2>
                <div className="space-y-3">
                  {activeComandas.map((c) => (
                    <Card key={c.id} className="border-emerald-500/30 bg-emerald-500/5">
                      <CardContent className="p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-500/20 text-amber-300"><Utensils className="mr-1 h-3 w-3" />Mesa {c.table}</Badge>
                            {statusBadge(c.status)}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total da comanda</div>
                            <div className="text-xl font-bold text-brand">{brl(c.total)}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {(c.orders || []).map((o) => (
                            <div key={o.id} className="rounded-lg border border-white/5 bg-black/20 p-3 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</span>
                                <Badge variant="outline" className="border-white/10 text-[10px]">{o.status}</Badge>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {(o.items || []).map((i) => `${i.quantity}× ${i.name}`).join(' · ')}
                              </div>
                              <div className="mt-1 text-xs">{brl(o.total)} · {fmtDate(o.createdAt)}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Link href={`/comanda/${c.id}`}>
                            <Button size="sm" variant="outline" className="border-white/10"><Eye className="mr-1 h-3 w-3" /> Ver detalhes</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* All orders */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <ShoppingBag className="h-5 w-5 text-brand" /> Meus pedidos ({orders.length})
              </h2>
              {orders.length === 0 ? (
                <Card className="border-dashed border-white/10 bg-card/30">
                  <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                    <div className="rounded-full bg-brand-soft p-4">
                      <ShoppingBag className="h-8 w-8 text-brand" />
                    </div>
                    <div>
                      <div className="font-semibold">Nenhum pedido ainda</div>
                      <p className="mt-1 text-sm text-muted-foreground">Quando você fizer um pedido, ele aparecerá aqui.</p>
                    </div>
                    <Link href="/"><Button size="sm" className="bg-brand-gradient">Fazer meu primeiro pedido</Button></Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => (
                    <Card key={o.id} className="border-border bg-card/60">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold">#{o.id.slice(0, 8).toUpperCase()}</span>
                            {o.type === 'local'
                              ? <Badge className="bg-amber-500/20 text-amber-300"><Utensils className="mr-1 h-3 w-3" />Mesa {o.table}</Badge>
                              : <Badge className="bg-orange-500/20 text-orange-300"><Bike className="mr-1 h-3 w-3" />Delivery</Badge>}
                            <Badge variant="outline" className="border-white/10">
                              {o.status === 'Finalizado' ? <><Check className="mr-1 h-3 w-3 text-emerald-400" /> Finalizado</> : <><Clock className="mr-1 h-3 w-3 text-amber-400" /> {o.status}</>}
                            </Badge>
                            {paymentBadge(o)}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-brand">{brl(o.total)}</div>
                            <div className="text-[11px] text-muted-foreground">{fmtDate(o.createdAt)}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {(o.items || []).map((i) => `${i.quantity}× ${i.name}`).join(' · ')}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Link href={`/pedido/${o.id}`}>
                            <Button size="sm" variant="outline" className="border-white/10"><Eye className="mr-1 h-3 w-3" /> Acompanhar</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Past comandas */}
            {pastComandas.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <Receipt className="h-5 w-5 text-muted-foreground" /> Histórico de comandas ({pastComandas.length})
                </h2>
                <div className="space-y-2">
                  {pastComandas.map((c) => (
                    <Card key={c.id} className="border-border bg-card/40">
                      <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">#{c.id.slice(0, 8).toUpperCase()}</span>
                          <Badge className="bg-amber-500/10 text-amber-300">Mesa {c.table}</Badge>
                          {statusBadge(c.status)}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-brand">{brl(c.total)}</div>
                          <div className="text-[10px] text-muted-foreground">{fmtDate(c.closedAt || c.openedAt)}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  )
}

export default MinhaContaPage
