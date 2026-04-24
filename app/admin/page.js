'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import {
  ChefHat, LogOut, LayoutDashboard, Utensils, Bike, ClipboardList, Package,
  Tag, Users, Plus, Pencil, Trash2, Clock, Check, TrendingUp, DollarSign, ShoppingBag,
  Bell, CreditCard, Banknote, QrCode, CheckCircle2, Search, Menu, X, Calendar,
} from 'lucide-react'
import { apiFetch, getUser, clearAuth, getToken } from '@/lib/auth'

const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const LOCAL_STATUSES = ['Recebido', 'Em preparo', 'Pronto', 'Entregue', 'Finalizado']
const DELIVERY_STATUSES = ['Aguardando confirmação', 'Confirmado', 'Em preparo', 'Saiu para entrega', 'Entregue', 'Finalizado']
const COMANDA_LABELS = {
  aberta: { label: 'Aberta', color: 'bg-emerald-500/20 text-emerald-300' },
  aguardando_pagamento: { label: 'Aguardando pagamento', color: 'bg-amber-500/20 text-amber-300' },
  paga: { label: 'Paga', color: 'bg-blue-500/20 text-blue-300' },
  fechada: { label: 'Fechada', color: 'bg-zinc-500/20 text-zinc-300' },
}

const TABS = [
  { value: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { value: 'comandas', label: 'Comandas', Icon: ClipboardList },
  { value: 'local', label: 'Pedidos Local', Icon: Utensils },
  { value: 'delivery', label: 'Delivery', Icon: Bike },
  { value: 'products', label: 'Produtos', Icon: Package },
  { value: 'categories', label: 'Categorias', Icon: Tag },
  { value: 'users', label: 'Clientes', Icon: Users },
]

function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [comandas, setComandas] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState(null)
  const [editCategory, setEditCategory] = useState(null)
  const [payDialog, setPayDialog] = useState(null)
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [notifList, setNotifList] = useState([])
  const prevIdsRef = useRef({ orders: new Set(), pay: new Set() })

  const playBeep = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      const c = new Ctx()
      ;[880, 1100].forEach((f, i) => {
        setTimeout(() => {
          const o = c.createOscillator(); const g = c.createGain()
          o.connect(g); g.connect(c.destination)
          o.type = 'sine'; o.frequency.value = f
          g.gain.setValueAtTime(0.25, c.currentTime)
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35)
          o.start(); o.stop(c.currentTime + 0.35)
        }, i * 200)
      })
    } catch {}
  }

  useEffect(() => {
    const u = getUser()
    if (!u || u.role !== 'admin' || !getToken()) { router.push('/login'); return }
    setUser(u)
  }, [router])

  const loadAll = async () => {
    setLoading(true)
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : ''
      const [s, o, cmd, p, c, uu] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch(`/api/admin/orders${qs}`),
        apiFetch(`/api/admin/comandas${qs}`),
        apiFetch('/api/admin/products'),
        apiFetch('/api/admin/categories'),
        apiFetch('/api/admin/users'),
      ])
      setStats(s); setOrders(o); setComandas(cmd); setProducts(p); setCategories(c); setUsers(uu)
      prevIdsRef.current = {
        orders: new Set(o.map((x) => x.id)),
        pay: new Set(cmd.filter((x) => x.status === 'aguardando_pagamento').map((x) => x.id)),
      }
    } catch (e) {
      if (e.message.includes('autenticado') || e.message.includes('negado')) { clearAuth(); router.push('/login') }
      else toast.error(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { if (user) loadAll() }, [user, search])

  // Poll for new orders/payment requests
  useEffect(() => {
    if (!user) return
    const iv = setInterval(async () => {
      try {
        const qs = search ? `?search=${encodeURIComponent(search)}` : ''
        const [s, o, cmd] = await Promise.all([
          apiFetch('/api/admin/stats'),
          apiFetch(`/api/admin/orders${qs}`),
          apiFetch(`/api/admin/comandas${qs}`),
        ])
        const prevO = prevIdsRef.current.orders
        const prevP = prevIdsRef.current.pay
        const newOrders = o.filter((x) => !prevO.has(x.id))
        const newPay = cmd.filter((x) => x.status === 'aguardando_pagamento' && !prevP.has(x.id))
        if (newOrders.length > 0 || newPay.length > 0) {
          playBeep()
          const notifs = [
            ...newOrders.map((x) => ({ type: 'order', id: x.id, text: x.type === 'local' ? `Novo pedido Mesa ${x.table} — ${brl(x.total)}` : `Novo delivery — ${x.customer?.name} — ${brl(x.total)}`, at: new Date().toISOString() })),
            ...newPay.map((x) => ({ type: 'payment', id: x.id, text: `💰 Mesa ${x.table} pediu a conta (${x.paymentMethod}) — ${brl(x.total)}`, at: new Date().toISOString() })),
          ]
          setNotifList((prev) => [...notifs, ...prev].slice(0, 20))
          setUnread((u) => u + notifs.length)
          notifs.forEach((n) => toast.info(n.text, { duration: 6000 }))
        }
        setStats(s); setOrders(o); setComandas(cmd)
        prevIdsRef.current = {
          orders: new Set(o.map((x) => x.id)),
          pay: new Set(cmd.filter((x) => x.status === 'aguardando_pagamento').map((x) => x.id)),
        }
      } catch {}
    }, 8000)
    return () => clearInterval(iv)
  }, [user, search])

  const logout = () => { clearAuth(); router.push('/') }

  const changeStatus = async (orderId, status) => {
    try {
      const updated = await apiFetch(`/api/admin/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o))
      toast.success(`Status: "${status}"`)
    } catch (e) { toast.error(e.message) }
  }

  const comandaAction = async (id, action, method) => {
    try {
      const updated = await apiFetch(`/api/admin/comandas/${id}`, { method: 'PATCH', body: JSON.stringify({ action, method }) })
      setComandas((prev) => prev.map((c) => c.id === id ? updated : c))
      toast.success(action === 'pay' ? 'Pagamento confirmado!' : action === 'close' ? 'Comanda fechada' : 'Comanda reaberta')
      setPayDialog(null)
      loadAll()
    } catch (e) { toast.error(e.message) }
  }

  const saveProduct = async (p) => {
    try {
      if (p.id) {
        const u = await apiFetch(`/api/admin/products/${p.id}`, { method: 'PATCH', body: JSON.stringify(p) })
        setProducts((prev) => prev.map((x) => x.id === u.id ? u : x))
      } else {
        const c = await apiFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(p) })
        setProducts((prev) => [...prev, c])
      }
      toast.success('Produto salvo'); setEditProduct(null)
    } catch (e) { toast.error(e.message) }
  }
  const deleteProduct = async (id) => {
    if (!confirm('Excluir?')) return
    await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    setProducts((p) => p.filter((x) => x.id !== id))
    toast.success('Excluído')
  }
  const saveCategory = async (c) => {
    try {
      if (c.id) {
        const u = await apiFetch(`/api/admin/categories/${c.id}`, { method: 'PATCH', body: JSON.stringify(c) })
        setCategories((prev) => prev.map((x) => x.id === u.id ? u : x))
      } else {
        const cr = await apiFetch('/api/admin/categories', { method: 'POST', body: JSON.stringify(c) })
        setCategories((prev) => [...prev, cr])
      }
      toast.success('Categoria salva'); setEditCategory(null)
    } catch (e) { toast.error(e.message) }
  }
  const deleteCategory = async (id) => {
    if (!confirm('Excluir?')) return
    await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    setCategories((p) => p.filter((x) => x.id !== id))
  }

  if (!user) return null

  const deliveryOrders = orders.filter((o) => o.type === 'delivery')
  const localOrders = orders.filter((o) => o.type === 'local')
  const openComandas = comandas.filter((c) => c.status === 'aberta')
  const awaitingPay = comandas.filter((c) => c.status === 'aguardando_pagamento')
  const closedComandas = comandas.filter((c) => c.status === 'paga' || c.status === 'fechada')

  const NavList = ({ onSelect }) => (
    <div className="space-y-1">
      {TABS.map(({ value, label, Icon }) => {
        const isActive = tab === value
        const count = value === 'comandas' ? (openComandas.length + awaitingPay.length) : value === 'local' ? localOrders.length : value === 'delivery' ? deliveryOrders.length : 0
        return (
          <button
            key={value}
            onClick={() => { setTab(value); onSelect?.() }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-amber-500/15 text-amber-300' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}
          >
            <Icon className="h-4 w-4" /> {label}
            {count > 0 && <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{count}</span>}
          </button>
        )
      })}
    </div>
  )

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-white/10 bg-zinc-950 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600"><ChefHat className="h-5 w-5 text-white" /></div>
                  <div><div className="text-sm font-bold">Sabor & Arte</div><div className="text-[10px] uppercase tracking-wider text-amber-400">Admin</div></div>
                </div>
                <NavList onSelect={() => setMenuOpen(false)} />
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600"><ChefHat className="h-5 w-5 text-white" /></div>
              <div className="leading-tight"><div className="text-sm font-bold">Sabor & Arte</div><div className="text-[10px] uppercase tracking-wider text-amber-400">Admin</div></div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative border-white/10 bg-white/5" onClick={() => setUnread(0)}>
                  <Bell className="h-4 w-4" />
                  {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full border-white/10 bg-zinc-950 sm:max-w-md">
                <div className="mb-4 flex items-center gap-2"><Bell className="h-5 w-5 text-amber-400" /><h2 className="text-lg font-bold">Notificações</h2></div>
                {notifList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {notifList.map((n, i) => (
                      <div key={i} className={`rounded-lg border p-3 text-sm ${n.type === 'payment' ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                        <div>{n.text}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground">{new Date(n.at).toLocaleTimeString('pt-BR')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" onClick={logout} className="border-white/10"><LogOut className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Sair</span></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-3 py-4 sm:px-4 sm:py-6">
        {/* Sidebar desktop */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20"><NavList /></div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Search */}
          {['local', 'delivery', 'comandas'].includes(tab) && (
            <div className="mb-4 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome do cliente..." className="border-white/10 bg-white/5 pl-9" />
            </div>
          )}

          {tab === 'dashboard' && <DashboardTab stats={stats} orders={orders} />}
          {tab === 'comandas' && (
            <ComandasTab
              open={openComandas} awaiting={awaitingPay} closed={closedComandas}
              onPayRequest={(c) => setPayDialog({ comanda: c, method: c.paymentMethod || 'Dinheiro' })}
              onAction={comandaAction} loading={loading}
            />
          )}
          {tab === 'local' && <OrdersList orders={localOrders} statuses={LOCAL_STATUSES} onStatusChange={changeStatus} loading={loading} />}
          {tab === 'delivery' && <OrdersList orders={deliveryOrders} statuses={DELIVERY_STATUSES} onStatusChange={changeStatus} loading={loading} />}
          {tab === 'products' && (
            <ProductsTab products={products} categories={categories} onEdit={setEditProduct} onDelete={deleteProduct} onNew={() => setEditProduct({ name: '', description: '', price: 0, image: '', categoryId: categories[0]?.id, active: true })} />
          )}
          {tab === 'categories' && (
            <CategoriesTab categories={categories} onEdit={setEditCategory} onDelete={deleteCategory} onNew={() => setEditCategory({ name: '', icon: '🍽️', order: categories.length + 1 })} />
          )}
          {tab === 'users' && <UsersTab users={users} orders={orders} />}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent className="border-white/10 bg-zinc-950">
          <DialogHeader><DialogTitle>Confirmar pagamento</DialogTitle></DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Mesa</span><span className="font-bold">{payDialog.comanda.table}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Cliente</span><span>{payDialog.comanda.customer?.name}</span></div>
                <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2"><span className="font-semibold">Total</span><span className="text-xl font-bold text-amber-400">{brl(payDialog.comanda.total)}</span></div>
              </div>
              <div>
                <Label className="mb-2 block">Forma de pagamento recebida:</Label>
                <RadioGroup value={payDialog.method} onValueChange={(v) => setPayDialog({ ...payDialog, method: v })} className="space-y-2">
                  {[{v:'Pix',i:<QrCode/>},{v:'Cartão',i:<CreditCard/>},{v:'Dinheiro',i:<Banknote/>}].map(({v,i}) => (
                    <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${payDialog.method===v?'border-amber-500 bg-amber-500/5':'border-white/10'}`}>
                      <RadioGroupItem value={v} />
                      <div className="h-5 w-5 text-muted-foreground">{i}</div>
                      <span className="font-medium">{v}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancelar</Button>
            <Button onClick={() => comandaAction(payDialog.comanda.id, 'pay', payDialog.method)} className="bg-gradient-to-r from-emerald-500 to-green-600"><CheckCircle2 className="mr-1 h-4 w-4" /> Confirmar pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent className="border-white/10 bg-zinc-950"><DialogHeader><DialogTitle>{editProduct?.id ? 'Editar' : 'Novo'} produto</DialogTitle></DialogHeader>
          {editProduct && (<div className="space-y-3">
            <div><Label>Nome</Label><Input value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
            <div><Label>Descrição</Label><Textarea value={editProduct.description} onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preço</Label><Input type="number" step="0.10" value={editProduct.price} onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
              <div><Label>Categoria</Label><Select value={editProduct.categoryId} onValueChange={(v) => setEditProduct({ ...editProduct, categoryId: v })}><SelectTrigger className="mt-1 border-white/10 bg-white/5"><SelectValue /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>URL da imagem</Label><Input value={editProduct.image} onChange={(e) => setEditProduct({ ...editProduct, image: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-3"><Label>Ativo</Label><Switch checked={editProduct.active} onCheckedChange={(v) => setEditProduct({ ...editProduct, active: v })} /></div>
          </div>)}
          <DialogFooter><Button variant="outline" onClick={() => setEditProduct(null)}>Cancelar</Button><Button onClick={() => saveProduct(editProduct)} className="bg-gradient-to-r from-amber-500 to-orange-600">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCategory} onOpenChange={(o) => !o && setEditCategory(null)}>
        <DialogContent className="border-white/10 bg-zinc-950"><DialogHeader><DialogTitle>{editCategory?.id ? 'Editar' : 'Nova'} categoria</DialogTitle></DialogHeader>
          {editCategory && (<div className="space-y-3">
            <div><Label>Nome</Label><Input value={editCategory.name} onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ícone</Label><Input value={editCategory.icon} onChange={(e) => setEditCategory({ ...editCategory, icon: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
              <div><Label>Ordem</Label><Input type="number" value={editCategory.order} onChange={(e) => setEditCategory({ ...editCategory, order: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
            </div>
          </div>)}
          <DialogFooter><Button variant="outline" onClick={() => setEditCategory(null)}>Cancelar</Button><Button onClick={() => saveCategory(editCategory)} className="bg-gradient-to-r from-amber-500 to-orange-600">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function DashboardTab({ stats, orders }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400"><Calendar className="h-3 w-3" /> Hoje</div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={<ShoppingBag />} label="Pedidos hoje" value={stats?.todayOrders || 0} color="amber" />
          <StatCard icon={<DollarSign />} label="Faturamento" value={brl(stats?.todayRevenue)} color="emerald" />
          <StatCard icon={<Clock />} label="Comandas abertas" value={stats?.openComandas || 0} color="orange" />
          <StatCard icon={<Bell />} label="Aguardando pgto" value={stats?.awaitingPayComandas || 0} color="purple" />
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"><TrendingUp className="h-3 w-3" /> Mês atual</div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={<ShoppingBag />} label="Pedidos no mês" value={stats?.monthOrders || 0} color="amber" />
          <StatCard icon={<DollarSign />} label="Faturamento mês" value={brl(stats?.monthRevenue)} color="emerald" />
          <StatCard icon={<TrendingUp />} label="Total histórico" value={stats?.totalOrders || 0} color="purple" />
          <StatCard icon={<Users />} label="Clientes" value={stats?.users || 0} color="orange" />
        </div>
      </div>
      {stats?.paymentsByMethod && Object.keys(stats.paymentsByMethod).length > 0 && (
        <Card className="border-white/10 bg-zinc-900/60"><CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pagamentos hoje por método</h3>
          <div className="space-y-2">{Object.entries(stats.paymentsByMethod).map(([m, v]) => (
            <div key={m} className="flex justify-between text-sm"><span>{m}</span><span className="font-semibold text-amber-400">{brl(v)}</span></div>
          ))}</div>
        </CardContent></Card>
      )}
      <Card className="border-white/10 bg-zinc-900/60"><CardContent className="p-5">
        <h3 className="mb-3 text-base font-semibold">Pedidos recentes</h3>
        {orders.slice(0, 8).map((o) => (
          <div key={o.id} className="flex items-center justify-between border-b border-white/5 py-3 last:border-0">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">#{o.id.slice(0, 8).toUpperCase()}</span><Badge variant="outline" className="text-xs">{o.type === 'local' ? `Mesa ${o.table}` : 'Delivery'}</Badge></div><div className="truncate text-xs text-muted-foreground">{o.customer?.name} · {new Date(o.createdAt).toLocaleString('pt-BR')}</div></div>
            <div className="text-right"><div className="text-sm font-semibold text-amber-400">{brl(o.total)}</div><div className="text-xs text-muted-foreground">{o.status}</div></div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-muted-foreground">Nenhum pedido ainda.</p>}
      </CardContent></Card>
    </div>
  )
}

function ComandasTab({ open, awaiting, closed, onPayRequest, onAction, loading }) {
  return (
    <Tabs defaultValue="awaiting">
      <TabsList className="mb-4 flex w-full flex-wrap bg-black/30">
        <TabsTrigger value="awaiting" className="data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300">🔔 Aguardando pagamento ({awaiting.length})</TabsTrigger>
        <TabsTrigger value="open">🟢 Abertas ({open.length})</TabsTrigger>
        <TabsTrigger value="closed">Fechadas ({closed.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="awaiting"><ComandaList list={awaiting} onPayRequest={onPayRequest} onAction={onAction} loading={loading} emptyMsg="Nenhuma comanda aguardando pagamento" highlight /></TabsContent>
      <TabsContent value="open"><ComandaList list={open} onPayRequest={onPayRequest} onAction={onAction} loading={loading} emptyMsg="Nenhuma comanda aberta" /></TabsContent>
      <TabsContent value="closed"><ComandaList list={closed} onPayRequest={onPayRequest} onAction={onAction} loading={loading} emptyMsg="Nenhuma comanda fechada" /></TabsContent>
    </Tabs>
  )
}

function ComandaList({ list, onPayRequest, onAction, loading, emptyMsg, highlight }) {
  if (loading) return <p className="text-muted-foreground">Carregando...</p>
  if (!list.length) return <Card className="border-white/10 bg-zinc-900/60"><CardContent className="p-10 text-center text-muted-foreground">{emptyMsg}</CardContent></Card>
  return (
    <div className="space-y-3">
      {list.map((c) => {
        const s = COMANDA_LABELS[c.status] || { label: c.status, color: 'bg-white/10' }
        const isAwait = c.status === 'aguardando_pagamento'
        return (
          <Card key={c.id} className={`border bg-zinc-900/60 ${highlight && isAwait ? 'border-amber-500/50 shadow-lg shadow-amber-500/10 animate-pulse' : 'border-white/10'}`}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-amber-500/20 text-amber-300"><Utensils className="mr-1 h-3 w-3" /> Mesa {c.table}</Badge>
                    <Badge className={s.color}>{s.label}</Badge>
                    {isAwait && c.paymentMethod && <Badge variant="outline" className="border-amber-500/50 text-amber-300">💳 {c.paymentMethod}</Badge>}
                  </div>
                  <div className="mt-2 font-semibold">{c.customer?.name}</div>
                  <div className="text-xs text-muted-foreground">Aberta: {new Date(c.openedAt).toLocaleString('pt-BR')}</div>
                  {c.closedAt && <div className="text-xs text-muted-foreground">Fechada: {new Date(c.closedAt).toLocaleString('pt-BR')}</div>}
                  <div className="mt-1 text-xs text-muted-foreground">{c.orderIds?.length || 0} pedidos enviados</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-400">{brl(c.total)}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {isAwait && (
                  <Button onClick={() => onPayRequest(c)} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 min-w-[200px]"><CheckCircle2 className="mr-1 h-4 w-4" /> Confirmar pagamento</Button>
                )}
                {c.status === 'aberta' && (
                  <Button onClick={() => onPayRequest(c)} variant="outline" className="flex-1 border-amber-500/30 text-amber-300 min-w-[180px]"><DollarSign className="mr-1 h-4 w-4" /> Receber pagamento</Button>
                )}
                {(c.status === 'paga' || c.status === 'fechada') && (
                  <Button onClick={() => onAction(c.id, 'reopen')} variant="outline" size="sm" className="border-white/10">Reabrir</Button>
                )}
                {c.status === 'aberta' && (
                  <Button onClick={() => onAction(c.id, 'close')} variant="outline" size="sm" className="border-white/10">Fechar s/ pgto</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function OrdersList({ orders, statuses, onStatusChange, loading }) {
  if (loading) return <p className="text-muted-foreground">Carregando...</p>
  if (!orders.length) return <Card className="border-white/10 bg-zinc-900/60"><CardContent className="p-10 text-center text-muted-foreground">Nenhum pedido</CardContent></Card>
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Card key={o.id} className="border-white/10 bg-zinc-900/60"><CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold">#{o.id.slice(0,8).toUpperCase()}</span>{o.type==='local'?<Badge className="bg-amber-500/20 text-amber-300"><Utensils className="mr-1 h-3 w-3"/>Mesa {o.table}</Badge>:<Badge className="bg-orange-500/20 text-orange-300"><Bike className="mr-1 h-3 w-3"/>Delivery</Badge>}</div>
              <div className="mt-1 text-sm font-medium">{o.customer?.name}{o.customer?.phone && <span className="text-muted-foreground"> · {o.customer.phone}</span>}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString('pt-BR')}</div>
              {o.type==='delivery' && o.address && <div className="mt-1 text-xs text-muted-foreground">📍 {o.address.street}, {o.address.number} · {o.address.district} · {o.address.city}</div>}
              {o.payment?.method && <div className="mt-1 text-xs text-muted-foreground">💳 {o.payment.method} ({o.payment.status})</div>}
            </div>
            <div className="w-full sm:w-auto sm:text-right">
              <div className="text-xl font-bold text-amber-400">{brl(o.total)}</div>
              <Select value={o.status} onValueChange={(v) => onStatusChange(o.id, v)}>
                <SelectTrigger className="mt-1 h-9 border-white/10 bg-white/5 text-xs w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-white/5 bg-black/30 p-3">
            <div className="space-y-1">{o.items.map((i, k) => (
              <div key={k} className="flex justify-between text-sm"><div className="min-w-0 flex-1 truncate"><span className="text-muted-foreground">{i.quantity}× </span><span>{i.name}</span>{i.observations && <span className="italic text-amber-300/70"> — {i.observations}</span>}</div><span className="whitespace-nowrap text-muted-foreground">{brl(i.subtotal)}</span></div>
            ))}</div>
          </div>
        </CardContent></Card>
      ))}
    </div>
  )
}

function ProductsTab({ products, categories, onEdit, onDelete, onNew }) {
  return (<>
    <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">Produtos ({products.length})</h3><Button onClick={onNew} className="bg-gradient-to-r from-amber-500 to-orange-600"><Plus className="mr-1 h-4 w-4" /> Novo</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => { const cat = categories.find((c) => c.id === p.categoryId); return (
        <Card key={p.id} className="border-white/10 bg-zinc-900/60"><CardContent className="p-4">
          <div className="flex gap-3">{p.image && <img src={p.image} alt={p.name} className="h-16 w-16 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-2"><div className="truncate font-semibold">{p.name}</div>{!p.active && <Badge variant="secondary" className="bg-red-500/20 text-red-300">Inativo</Badge>}</div><div className="text-xs text-muted-foreground truncate">{cat?.icon} {cat?.name}</div><div className="mt-1 font-bold text-amber-400">{brl(p.price)}</div></div>
          </div>
          <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" className="flex-1 border-white/10" onClick={() => onEdit(p)}><Pencil className="mr-1 h-3 w-3" /> Editar</Button><Button size="sm" variant="outline" className="border-white/10 text-red-400" onClick={() => onDelete(p.id)}><Trash2 className="h-3 w-3" /></Button></div>
        </CardContent></Card>
      )})}
    </div>
  </>)
}

function CategoriesTab({ categories, onEdit, onDelete, onNew }) {
  return (<>
    <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">Categorias ({categories.length})</h3><Button onClick={onNew} className="bg-gradient-to-r from-amber-500 to-orange-600"><Plus className="mr-1 h-4 w-4" /> Nova</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{categories.map((c) => (
      <Card key={c.id} className="border-white/10 bg-zinc-900/60"><CardContent className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><div className="text-3xl">{c.icon}</div><div><div className="font-semibold">{c.name}</div><div className="text-xs text-muted-foreground">Ordem: {c.order}</div></div></div><div className="flex gap-1"><Button size="sm" variant="outline" className="border-white/10" onClick={() => onEdit(c)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="outline" className="border-white/10 text-red-400" onClick={() => onDelete(c.id)}><Trash2 className="h-3 w-3" /></Button></div></CardContent></Card>
    ))}</div>
  </>)
}

function UsersTab({ users, orders }) {
  return (<Card className="border-white/10 bg-zinc-900/60"><CardContent className="p-0"><div className="divide-y divide-white/5">
    {users.map((u) => { const userOrders = orders.filter((o) => o.userId === u.id); return (
      <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><div className="font-medium">{u.name}</div><div className="truncate text-sm text-muted-foreground">{u.email}</div></div><div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">{userOrders.length} pedidos</span><Badge className={u.role === 'admin' ? 'bg-amber-500 text-black' : 'bg-white/10'}>{u.role}</Badge></div></div>
    )})}
  </div></CardContent></Card>)
}

function StatCard({ icon, label, value, color }) {
  const c = { amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400', emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400', orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400', purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400' }[color]
  return <Card className={`border bg-gradient-to-br ${c}`}><CardContent className="p-4 sm:p-5"><div className="mb-2 h-6 w-6 sm:h-8 sm:w-8">{icon}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">{label}</div><div className="mt-1 text-lg font-bold sm:text-2xl">{value}</div></CardContent></Card>
}

export default AdminPage
