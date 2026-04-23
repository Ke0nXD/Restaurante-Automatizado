'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChefHat, ArrowLeft, Clock, Check, Utensils, Bike, MapPin, CreditCard } from 'lucide-react'

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
                <div key={k} className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <div className="font-medium">{i.quantity}× {i.name}</div>
                    {i.observations && <div className="text-xs text-muted-foreground">Obs: {i.observations}</div>}
                  </div>
                  <div className="whitespace-nowrap">{brl(i.subtotal)}</div>
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
                <span>{order.payment?.method}</span>
                <Badge variant="outline" className="ml-auto text-xs">{order.payment?.status}</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

export default OrderTrackingPage
