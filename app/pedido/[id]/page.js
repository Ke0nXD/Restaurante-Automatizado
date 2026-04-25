'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChefHat, ArrowLeft, Clock, Check, Utensils, Bike, MapPin, CreditCard, QrCode, Copy, CheckCircle2, Loader2, AlertTriangle, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, getUser } from '@/lib/auth'

const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const LOCAL_STATUSES = ['Recebido', 'Em preparo', 'Pronto', 'Entregue', 'Finalizado']
const DELIVERY_STATUSES = ['Aguardando confirmação', 'Confirmado', 'Em preparo', 'Saiu para entrega', 'Entregue', 'Finalizado']

function OrderTrackingPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setOrder(data)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
    const iv = setInterval(load, 8000)
    return () => clearInterval(iv)
  }, [id])

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-black"><div className="text-muted-foreground">Carregando pedido...</div></main>
  if (error || !order) return (
    <main className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="border-white/10 bg-zinc-900/60">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Pedido não encontrado</p>
          <Link href="/"><Button className="mt-4">Voltar</Button></Link>
        </CardContent>
      </Card>
    </main>
  )

  const statuses = order.type === 'local' ? LOCAL_STATUSES : DELIVERY_STATUSES
  const currentIdx = statuses.indexOf(order.status)

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 to-black px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Início
        </Link>

        {order.type === 'delivery' && order.payment?.method === 'pix' && order.payment?.status === 'aguardando_pagamento' && order.pix && (
          <PixCard order={order} />
        )}

        {/* Delivery confirmation card */}
        {order.type === 'delivery' && order.delivery?.status === 'Aguardando confirmação cliente' && (
          <DeliveryConfirmCard order={order} onConfirmed={(o) => setOrder(o)} />
        )}
        {order.type === 'delivery' && (order.delivery?.status === 'Não Entregue' || order.status === 'Não Entregue') && (
          <Card className="mb-4 border-red-500/40 bg-red-500/10">
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="font-semibold text-red-300">Pedido não entregue</div>
              </div>
              <p className="text-sm text-red-200/90">
                <strong>Motivo:</strong> {order.delivery?.notDeliveredReason || order.delivery?.observation || 'Não informado'}
              </p>
              <p className="mt-2 text-xs text-red-200/70">Em caso de dúvida, entre em contato com o restaurante.</p>
            </CardContent>
          </Card>
        )}
        {order.type === 'delivery' && order.delivery?.status === 'Entregue' && order.delivery?.deliveryConfirmationStatus === 'confirmado_cliente' && (
          <Card className="mb-4 border-emerald-500/40 bg-emerald-500/10">
            <CardContent className="flex items-center gap-3 p-5">
              <PackageCheck className="h-6 w-6 text-emerald-400" />
              <div>
                <div className="font-semibold text-emerald-300">Entrega confirmada por você</div>
                <div className="text-xs text-emerald-200/80">{new Date(order.delivery.confirmedByCustomerAt).toLocaleString('pt-BR')}</div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-4 border-white/10 bg-zinc-900/60">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Pedido</div>
                <div className="font-mono text-lg font-bold">#{order.id.slice(0, 8).toUpperCase()}</div>
              </div>
              <Badge className="bg-amber-500/20 text-amber-300">
                {order.type === 'local' ? <><Utensils className="mr-1 h-3 w-3" /> Mesa {order.table}</> : <><Bike className="mr-1 h-3 w-3" /> Delivery</>}
              </Badge>
            </div>

            <h2 className="text-2xl font-bold">Status: <span className="text-amber-400">{order.status}</span></h2>
            <p className="mt-1 text-sm text-muted-foreground">Atualiza automaticamente a cada 8 segundos</p>

            {/* Timeline */}
            <div className="mt-6 space-y-3">
              {statuses.map((s, i) => {
                const done = i < currentIdx
                const current = i === currentIdx
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${done ? 'bg-emerald-500 text-white' : current ? 'bg-amber-500 text-black' : 'bg-white/5 text-muted-foreground'}`}>
                      {done ? <Check className="h-4 w-4" /> : current ? <Clock className="h-4 w-4" /> : <span className="text-xs">{i + 1}</span>}
                    </div>
                    <div className={`flex-1 text-sm ${current ? 'font-semibold text-foreground' : done ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>{s}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 border-white/10 bg-zinc-900/60">
          <CardContent className="p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Itens</h3>
            <div className="space-y-2">
              {order.items.map((i, k) => (
                <div key={k} className="text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="font-medium">{i.quantity}× {i.name}</div>
                    <div className="whitespace-nowrap">{brl(i.subtotal)}</div>
                  </div>
                  {Array.isArray(i.addOns) && i.addOns.length > 0 && (
                    <div className="ml-4 mt-0.5 text-[11px] text-emerald-300/90">
                      {i.addOns.map((a, ak) => <div key={ak}>+ {a.name} ({brl(a.price)})</div>)}
                    </div>
                  )}
                  {i.observations && <div className="ml-4 mt-0.5 text-[11px] italic text-amber-300/80">💬 {i.observations}</div>}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between border-t border-white/5 pt-3">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-amber-400">{brl(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {order.type === 'delivery' && order.address && (
          <Card className="mb-4 border-white/10 bg-zinc-900/60">
            <CardContent className="p-6">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <MapPin className="h-4 w-4" /> Entrega
              </div>
              <p className="text-sm">{order.address.street}, {order.address.number} — {order.address.district}</p>
              <p className="text-sm text-muted-foreground">{order.address.city} {order.address.complement && `· ${order.address.complement}`}</p>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{methodLabel(order.payment?.method)}</span>
                <Badge variant="outline" className="ml-auto text-xs">{paymentStatusLabel(order.payment?.status)}</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function methodLabel(m) {
  if (!m) return '—'
  const map = { pix: 'PIX', card_delivery: 'Cartão na entrega', cash_delivery: 'Dinheiro na entrega' }
  return map[m] || m
}
function paymentStatusLabel(s) {
  const map = {
    pago: '✅ Pago',
    aguardando_pagamento: '⏳ Aguardando PIX',
    pendente_entrega: '📦 Pagar na entrega',
    expirado: '⌛ Expirado',
    pendente: 'Pendente',
  }
  return map[s] || s || '—'
}

function PixCard({ order }) {
  const [copied, setCopied] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const exp = order.pix?.expiresAt ? new Date(order.pix.expiresAt).getTime() : Date.now() + 15 * 60 * 1000
    return Math.max(0, Math.floor((exp - Date.now()) / 1000))
  })
  useEffect(() => {
    const iv = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(iv)
  }, [])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.pix?.copyPaste || '')
      setCopied(true); toast.success('Código copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  return (
    <Card className="mb-4 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-amber-400" />
            <div className="text-sm font-semibold">Pague com PIX para confirmar</div>
          </div>
          <Badge variant="secondary" className="bg-black/40 font-mono text-amber-300">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> {mm}:{ss}
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-[auto,1fr]">
          <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-xl bg-white p-2">
            {order.pix?.qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={order.pix.qrDataUrl} alt="QR Code PIX" className="h-full w-full" />
            )}
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Valor</div>
              <div className="text-xl font-bold text-amber-300">{brl(order.total)}</div>
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Copia e cola</div>
              <div className="flex gap-2">
                <code className="line-clamp-2 flex-1 break-all rounded bg-black/40 p-2 text-[10px] text-muted-foreground">{order.pix?.copyPaste}</code>
                <Button size="sm" variant="outline" onClick={copy} className="h-auto shrink-0 border-white/10">
                  {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DeliveryConfirmCard({ order, onConfirmed }) {
  const [confirming, setConfirming] = useState(false)
  const user = typeof window !== 'undefined' ? getUser() : null
  const isOwner = user && order.userId === user.id

  const confirm = async () => {
    if (!user) {
      toast.error('Faça login com a conta que realizou o pedido para confirmar')
      return
    }
    if (!isOwner) {
      toast.error('Apenas o cliente que fez o pedido pode confirmar')
      return
    }
    setConfirming(true)
    try {
      const updated = await apiFetch(`/api/orders/${order.id}/confirm-delivery`, { method: 'POST', body: JSON.stringify({}) })
      toast.success('Entrega confirmada! Obrigado 🎉')
      onConfirmed?.(updated)
    } catch (e) { toast.error(e.message) }
    finally { setConfirming(false) }
  }

  return (
    <Card className="mb-4 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-green-500/5">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-emerald-400" />
          <div className="font-semibold text-emerald-300">O entregador marcou como entregue</div>
        </div>
        <p className="mb-4 text-sm text-emerald-200/90">
          Você recebeu o pedido em casa? Confirme abaixo para finalizar.
        </p>
        {!user && (
          <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
            Faça login com sua conta para confirmar a entrega.
          </div>
        )}
        <Button
          onClick={confirm}
          disabled={confirming || !isOwner}
          className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white"
        >
          {confirming ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Confirmando...</> : <><Check className="mr-1 h-4 w-4" /> Confirmar recebimento</>}
        </Button>
      </CardContent>
    </Card>
  )
}

export default OrderTrackingPage
