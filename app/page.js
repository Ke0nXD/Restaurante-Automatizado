'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from '@/components/ui/sheet'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart, Search, MapPin, Home, ArrowLeft, Plus, Minus, Trash2, ChefHat,
  Utensils, Bike, Check, Clock, CreditCard, Banknote, QrCode, MessageCircle,
  User, LogIn, LogOut, LayoutDashboard, Eye, Copy, CheckCircle2, Loader2, Receipt, Info,
} from 'lucide-react'
import { getUser, getToken, clearAuth, authHeaders } from '@/lib/auth'
import { useBranding, BrandLogo } from '@/lib/branding'
import { SiteFooter } from '@/components/site-footer'

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function App() {
  const branding = useBranding()
  const [view, setView] = useState('welcome')
  const [orderType, setOrderType] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [detailProduct, setDetailProduct] = useState(null)
  const [detailQty, setDetailQty] = useState(1)
  const [detailObs, setDetailObs] = useState('')
  const [detailAddOns, setDetailAddOns] = useState([])
  const [checkoutStep, setCheckoutStep] = useState('info')
  const [tableNumber, setTableNumber] = useState('')
  const [customer, setCustomer] = useState({ name: '', phone: '' })
  const [address, setAddress] = useState({
    cep: '', street: '', number: '', district: '', complement: '',
    reference: '', city: '', state: '',
  })
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [changeNeeded, setChangeNeeded] = useState(false)
  const [changeFor, setChangeFor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completedOrder, setCompletedOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authUser, setAuthUser] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [banner, setBanner] = useState(null)
  const [promotions, setPromotions] = useState([])
  const [featured, setFeatured] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [showLoginGate, setShowLoginGate] = useState(false)
  const [pendingAdd, setPendingAdd] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const u = getUser()
    setAuthUser(u)
    try {
      // Recent orders are per-user (keyed by user id). Guests see none.
      if (u?.id) {
        const saved = JSON.parse(localStorage.getItem(`sabor_recent_orders_${u.id}`) || '[]')
        setRecentOrders(saved)
      } else {
        setRecentOrders([])
        // Clean up any legacy shared-cache entry from older versions
        localStorage.removeItem('sabor_recent_orders')
      }

      // === Continue on active comanda (flow=local&table=X) ===
      const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const flowParam = sp?.get('flow')
      const tableParam = sp?.get('table')
      const activeCtxRaw = localStorage.getItem('sabor_active_comanda')
      if (flowParam === 'local' && tableParam) {
        setOrderType('local')
        setTableNumber(String(tableParam))
        setView('menu')
      } else if (activeCtxRaw && u?.id) {
        try {
          const ctx = JSON.parse(activeCtxRaw)
          if (ctx?.userId === u.id && ctx?.table) {
            setOrderType('local')
            setTableNumber(String(ctx.table))
          }
        } catch {}
      }

      // Restore pending add after login
      if (u) {
        const pending = localStorage.getItem('sabor_pending_add')
        if (pending) {
          const p = JSON.parse(pending)
          localStorage.removeItem('sabor_pending_add')
          // Add to cart directly (user is authenticated)
          setCart((prev) => {
            const existing = prev.find((i) => i.productId === p.product.id && i.observations === p.observations)
            if (existing) return prev.map((i) => i === existing ? { ...i, quantity: i.quantity + p.quantity } : i)
            return [...prev, { productId: p.product.id, name: p.product.name, price: p.product.price, image: p.product.image, quantity: p.quantity, observations: p.observations }]
          })
          setView('menu')
          toast.success(`${p.product.name} adicionado ao carrinho`)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, cRes, bRes, promoRes, fRes, pmRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
          fetch('/api/banner'),
          fetch('/api/promotions'),
          fetch('/api/products?featured=1'),
          fetch('/api/payment-methods'),
        ])
        setProducts(await pRes.json())
        setCategories(await cRes.json())
        setBanner(await bRes.json())
        setPromotions(await promoRes.json())
        setFeatured(await fRes.json())
        const pm = await pmRes.json()
        setPaymentMethods(pm)
        if (pm.length > 0 && pm[0]?.id) setPaymentMethod(pm[0].id)
      } catch (e) {
        toast.error('Erro ao carregar cardápio')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('sabor_cart')
    if (saved) { try { setCart(JSON.parse(saved)) } catch {} }
  }, [])
  useEffect(() => {
    localStorage.setItem('sabor_cart', JSON.stringify(cart))
  }, [cart])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCategory === 'all' || p.categoryId === activeCategory
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [products, activeCategory, search])

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + (i.finalUnitPrice ?? i.price) * i.quantity, 0)

  const addToCart = (product, quantity = 1, observations = '', addOns = []) => {
    if (!authUser) {
      setPendingAdd({ product, quantity, observations, addOns })
      setShowLoginGate(true)
      return
    }
    const addOnsKey = addOns.map((a) => a.id).sort().join(',')
    const addOnsTotal = addOns.reduce((s, a) => s + Number(a.price || 0), 0)
    const finalUnitPrice = Number(product.price || 0) + addOnsTotal
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.productId === product.id && i.observations === observations && (i.addOnsKey || '') === addOnsKey
      )
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity,
          observations,
          addOns,
          addOnsKey,
          addOnsTotal,
          finalUnitPrice,
        },
      ]
    })
    toast.success(`${product.name} adicionado ao carrinho`)
  }

  const updateQty = (idx, delta) => {
    setCart((prev) =>
      prev
        .map((i, k) => (k === idx ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    )
  }
  const removeItem = (idx) => {
    setCart((prev) => prev.filter((_, k) => k !== idx))
  }

  const openDetail = (p) => {
    setDetailProduct(p); setDetailQty(1); setDetailObs(''); setDetailAddOns([])
  }

  const submitOrder = async () => {
    setSubmitting(true)
    try {
      const payload = {
        type: orderType,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          observations: i.observations,
          addOns: (i.addOns || []).map((a) => ({ id: a.id, name: a.name, price: a.price })),
        })),
        customer: { name: customer.name || 'Visitante', phone: customer.phone || '' },
      }
      if (orderType === 'delivery') {
        payload.address = {
          street: address.street,
          number: address.number,
          district: address.district,
          complement: address.complement || '',
          reference: address.reference || '',
          cep: address.cep || '',
          city: address.city,
          state: address.state || '',
        }
        const pay = { method: paymentMethod }
        if (paymentMethod === 'cash_delivery' && changeNeeded && Number(changeFor) >= cartTotal) {
          pay.changeNeeded = true
          pay.changeFor = Number(changeFor)
        }
        payload.payment = pay
      } else {
        payload.table = tableNumber
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar pedido')
      setCompletedOrder(data)
      if (data.comandaId && data.type === 'local' && authUser?.id) {
        // Persist active comanda context so user can continue adding items later
        localStorage.setItem('sabor_active_comanda', JSON.stringify({
          comandaId: data.comandaId,
          table: data.table,
          userId: authUser.id,
          openedAt: data.createdAt,
        }))
      }
      const recent = [{ id: data.id, type: data.type, total: data.total, createdAt: data.createdAt, comandaId: data.comandaId }, ...recentOrders].slice(0, 5)
      // Only persist per user (guests don't get a history)
      if (authUser?.id) {
        localStorage.setItem(`sabor_recent_orders_${authUser.id}`, JSON.stringify(recent))
        setRecentOrders(recent)
      }
      setCart([])
      setView('success')
      setCheckoutStep('info')
      toast.success('Pedido enviado com sucesso!')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const resetAll = () => {
    setView('welcome')
    setOrderType(null)
    setCart([])
    setCompletedOrder(null)
    setTableNumber('')
    setAddress({ cep: '', street: '', number: '', district: '', complement: '', reference: '', city: '', state: '' })
    setCustomer({ name: '', phone: '' })
    setCheckoutStep('info')
    setActiveCategory('all')
    setSearch('')
  }

  if (view === 'welcome') {
    return (
      <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-stone-950 to-black text-foreground">
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />

        {/* Top-right user menu */}
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <Link href="/sobre">
            <Button size="sm" className="bg-brand-gradient text-white shadow-md shadow-amber-500/20 hover:opacity-90">
              <Info className="mr-1 h-4 w-4" /> Sobre
            </Button>
          </Link>
          {authUser ? (
            <>
              {['owner_admin', 'admin', 'attendant', 'delivery_driver'].includes(authUser.role) && (
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20">
                    <LayoutDashboard className="mr-1 h-4 w-4" /> Admin
                  </Button>
                </Link>
              )}
              <Link href="/minha-conta">
                <Button variant="outline" size="sm" className="border-white/10 bg-white/5">
                  <Receipt className="mr-1 h-4 w-4" /> Minha conta
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="border-white/10 bg-white/5" onClick={() => { clearAuth(); setAuthUser(null); setRecentOrders([]); toast.success('Desconectado') }}>
                <LogOut className="mr-1 h-4 w-4" /> {authUser.name?.split(' ')[0] || 'Sair'}
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-white/10 bg-white/5">
                <LogIn className="mr-1 h-4 w-4" /> Entrar
              </Button>
            </Link>
          )}
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-12">
          <div className="mb-10 flex items-center gap-3">
            <BrandLogo size="lg" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{branding.restaurantName}</h1>
              {branding.slogan && <p className="text-xs uppercase tracking-[0.25em] text-amber-400/80">{branding.slogan}</p>}
            </div>
          </div>

          <h2 className="mb-3 text-center text-4xl font-bold tracking-tight sm:text-5xl">
            Bem-vindo ao nosso <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">cardápio digital</span>
          </h2>
          <p className="mb-12 max-w-xl text-center text-lg text-muted-foreground">
            Como você gostaria de ser atendido hoje? Escolha uma opção para começar.
          </p>

          <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
            <button
              onClick={() => { setOrderType('local'); setView('menu') }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 text-left transition hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 transition group-hover:scale-110 group-hover:bg-amber-500/20">
                <Utensils className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-2xl font-bold">Estou no Local</h3>
              <p className="text-sm text-muted-foreground">
                Peça pela mesa. Sua comanda será aberta automaticamente e enviada à cozinha.
              </p>
              <div className="mt-6 inline-flex items-center text-sm font-medium text-amber-400 transition group-hover:translate-x-1">
                Começar pedido →
              </div>
            </button>

            <button
              onClick={() => { setOrderType('delivery'); setView('menu') }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 text-left transition hover:border-orange-500/40 hover:shadow-2xl hover:shadow-orange-500/10"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 transition group-hover:scale-110 group-hover:bg-orange-500/20">
                <Bike className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-2xl font-bold">Fazer pedido Delivery</h3>
              <p className="text-sm text-muted-foreground">
                Receba em casa. Informe seu endereço e forma de pagamento no checkout.
              </p>
              <div className="mt-6 inline-flex items-center text-sm font-medium text-orange-400 transition group-hover:translate-x-1">
                Começar pedido →
              </div>
            </button>
          </div>

          <p className="mt-12 text-xs text-muted-foreground">
            Você pode continuar como visitante — faça login para acompanhar seus pedidos.
          </p>

          {authUser && recentOrders.length > 0 && (
            <div className="mt-8 w-full max-w-3xl">
              <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Seus pedidos recentes</div>
              <div className="space-y-2">
                {recentOrders.slice(0, 3).map((o) => (
                  <Link key={o.id} href={`/pedido/${o.id}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 hover:border-amber-500/30 hover:bg-white/10">
                    <div className="flex items-center gap-3">
                      {o.type === 'local' ? <Utensils className="h-4 w-4 text-amber-400" /> : <Bike className="h-4 w-4 text-orange-400" />}
                      <div>
                        <div className="font-mono text-sm font-semibold">#{o.id.slice(0, 8).toUpperCase()}</div>
                        <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString('pt-BR')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-amber-400">{brl(o.total)}</span>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <SiteFooter />
      </main>
    )
  }

  if (view === 'success' && completedOrder) {
    const isLocal = completedOrder.type === 'local'
    const isPixPending = completedOrder.type === 'delivery' && completedOrder.payment?.method === 'pix' && completedOrder.payment?.status === 'aguardando_pagamento'
    return (
      <main className="min-h-screen bg-gradient-to-br from-zinc-950 to-black px-4 py-10">
        <div className="mx-auto max-w-2xl">
          {isPixPending && (
            <PixPaymentCard
              order={completedOrder}
              onPaid={(updated) => setCompletedOrder({ ...completedOrder, ...updated })}
            />
          )}
          <Card className="border-white/10 bg-zinc-900/60 backdrop-blur">
            <CardContent className="p-8">
              <div className="mb-6 flex flex-col items-center text-center">
                <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full shadow-lg ${isPixPending ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30' : 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30'}`}>
                  {isPixPending ? <Clock className="h-10 w-10 text-white" /> : <Check className="h-10 w-10 text-white" />}
                </div>
                <h2 className="text-3xl font-bold">{isPixPending ? 'Aguardando pagamento PIX' : 'Pedido confirmado!'}</h2>
                <p className="mt-2 text-muted-foreground">
                  {isPixPending
                    ? 'O pedido será confirmado automaticamente assim que o pagamento for identificado.'
                    : isLocal
                    ? `Sua comanda foi aberta na mesa ${completedOrder.table}.`
                    : 'Seu pedido foi enviado ao restaurante.'}
                </p>
              </div>

              <div className="mb-6 rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Número do pedido</span>
                  <span className="font-mono font-semibold">#{completedOrder.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-300">
                    <Clock className="mr-1 h-3 w-3" /> {completedOrder.status}
                  </Badge>
                </div>
                {isLocal ? (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Mesa</span>
                    <span className="font-semibold">{completedOrder.table}</span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pagamento</span>
                    <span className="font-semibold">{completedOrder.payment?.method}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-amber-400">{brl(completedOrder.total)}</span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Itens</h3>
                <div className="space-y-2">
                  {completedOrder.items.map((i, k) => (
                    <div key={k} className="flex items-start justify-between gap-4 text-sm">
                      <div>
                        <div className="font-medium">{i.quantity}× {i.name}</div>
                        {i.observations && (
                          <div className="text-xs text-muted-foreground">Obs: {i.observations}</div>
                        )}
                      </div>
                      <div className="whitespace-nowrap">{brl(i.subtotal)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={resetAll} className="flex-1 bg-brand-gradient hover:opacity-90">
                  <Home className="mr-2 h-4 w-4" /> Voltar ao início
                </Button>
                <Link href={`/pedido/${completedOrder.id}`} className="flex-1">
                  <Button variant="outline" className="w-full border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20">
                    <Eye className="mr-2 h-4 w-4" /> Acompanhar pedido
                  </Button>
                </Link>
              </div>
              {isLocal && completedOrder.comandaId && (
                <div className="mt-4 space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="text-xs uppercase tracking-widest text-emerald-400">🟢 Comanda aberta</div>
                  <p className="text-sm text-muted-foreground">Você pode continuar pedindo. A conta é fechada no final quando você solicitar.</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={() => { setView('menu'); setCompletedOrder(null) }} variant="outline" className="flex-1 border-white/20">
                      <Plus className="mr-1 h-4 w-4" /> Adicionar mais itens
                    </Button>
                    <Button onClick={() => { setCheckoutStep('pay-comanda'); setView('checkout') }} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600">
                      Pedir a conta 💳
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <SiteFooter />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 pb-24">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-black/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <button onClick={() => setView('welcome')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <div className="leading-tight">
              <div className="text-sm font-bold">{branding.restaurantName}</div>
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-400">
                {orderType === 'local' ? <><Utensils className="h-2.5 w-2.5" /> No Local</> : <><Bike className="h-2.5 w-2.5" /> Delivery</>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sobre">
              <Button size="sm" className="bg-brand-gradient text-white shadow-md shadow-amber-500/20 hover:opacity-90">
                <Info className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Sobre</span>
              </Button>
            </Link>
            {authUser && (
              <Link href="/minha-conta">
                <Button variant="outline" size="sm" className="border-white/10 bg-white/5 hover:bg-white/10">
                  <Receipt className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Minha conta</span>
                </Button>
              </Link>
            )}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative border-white/10 bg-white/5 hover:bg-white/10">
                  <ShoppingCart className="h-4 w-4" />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col border-white/10 bg-zinc-950 sm:max-w-lg">
              <SheetHeader>
                <SheetTitle className="text-2xl">Seu pedido</SheetTitle>
              </SheetHeader>
              {cart.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <ShoppingCart className="mb-4 h-16 w-16 text-muted-foreground/40" />
                  <p className="text-muted-foreground">Carrinho vazio</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">Adicione itens do cardápio para começar.</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-3 overflow-y-auto py-4">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
                        <img src={item.image} alt={item.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium leading-tight">{item.name}</div>
                            <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-red-400">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {item.observations && (
                            <div className="mt-0.5 text-xs italic text-muted-foreground">
                              &ldquo;{item.observations}&rdquo;
                            </div>
                          )}
                          {Array.isArray(item.addOns) && item.addOns.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {item.addOns.map((a, k) => (
                                <div key={k} className="text-[11px] text-emerald-300">+ {a.name} ({brl(a.price)})</div>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 rounded-full bg-black/40 p-1">
                              <button onClick={() => updateQty(idx, -1)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-4 text-center text-sm font-semibold">{item.quantity}</span>
                              <button onClick={() => updateQty(idx, 1)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="font-semibold text-brand">{brl((item.finalUnitPrice ?? item.price) * item.quantity)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <SheetFooter className="border-t border-white/5 pt-4">
                    <div className="w-full space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">{brl(cartTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        <span className="text-lg font-bold">Total</span>
                        <span className="text-2xl font-bold text-amber-400">{brl(cartTotal)}</span>
                      </div>
                      <Button
                        onClick={() => { setCartOpen(false); setView('checkout') }}
                        size="lg"
                        className="w-full bg-brand-gradient text-base font-semibold hover:opacity-90"
                      >
                        Finalizar pedido →
                      </Button>
                    </div>
                  </SheetFooter>
                </>
              )}
            </SheetContent>
          </Sheet>
          </div>
        </div>

        {view === 'menu' && (
          <div className="mx-auto max-w-6xl space-y-3 px-4 pb-3">
            {(() => {
              if (!authUser || typeof window === 'undefined') return null
              try {
                const raw = localStorage.getItem('sabor_active_comanda')
                if (!raw) return null
                const ctx = JSON.parse(raw)
                if (ctx?.userId !== authUser.id) return null
                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-emerald-300" />
                      <span><strong className="text-emerald-300">Comanda aberta · Mesa {ctx.table}</strong> — novos itens serão adicionados à mesma conta.</span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/comanda/${ctx.comandaId}`}>
                        <Button size="sm" variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200">Ver conta</Button>
                      </Link>
                      <Button size="sm" variant="outline" className="border-white/10" onClick={() => { localStorage.removeItem('sabor_active_comanda'); setTableNumber(''); toast.info('Contexto da comanda removido'); }}>
                        Sair
                      </Button>
                    </div>
                  </div>
                )
              } catch { return null }
            })()}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar no cardápio..."
                className="border-white/10 bg-white/5 pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <CategoryChip active={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>
                Todos
              </CategoryChip>
              {categories.map((c) => (
                <CategoryChip
                  key={c.id}
                  active={activeCategory === c.id}
                  onClick={() => setActiveCategory(c.id)}
                >
                  <span className="mr-1">{c.icon}</span> {c.name}
                </CategoryChip>
              ))}
            </div>
          </div>
        )}
      </header>

      {view === 'checkout' ? (
        <CheckoutView
          orderType={orderType}
          checkoutStep={checkoutStep}
          setCheckoutStep={setCheckoutStep}
          tableNumber={tableNumber}
          setTableNumber={setTableNumber}
          customer={customer}
          setCustomer={setCustomer}
          address={address}
          setAddress={setAddress}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentMethods={paymentMethods}
          changeNeeded={changeNeeded}
          setChangeNeeded={setChangeNeeded}
          changeFor={changeFor}
          setChangeFor={setChangeFor}
          cart={cart}
          cartTotal={cartTotal}
          submitting={submitting}
          onSubmit={submitOrder}
          onBack={() => setView('menu')}
        />
      ) : (
        <div className="mx-auto max-w-6xl px-4 pt-6">
          {/* Banner */}
          {banner && banner.active && (
            <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black">
              {banner.image && <img src={banner.image} alt={banner.title} className="h-48 w-full object-cover opacity-40 sm:h-64" />}
              <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/80 via-black/50 to-transparent p-6 sm:p-10">
                {banner.title && <h2 className="text-2xl font-bold sm:text-4xl">{banner.title}</h2>}
                {banner.subtitle && <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">{banner.subtitle}</p>}
                {banner.buttonText && banner.buttonLink && (
                  <a href={banner.buttonLink} className="mt-4 inline-flex w-fit rounded-full bg-brand-gradient px-5 py-2 text-sm font-semibold text-black">{banner.buttonText}</a>
                )}
              </div>
            </div>
          )}

          {/* Featured products */}
          {featured.length > 0 && !search && activeCategory === 'all' && (
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <h3 className="text-xl font-bold">Destaques da casa</h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-3">
                {featured.map((p) => (
                  <div key={p.id} className="min-w-[240px] max-w-[240px] shrink-0">
                    <ProductCard product={p} onOpen={() => openDetail(p)} onAdd={() => addToCart(p, 1, '')} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Promotions */}
          {promotions.length > 0 && !search && activeCategory === 'all' && (
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <h3 className="text-xl font-bold">Promoções</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {promotions.map((promo) => (
                  <Card key={promo.id} className="group overflow-hidden border-orange-500/20 bg-gradient-to-br from-orange-900/20 to-zinc-900/60">
                    <div className="flex flex-col sm:flex-row">
                      {promo.image && <img src={promo.image} alt={promo.title} className="h-40 w-full object-cover sm:h-auto sm:w-40" />}
                      <CardContent className="flex-1 p-4">
                        <h4 className="font-bold leading-tight">{promo.title}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">{promo.description}</p>
                        {promo.priceText && <div className="mt-3 inline-flex rounded-full bg-brand-gradient px-3 py-1 text-sm font-bold text-black">{promo.priceText}</div>}
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Products grid */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum produto encontrado</p>
            </div>
          ) : (
            <>
              {(!search && activeCategory === 'all') && <h3 className="mb-3 text-xl font-bold">Cardápio completo</h3>}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} onOpen={() => openDetail(p)} onAdd={() => addToCart(p, 1, '')} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {cart.length > 0 && view === 'menu' && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-brand-gradient px-5 py-3 text-sm font-semibold text-black shadow-2xl shadow-amber-500/30 transition hover:scale-105"
        >
          <ShoppingCart className="h-4 w-4" />
          Ver carrinho ({cartCount})
          <span className="h-4 w-px bg-black/30" />
          {brl(cartTotal)}
        </button>
      )}

      <Dialog open={!!detailProduct} onOpenChange={(o) => !o && setDetailProduct(null)}>
        <DialogContent className="max-w-md overflow-hidden border-white/10 bg-zinc-950 p-0">
          {detailProduct && (
            <>
              <img src={detailProduct.image} alt={detailProduct.name} className="h-56 w-full object-cover" />
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{detailProduct.name}</DialogTitle>
                  <DialogDescription className="text-base text-muted-foreground">
                    {detailProduct.description}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <div className="mb-3 text-2xl font-bold text-brand">{brl(detailProduct.price)}</div>
                  {Array.isArray(detailProduct.addOns) && detailProduct.addOns.filter((a) => a.active !== false).length > 0 && (
                    <div className="mb-4">
                      <Label className="mb-2 block text-sm font-semibold">Adicionais</Label>
                      <div className="space-y-2">
                        {detailProduct.addOns.filter((a) => a.active !== false).map((a) => {
                          const isOn = detailAddOns.some((x) => x.id === a.id)
                          return (
                            <label key={a.id} className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-2.5 text-sm transition ${isOn ? 'border-brand bg-brand-soft' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isOn}
                                  onChange={(e) => {
                                    if (e.target.checked) setDetailAddOns([...detailAddOns, { id: a.id, name: a.name, price: a.price }])
                                    else setDetailAddOns(detailAddOns.filter((x) => x.id !== a.id))
                                  }}
                                  className="h-4 w-4 accent-amber-500"
                                />
                                <span className="font-medium">{a.name}</span>
                              </div>
                              <span className="text-emerald-300">+ {brl(a.price)}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <Label className="mb-1 block text-sm">Observações (opcional)</Label>
                  <Textarea
                    placeholder="Ex.: sem cebola, ponto da carne mal passado..."
                    value={detailObs}
                    onChange={(e) => setDetailObs(e.target.value)}
                    className="min-h-16 resize-none border-white/10 bg-white/5"
                  />
                </div>
                <DialogFooter className="mt-4 flex-row items-center gap-3 sm:justify-between">
                  <div className="flex items-center gap-2 rounded-full bg-white/5 p-1">
                    <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-6 text-center font-semibold">{detailQty}</span>
                    <button onClick={() => setDetailQty(detailQty + 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <Button
                    onClick={() => { addToCart(detailProduct, detailQty, detailObs, detailAddOns); setDetailProduct(null) }}
                    className="bg-brand-gradient hover:opacity-90"
                  >
                    Adicionar {brl((detailProduct.price + detailAddOns.reduce((s, a) => s + Number(a.price || 0), 0)) * detailQty)}
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Login gate */}
      <Dialog open={showLoginGate} onOpenChange={setShowLoginGate}>
        <DialogContent className="max-w-md border-white/10 bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-2xl">Faça login para continuar</DialogTitle>
            <DialogDescription>
              Para registrar seu pedido e manter o histórico, é necessário fazer login ou criar uma conta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
              💡 Seu carrinho será mantido. Após o login você continua do ponto onde parou.
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (pendingAdd) localStorage.setItem('sabor_pending_add', JSON.stringify(pendingAdd))
                  localStorage.setItem('sabor_redirect_after_login', '/')
                  router.push('/login')
                }}
                className="flex-1 bg-brand-gradient"
              >
                <LogIn className="mr-1 h-4 w-4" /> Entrar / Cadastrar
              </Button>
              <Button variant="outline" onClick={() => setShowLoginGate(false)} className="border-white/10">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <SiteFooter />
    </main>
  )
}

function CategoryChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-amber-500 bg-amber-500/10 text-amber-400'
          : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function ProductCard({ product, onOpen, onAdd }) {
  return (
    <Card className="group overflow-hidden border-white/5 bg-zinc-900/50 transition hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/5">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative h-48 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      </button>
      <CardContent className="p-4">
        <button onClick={onOpen} className="block w-full text-left">
          <h3 className="font-semibold leading-tight">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        </button>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-amber-400">{brl(product.price)}</span>
          <Button
            size="sm"
            onClick={onAdd}
            className="bg-brand-gradient hover:opacity-90"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CheckoutView({
  orderType, checkoutStep, setCheckoutStep, tableNumber, setTableNumber,
  customer, setCustomer, address, setAddress, paymentMethod, setPaymentMethod,
  paymentMethods, changeNeeded, setChangeNeeded, changeFor, setChangeFor,
  cart, cartTotal, submitting, onSubmit, onBack,
}) {
  const canSubmitLocal = tableNumber && cart.length > 0
  const canGoPayment = address.street && address.number && address.district && address.city && customer.name && customer.phone
  const canSubmitDelivery = canGoPayment && paymentMethod && cart.length > 0

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao cardápio
      </Button>

      {checkoutStep === 'pay-comanda' ? (
        <PayComandaStep onBack={onBack} />
      ) : (
      <Card className="border-white/10 bg-zinc-900/60">
        <CardContent className="p-6">
          {orderType === 'local' ? (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Utensils className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Pedido no Local</h2>
                  <p className="text-sm text-muted-foreground">Informe o número da sua mesa</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Número da mesa *</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Ex.: 12"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="mt-1 h-12 border-white/10 bg-white/5 text-lg"
                  />
                </div>
                <div>
                  <Label>Seu nome (opcional)</Label>
                  <Input
                    placeholder="Nome na comanda"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="mt-1 border-white/10 bg-white/5"
                  />
                </div>
              </div>
            </>
          ) : checkoutStep === 'info' ? (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Dados de entrega</h2>
                  <p className="text-sm text-muted-foreground">Para onde vamos entregar?</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Nome *</Label>
                  <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Telefone *</Label>
                  <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="(11) 99999-9999" className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input value={address.cep} onChange={(e) => setAddress({ ...address, cep: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div>
                  <Label>Cidade *</Label>
                  <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Endereço (rua) *</Label>
                  <Input value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div>
                  <Label>Número *</Label>
                  <Input value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div>
                  <Label>Bairro *</Label>
                  <Input value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Complemento / Referência</Label>
                  <Input value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} className="mt-1 border-white/10 bg-white/5" placeholder="Apto 12, próximo ao mercado..." />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Pagamento</h2>
                  <p className="text-sm text-muted-foreground">Escolha a forma de pagamento</p>
                </div>
              </div>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                {(paymentMethods || []).length === 0 ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
                    ⚠️ Nenhum método de pagamento disponível. Entre em contato com o restaurante.
                  </div>
                ) : (
                  paymentMethods.map((m) => {
                    const icons = {
                      pix: <QrCode className="h-5 w-5" />,
                      card_delivery: <CreditCard className="h-5 w-5" />,
                      cash_delivery: <Banknote className="h-5 w-5" />,
                      // legacy
                      credit_card: <CreditCard className="h-5 w-5" />,
                      debit_card: <CreditCard className="h-5 w-5" />,
                      cash_on_delivery: <Banknote className="h-5 w-5" />,
                    }
                    const descs = {
                      pix: 'Gera QR Code na tela — confirmação automática',
                      card_delivery: 'O motoboy levará a maquininha até você',
                      cash_delivery: 'Pagamento em dinheiro no momento da entrega',
                      credit_card: 'Cartão de crédito na maquininha',
                      debit_card: 'Cartão de débito na maquininha',
                      cash_on_delivery: 'Pagamento em dinheiro na entrega',
                    }
                    return <PaymentOption key={m.id} value={m.id} label={m.label} description={descs[m.id] || ''} icon={icons[m.id] || <CreditCard className="h-5 w-5" />} current={paymentMethod} />
                  })
                )}
              </RadioGroup>
              <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-muted-foreground">
                {paymentMethod === 'pix' && '🟢 Após o pedido, exibiremos o QR Code. O pedido é confirmado automaticamente assim que o pagamento for identificado.'}
                {paymentMethod === 'card_delivery' && '💳 Pagamento será feito na entrega com o motoboy. Status permanece "Pendente entrega" até a confirmação.'}
                {paymentMethod === 'cash_delivery' && '💵 Separe o valor em dinheiro. Pagamento na entrega — tenha troco preparado, se possível.'}
              </div>
              {paymentMethod === 'cash_delivery' && (
                <div className="mt-3 space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div>
                    <Label className="text-xs">Precisa de troco?</Label>
                    <RadioGroup value={changeNeeded ? 'yes' : 'no'} onValueChange={(v) => { setChangeNeeded(v === 'yes'); if (v === 'no') setChangeFor('') }} className="mt-2 flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <RadioGroupItem value="no" /> Não preciso de troco
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <RadioGroupItem value="yes" /> Sim, vou pagar com nota maior
                      </label>
                    </RadioGroup>
                  </div>
                  {changeNeeded && (
                    <div>
                      <Label className="text-xs">Troco para quanto?</Label>
                      <div className="relative mt-1">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          placeholder={String(Math.ceil(cartTotal / 10) * 10)}
                          value={changeFor}
                          onChange={(e) => setChangeFor(e.target.value)}
                          className="border-white/10 bg-white/5 pl-9"
                        />
                      </div>
                      {changeFor && Number(changeFor) > 0 && Number(changeFor) < cartTotal && (
                        <p className="mt-1 text-xs text-red-400">⚠️ Valor menor que o total ({brl(cartTotal)}). Ajuste para um valor maior.</p>
                      )}
                      {changeFor && Number(changeFor) >= cartTotal && (
                        <p className="mt-1 text-xs text-emerald-300">Troco aproximado: <strong>{brl(Number(changeFor) - cartTotal)}</strong></p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-6 rounded-xl border border-white/5 bg-black/30 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumo</div>
            <div className="space-y-1">
              {cart.map((i, k) => (
                <div key={k} className="space-y-0.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{i.quantity}× {i.name}</span>
                    <span>{brl((i.finalUnitPrice ?? i.price) * i.quantity)}</span>
                  </div>
                  {Array.isArray(i.addOns) && i.addOns.length > 0 && (
                    <div className="pl-4 text-[10px] text-emerald-300">
                      {i.addOns.map((a, ak) => <div key={ak}>+ {a.name}</div>)}
                    </div>
                  )}
                  {i.observations && <div className="pl-4 text-[10px] italic text-muted-foreground">&ldquo;{i.observations}&rdquo;</div>}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-amber-400">{brl(cartTotal)}</span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            {orderType === 'delivery' && checkoutStep === 'payment' && (
              <Button variant="outline" onClick={() => setCheckoutStep('info')} className="border-white/10">
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
            )}
            {orderType === 'local' ? (
              <Button
                size="lg"
                disabled={!canSubmitLocal || submitting}
                onClick={onSubmit}
                className="flex-1 bg-brand-gradient text-base font-semibold hover:opacity-90"
              >
                {submitting ? 'Enviando...' : 'Abrir comanda'}
              </Button>
            ) : checkoutStep === 'info' ? (
              <Button
                size="lg"
                disabled={!canGoPayment}
                onClick={() => setCheckoutStep('payment')}
                className="flex-1 bg-brand-gradient text-base font-semibold hover:opacity-90"
              >
                Continuar para pagamento →
              </Button>
            ) : (
              <Button
                size="lg"
                disabled={!canSubmitDelivery || submitting}
                onClick={onSubmit}
                className="flex-1 bg-brand-gradient text-base font-semibold hover:opacity-90"
              >
                {submitting ? 'Enviando...' : 'Confirmar pedido'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}

function PayComandaStep({ onBack }) {
  const [comanda, setComanda] = useState(null)
  const [method, setMethod] = useState('Pix')
  const [submitting, setSubmitting] = useState(false)
  const [requested, setRequested] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('sabor_active_comanda')
    if (!id) return
    fetch(`/api/comandas/${id}`).then((r) => r.json()).then((d) => {
      if (d.error) return
      setComanda(d)
      if (d.status === 'aguardando_pagamento' || d.status === 'paga') setRequested(true)
    })
  }, [])

  const requestPayment = async () => {
    if (!comanda) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/comandas/${comanda.id}/request-payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setComanda(data); setRequested(true)
      toast.success('Garçom foi chamado!')
    } catch (e) { toast.error(e.message) } finally { setSubmitting(false) }
  }

  if (!comanda) return <Card className="border-white/10 bg-zinc-900/60"><CardContent className="p-8 text-center text-muted-foreground">Nenhuma comanda ativa</CardContent></Card>

  if (requested) {
    return (
      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-2xl font-bold">Garçom chamado!</h2>
          <p className="text-muted-foreground">
            {comanda.status === 'paga' ? 'Pagamento confirmado. Obrigado!' : `Aguarde, levaremos a ${comanda.paymentMethod === 'Dinheiro' ? 'maquininha ou receberemos o pagamento' : 'maquininha'} em instantes.`}
          </p>
          <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4 text-left">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Mesa</span><span className="font-bold">{comanda.table}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Forma de pagamento</span><span>{comanda.paymentMethod}</span></div>
            <div className="mt-2 flex justify-between border-t border-white/5 pt-2"><span className="font-semibold">Total</span><span className="text-xl font-bold text-amber-400">{brl(comanda.total)}</span></div>
          </div>
          <Button onClick={onBack} className="mt-6 w-full bg-brand-gradient">Voltar ao cardápio</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-white/10 bg-zinc-900/60">
      <CardContent className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"><CreditCard className="h-6 w-6" /></div>
          <div><h2 className="text-xl font-bold">Fechar a conta</h2><p className="text-sm text-muted-foreground">Mesa {comanda.table} · {comanda.orders?.length || 0} pedidos</p></div>
        </div>
        <div className="mb-4 rounded-xl border border-white/5 bg-black/30 p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Resumo da comanda</div>
          {(comanda.orders || []).flatMap((o) => o.items).map((i, k) => (
            <div key={k} className="flex justify-between text-sm"><span className="text-muted-foreground">{i.quantity}× {i.name}</span><span>{brl(i.subtotal)}</span></div>
          ))}
          <div className="mt-3 flex justify-between border-t border-white/5 pt-3"><span className="font-semibold">Total</span><span className="text-2xl font-bold text-amber-400">{brl(comanda.total)}</span></div>
        </div>
        <Label className="mb-2 block">Forma de pagamento</Label>
        <RadioGroup value={method} onValueChange={setMethod} className="space-y-2">
          <PaymentOption value="Pix" label="Pix" description="Chamaremos o garçom com o QR Code" icon={<QrCode className="h-5 w-5" />} current={method} />
          <PaymentOption value="Cartão" label="Cartão" description="Garçom trará a maquininha" icon={<CreditCard className="h-5 w-5" />} current={method} />
          <PaymentOption value="Dinheiro" label="Dinheiro" description="Garçom receberá o pagamento" icon={<Banknote className="h-5 w-5" />} current={method} />
        </RadioGroup>
        <Button disabled={submitting} onClick={requestPayment} size="lg" className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-green-600 text-base font-semibold">
          {submitting ? 'Chamando...' : '🔔 Chamar garçom para pagamento'}
        </Button>
      </CardContent>
    </Card>
  )
}

function PaymentOption({ value, label, description, icon, current }) {
  const selected = current === value
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${selected ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 hover:border-white/20'}`}>
      <RadioGroupItem value={value} />
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-muted-foreground'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  )
}

function PixPaymentCard({ order, onPaid }) {
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState(order.payment?.status || 'aguardando_pagamento')
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const exp = order.pix?.expiresAt ? new Date(order.pix.expiresAt).getTime() : Date.now() + 15 * 60 * 1000
    return Math.max(0, Math.floor((exp - Date.now()) / 1000))
  })

  // Countdown
  useEffect(() => {
    if (status !== 'aguardando_pagamento') return
    const iv = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(iv)
  }, [status])

  // Polling status
  useEffect(() => {
    if (status !== 'aguardando_pagamento') return
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/orders/${order.id}/pix-status`, { cache: 'no-store' })
        if (!r.ok) return
        const d = await r.json()
        if (d.paymentStatus === 'pago') {
          setStatus('pago')
          toast.success('Pagamento PIX confirmado! ✅')
          onPaid?.({ payment: { ...order.payment, status: 'pago' }, status: d.orderStatus || order.status })
        } else if (d.paymentStatus === 'expirado') {
          setStatus('expirado')
          toast.error('O código PIX expirou. Gere um novo.')
        }
      } catch {}
    }, 5000)
    return () => clearInterval(iv)
  }, [order.id, status, onPaid, order.payment, order.status])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.pix?.copyPaste || '')
      setCopied(true)
      toast.success('Código copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch { toast.error('Não foi possível copiar') }
  }

  const regenerate = async () => {
    try {
      const r = await fetch(`/api/orders/${order.id}/pix-regenerate`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() } })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro')
      onPaid?.(d)
      setStatus('aguardando_pagamento')
      setSecondsLeft(Math.max(0, Math.floor((new Date(d.pix.expiresAt).getTime() - Date.now()) / 1000)))
      toast.success('Novo PIX gerado')
    } catch (e) { toast.error(e.message) }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  if (status === 'pago') {
    return (
      <Card className="mb-4 border-emerald-500/30 bg-emerald-500/10">
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          <div>
            <div className="font-semibold text-emerald-300">Pagamento confirmado</div>
            <div className="text-xs text-emerald-200/80">Seu pedido foi enviado à cozinha.</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === 'expirado') {
    return (
      <Card className="mb-4 border-red-500/30 bg-red-500/10">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-3">
            <Clock className="h-5 w-5 text-red-400" />
            <div className="font-semibold text-red-300">Código PIX expirado</div>
          </div>
          <Button onClick={regenerate} size="sm" className="bg-brand-gradient">Gerar novo PIX</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-4 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-amber-400" />
            <div className="font-semibold">Pague com PIX</div>
          </div>
          <Badge variant="secondary" className="bg-black/40 font-mono text-amber-300">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> {mm}:{ss}
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-[auto,1fr]">
          <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-white p-2 md:h-56 md:w-56">
            {order.pix?.qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={order.pix.qrDataUrl} alt="QR Code PIX" className="h-full w-full" />
            ) : (
              <div className="text-sm text-zinc-600">QR indisponível</div>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Valor</div>
              <div className="text-2xl font-bold text-amber-300">{brl(order.total)}</div>
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">PIX Copia e Cola</div>
              <div className="flex gap-2">
                <code className="line-clamp-2 flex-1 break-all rounded-lg bg-black/40 p-2 text-[10px] text-muted-foreground">
                  {order.pix?.copyPaste || ''}
                </code>
                <Button size="sm" variant="outline" onClick={copy} className="h-auto shrink-0 border-white/10">
                  {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/20 p-2 text-[11px] text-muted-foreground">
              Abra o app do seu banco, escolha PIX → Pagar com QR Code (ou use o código copia e cola). Seu pedido será confirmado automaticamente em segundos.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default App
