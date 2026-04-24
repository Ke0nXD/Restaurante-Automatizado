'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Utensils, Clock, Receipt, Plus, CreditCard, Banknote, QrCode, CheckCircle2, AlertCircle } from 'lucide-react'
import { apiFetch, getUser } from '@/lib/auth'
import { BrandLogo, useBranding } from '@/lib/branding'
import { SiteFooter } from '@/components/site-footer'

const brl = (n) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (s) => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

function ComandaDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const branding = useBranding()
  const [user, setUser] = useState(null)
  const [comanda, setComanda] = useState(null)
  const [loading, setLoading] = useState(true)
  const [closeOpen, setCloseOpen] = useState(false)
  const [method, setMethod] = useState('Pix')
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const u = getUser()
    if (!u) { router.push('/login'); return }
    setUser(u)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id])

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/comandas/${params.id}`)
      setComanda(data)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const isActive = comanda && ['aberta', 'aguardando_pagamento'].includes(comanda.status)
  const isMine = user && comanda && (comanda.userId === user.id || ['owner_admin', 'admin', 'attendant'].includes(user.role))

  const addMoreItems = () => {
    // Store active comanda context and redirect to menu with same table
    localStorage.setItem('sabor_active_comanda', JSON.stringify({
      comandaId: comanda.id,
      table: comanda.table,
      userId: comanda.userId,
      openedAt: comanda.openedAt,
    }))
    toast.success(`Voltando ao cardápio — mesa ${comanda.table}`)
    router.push(`/?flow=local&table=${encodeURIComponent(comanda.table)}`)
  }

  const requestClose = async () => {
    setClosing(true)
    try {
      await apiFetch(`/api/comandas/${comanda.id}/request-payment`, {
        method: 'POST', body: JSON.stringify({ method }),
      })
      // Clear active comanda context — user cannot add items anymore
      try {
        const raw = localStorage.getItem('sabor_active_comanda')
        if (raw && JSON.parse(raw)?.comandaId === comanda.id) {
          localStorage.removeItem('sabor_active_comanda')
        }
      } catch {}
      toast.success('Solicitação enviada! Aguardando confirmação do atendente.')
      setCloseOpen(false)
      await load()
    } catch (e) { toast.error(e.message) }
    finally { setClosing(false) }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>
  }

  if (!comanda) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-amber-400" />
        <h1 className="text-xl font-bold">Comanda não encontrada</h1>
        <Link href="/minha-conta"><Button variant="outline">Voltar para Minha Conta</Button></Link>
      </main>
    )
  }

  if (!isMine) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <h1 className="text-xl font-bold">Acesso negado</h1>
        <p className="text-sm text-muted-foreground">Essa comanda não pertence ao seu usuário.</p>
        <Link href="/minha-conta"><Button variant="outline">Voltar</Button></Link>
      </main>
    )
  }

  // Aggregate items from all orders
  const allItems = (comanda.orders || []).flatMap((o) => (o.items || []).map((i) => ({ ...i, orderId: o.id, orderStatus: o.status, orderCreatedAt: o.createdAt })))

  const statusMap = {
    aberta: { className: 'bg-emerald-500/20 text-emerald-300', label: '🟢 Conta aberta' },
    aguardando_pagamento: { className: 'bg-amber-500/20 text-amber-300', label: '⏳ Aguardando pagamento' },
    paga: { className: 'bg-blue-500/20 text-blue-300', label: '✅ Paga' },
    fechada: { className: 'bg-zinc-500/20 text-zinc-300', label: '🔒 Fechada' },
  }
  const sb = statusMap[comanda.status] || { className: 'bg-white/10', label: comanda.status }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/minha-conta" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Minha Conta
          </Link>
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="hidden text-sm font-semibold sm:inline">{branding.restaurantName}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Summary card */}
        <Card className={`mb-6 ${isActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card/60'}`}>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge className="bg-amber-500/20 text-amber-300"><Utensils className="mr-1 h-3 w-3" />Mesa {comanda.table}</Badge>
                  <Badge className={sb.className}>{sb.label}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">#{comanda.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Aberta em {fmtDate(comanda.openedAt)}
                  {comanda.closedAt && ` · Fechada em ${fmtDate(comanda.closedAt)}`}
                  {comanda.paidAt && ` · Paga em ${fmtDate(comanda.paidAt)}`}
                </div>
                {comanda.paymentMethod && (
                  <div className="mt-1 text-xs text-muted-foreground">Forma de pagamento: <strong className="text-foreground">{comanda.paymentMethod}</strong></div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Total da comanda</div>
                <div className="text-3xl font-bold text-brand">{brl(comanda.total)}</div>
                <div className="text-[11px] text-muted-foreground">{(comanda.orders || []).length} pedido(s) · {allItems.reduce((a, i) => a + (i.quantity || 0), 0)} itens</div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-2">
              {isActive && comanda.status === 'aberta' && (
                <>
                  <Button onClick={addMoreItems} className="bg-brand-gradient">
                    <Plus className="mr-1 h-4 w-4" /> Adicionar mais itens
                  </Button>
                  <Button onClick={() => setCloseOpen(true)} variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20">
                    <Receipt className="mr-1 h-4 w-4" /> Fechar conta
                  </Button>
                </>
              )}
              {comanda.status === 'aguardando_pagamento' && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                  ⏳ <strong>Aguardando confirmação do atendente</strong> — você escolheu pagar com <strong>{comanda.paymentMethod}</strong>. O pagamento será confirmado presencialmente pela equipe.
                </div>
              )}
              {(comanda.status === 'paga' || comanda.status === 'fechada') && (
                <div className="rounded-lg border border-white/5 bg-black/20 p-3 text-sm text-muted-foreground">
                  🔒 Esta conta está {comanda.status === 'paga' ? 'paga' : 'fechada'} e não pode ser modificada.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items list */}
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Receipt className="h-5 w-5 text-brand" /> Itens da comanda ({allItems.length})
        </h2>

        {allItems.length === 0 ? (
          <Card className="border-dashed border-white/10 bg-card/30">
            <CardContent className="py-10 text-center text-muted-foreground">Nenhum item ainda.</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(comanda.orders || []).map((o, idx) => (
              <Card key={o.id} className="border-border bg-card/60">
                <CardContent className="p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Pedido #{idx + 1}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</span>
                      <Badge variant="outline" className="border-white/10 text-[10px]">
                        {o.status === 'Finalizado' ? <><CheckCircle2 className="mr-1 h-3 w-3 text-emerald-400" /> Finalizado</> : <><Clock className="mr-1 h-3 w-3 text-amber-400" /> {o.status}</>}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{fmtDate(o.createdAt)}</span>
                  </div>
                  <div className="space-y-2">
                    {(o.items || []).map((i, k) => (
                      <div key={k} className="flex items-start justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium">
                            <span className="mr-1 text-brand">{i.quantity}×</span>
                            {i.name}
                          </div>
                          {i.observations && (
                            <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">💬 {i.observations}</div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-semibold">{brl((i.price || 0) * (i.quantity || 1))}</div>
                          {i.quantity > 1 && <div className="text-[10px] text-muted-foreground">{brl(i.price)} cada</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-sm">
                    <span className="text-muted-foreground">Subtotal do pedido</span>
                    <span className="font-bold">{brl(o.total)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="border-brand bg-brand-soft">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm font-semibold uppercase tracking-wide">Total geral</span>
                <span className="text-2xl font-bold text-brand">{brl(comanda.total)}</span>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Close dialog */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="border-white/10 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Fechar conta · Mesa {comanda.table}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="text-xs uppercase tracking-wide text-emerald-300">Total a pagar</div>
              <div className="text-3xl font-bold text-emerald-300">{brl(comanda.total)}</div>
            </div>
            <div>
              <Label className="text-sm">Como deseja pagar?</Label>
              <RadioGroup value={method} onValueChange={setMethod} className="mt-2 space-y-2">
                {[
                  { id: 'Pix', label: 'PIX', Icon: QrCode, desc: 'QR Code na maquininha do atendente' },
                  { id: 'Cartão', label: 'Cartão', Icon: CreditCard, desc: 'Crédito ou débito na maquininha' },
                  { id: 'Dinheiro', label: 'Dinheiro', Icon: Banknote, desc: 'Pago em espécie ao atendente' },
                ].map(({ id, label, Icon, desc }) => (
                  <label key={id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${method === id ? 'border-brand bg-brand-soft' : 'border-border bg-white/5 hover:bg-white/10'}`}>
                    <RadioGroupItem value={id} className="border-white/30" />
                    <Icon className="h-5 w-5" />
                    <div className="flex-1">
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
              📌 O atendente será notificado e confirmará o pagamento presencialmente. A conta ficará <strong>Aguardando pagamento</strong> até a confirmação.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancelar</Button>
            <Button onClick={requestClose} disabled={closing} className="bg-brand-gradient">
              {closing ? 'Enviando...' : 'Pedir a conta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </main>
  )
}

export default ComandaDetailsPage
