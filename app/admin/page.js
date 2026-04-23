'use client'

import { useState, useEffect } from 'react'
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
import { toast } from 'sonner'
import {
  ChefHat, LogOut, LayoutDashboard, Utensils, Bike, ClipboardList, Package,
  Tag, Users, Plus, Pencil, Trash2, Clock, Check, TrendingUp, DollarSign, ShoppingBag,
} from 'lucide-react'
import { apiFetch, getUser, clearAuth, getToken } from '@/lib/auth'

const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const LOCAL_STATUSES = ['Recebido', 'Em preparo', 'Pronto', 'Entregue', 'Finalizado']
const DELIVERY_STATUSES = ['Aguardando confirmação', 'Confirmado', 'Em preparo', 'Saiu para entrega', 'Entregue', 'Finalizado']

function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState(null)
  const [editCategory, setEditCategory] = useState(null)

  useEffect(() => {
    const u = getUser()
    if (!u || u.role !== 'admin' || !getToken()) {
      router.push('/login')
      return
    }
    setUser(u)
  }, [router])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [s, o, p, c, uu] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch('/api/admin/orders'),
        apiFetch('/api/admin/products'),
        apiFetch('/api/admin/categories'),
        apiFetch('/api/admin/users'),
      ])
      setStats(s); setOrders(o); setProducts(p); setCategories(c); setUsers(uu)
    } catch (e) {
      if (e.message.includes('autenticado') || e.message.includes('negado')) {
        clearAuth(); router.push('/login')
      } else toast.error(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { if (user) loadAll() }, [user])
  useEffect(() => {
    if (!user) return
    const iv = setInterval(() => {
      apiFetch('/api/admin/orders').then(setOrders).catch(() => {})
      apiFetch('/api/admin/stats').then(setStats).catch(() => {})
    }, 10000)
    return () => clearInterval(iv)
  }, [user])

  const logout = () => { clearAuth(); router.push('/') }

  const changeStatus = async (orderId, status) => {
    try {
      const updated = await apiFetch(`/api/admin/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o))
      toast.success(`Status alterado para "${status}"`)
    } catch (e) { toast.error(e.message) }
  }

  const saveProduct = async (p) => {
    try {
      if (p.id) {
        const updated = await apiFetch(`/api/admin/products/${p.id}`, { method: 'PATCH', body: JSON.stringify(p) })
        setProducts((prev) => prev.map((x) => x.id === updated.id ? updated : x))
      } else {
        const created = await apiFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(p) })
        setProducts((prev) => [...prev, created])
      }
      toast.success('Produto salvo')
      setEditProduct(null)
    } catch (e) { toast.error(e.message) }
  }

  const deleteProduct = async (id) => {
    if (!confirm('Excluir este produto?')) return
    try {
      await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      setProducts((prev) => prev.filter((x) => x.id !== id))
      toast.success('Produto excluído')
    } catch (e) { toast.error(e.message) }
  }

  const saveCategory = async (c) => {
    try {
      if (c.id) {
        const updated = await apiFetch(`/api/admin/categories/${c.id}`, { method: 'PATCH', body: JSON.stringify(c) })
        setCategories((prev) => prev.map((x) => x.id === updated.id ? updated : x))
      } else {
        const created = await apiFetch('/api/admin/categories', { method: 'POST', body: JSON.stringify(c) })
        setCategories((prev) => [...prev, created])
      }
      toast.success('Categoria salva')
      setEditCategory(null)
    } catch (e) { toast.error(e.message) }
  }

  const deleteCategory = async (id) => {
    if (!confirm('Excluir esta categoria?')) return
    try {
      await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
      setCategories((prev) => prev.filter((x) => x.id !== id))
      toast.success('Categoria excluída')
    } catch (e) { toast.error(e.message) }
  }

  if (!user) return null

  const localOrders = orders.filter((o) => o.type === 'local')
  const deliveryOrders = orders.filter((o) => o.type === 'delivery')

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold">Sabor & Arte</div>
              <div className="text-[10px] uppercase tracking-wider text-amber-400">Painel Admin</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">{user.name}</span>
            <Button variant="outline" size="sm" onClick={logout} className="border-white/10">
              <LogOut className="mr-1 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex w-full flex-wrap bg-black/30">
            <TabsTrigger value="dashboard"><LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard</TabsTrigger>
            <TabsTrigger value="local"><Utensils className="mr-1 h-4 w-4" /> Local ({localOrders.length})</TabsTrigger>
            <TabsTrigger value="delivery"><Bike className="mr-1 h-4 w-4" /> Delivery ({deliveryOrders.length})</TabsTrigger>
            <TabsTrigger value="comandas"><ClipboardList className="mr-1 h-4 w-4" /> Comandas</TabsTrigger>
            <TabsTrigger value="products"><Package className="mr-1 h-4 w-4" /> Produtos</TabsTrigger>
            <TabsTrigger value="categories"><Tag className="mr-1 h-4 w-4" /> Categorias</TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-1 h-4 w-4" /> Clientes</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<ShoppingBag />} label="Pedidos hoje" value={stats?.todayOrders || 0} color="amber" />
              <StatCard icon={<DollarSign />} label="Faturamento hoje" value={brl(stats?.todayRevenue)} color="emerald" />
              <StatCard icon={<Clock />} label="Pedidos ativos" value={stats?.pendingOrders || 0} color="orange" />
              <StatCard icon={<TrendingUp />} label="Total histórico" value={stats?.totalOrders || 0} color="purple" />
            </div>

            <Card className="mt-6 border-white/10 bg-zinc-900/60">
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Pedidos recentes</h3>
                {orders.slice(0, 5).map((o) => (
                  <OrderRowCompact key={o.id} order={o} />
                ))}
                {orders.length === 0 && <p className="text-muted-foreground">Nenhum pedido ainda.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Local orders */}
          <TabsContent value="local">
            <OrdersList orders={localOrders} statuses={LOCAL_STATUSES} onStatusChange={changeStatus} loading={loading} />
          </TabsContent>

          {/* Delivery orders */}
          <TabsContent value="delivery">
            <OrdersList orders={deliveryOrders} statuses={DELIVERY_STATUSES} onStatusChange={changeStatus} loading={loading} />
          </TabsContent>

          {/* Comandas (active local) */}
          <TabsContent value="comandas">
            <OrdersList
              orders={localOrders.filter((o) => o.status !== 'Finalizado')}
              statuses={LOCAL_STATUSES}
              onStatusChange={changeStatus}
              loading={loading}
              emptyMsg="Nenhuma comanda aberta"
            />
          </TabsContent>

          {/* Products */}
          <TabsContent value="products">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Produtos ({products.length})</h3>
              <Button onClick={() => setEditProduct({ name: '', description: '', price: 0, image: '', categoryId: categories[0]?.id, active: true })} className="bg-gradient-to-r from-amber-500 to-orange-600">
                <Plus className="mr-1 h-4 w-4" /> Novo produto
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => {
                const cat = categories.find((c) => c.id === p.categoryId)
                return (
                  <Card key={p.id} className="border-white/10 bg-zinc-900/60">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {p.image && <img src={p.image} alt={p.name} className="h-16 w-16 rounded-lg object-cover" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="font-semibold leading-tight">{p.name}</div>
                            {!p.active && <Badge variant="secondary" className="bg-red-500/20 text-red-300">Inativo</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">{cat?.icon} {cat?.name}</div>
                          <div className="mt-1 text-amber-400 font-bold">{brl(p.price)}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 border-white/10" onClick={() => setEditProduct(p)}>
                          <Pencil className="mr-1 h-3 w-3" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" className="border-white/10 text-red-400 hover:bg-red-500/10" onClick={() => deleteProduct(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Categories */}
          <TabsContent value="categories">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Categorias ({categories.length})</h3>
              <Button onClick={() => setEditCategory({ name: '', icon: '🍽️', order: categories.length + 1 })} className="bg-gradient-to-r from-amber-500 to-orange-600">
                <Plus className="mr-1 h-4 w-4" /> Nova categoria
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <Card key={c.id} className="border-white/10 bg-zinc-900/60">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{c.icon}</div>
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs text-muted-foreground">Ordem: {c.order}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="border-white/10" onClick={() => setEditCategory(c)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-white/10 text-red-400" onClick={() => deleteCategory(c.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <Card className="border-white/10 bg-zinc-900/60">
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {users.map((u) => {
                    const userOrders = orders.filter((o) => o.userId === u.id)
                    return (
                      <div key={u.id} className="flex items-center justify-between p-4">
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-sm text-muted-foreground">{u.email}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{userOrders.length} pedidos</span>
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className={u.role === 'admin' ? 'bg-amber-500 text-black' : ''}>
                            {u.role}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product edit dialog */}
      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent className="border-white/10 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>{editProduct?.id ? 'Editar' : 'Novo'} produto</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={editProduct.description} onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Preço (R$)</Label>
                  <Input type="number" step="0.10" value={editProduct.price} onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={editProduct.categoryId} onValueChange={(v) => setEditProduct({ ...editProduct, categoryId: v })}>
                    <SelectTrigger className="mt-1 border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>URL da imagem</Label>
                <Input value={editProduct.image} onChange={(e) => setEditProduct({ ...editProduct, image: e.target.value })} placeholder="https://..." className="mt-1 border-white/10 bg-white/5" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                <Label>Produto ativo</Label>
                <Switch checked={editProduct.active} onCheckedChange={(v) => setEditProduct({ ...editProduct, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>Cancelar</Button>
            <Button onClick={() => saveProduct(editProduct)} className="bg-gradient-to-r from-amber-500 to-orange-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category edit dialog */}
      <Dialog open={!!editCategory} onOpenChange={(o) => !o && setEditCategory(null)}>
        <DialogContent className="border-white/10 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>{editCategory?.id ? 'Editar' : 'Nova'} categoria</DialogTitle>
          </DialogHeader>
          {editCategory && (
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input value={editCategory.name} onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ícone (emoji)</Label>
                  <Input value={editCategory.icon} onChange={(e) => setEditCategory({ ...editCategory, icon: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div>
                  <Label>Ordem</Label>
                  <Input type="number" value={editCategory.order} onChange={(e) => setEditCategory({ ...editCategory, order: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategory(null)}>Cancelar</Button>
            <Button onClick={() => saveCategory(editCategory)} className="bg-gradient-to-r from-amber-500 to-orange-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
  }
  return (
    <Card className={`border bg-gradient-to-br ${colors[color]}`}>
      <CardContent className="p-6">
        <div className="mb-2 h-8 w-8">{icon}</div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function OrderRowCompact({ order }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-0">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">#{order.id.slice(0, 8).toUpperCase()}</span>
          <Badge variant="outline" className="text-xs">{order.type === 'local' ? `Mesa ${order.table}` : 'Delivery'}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">{order.customer?.name} · {new Date(order.createdAt).toLocaleString('pt-BR')}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-amber-400">{brl(order.total)}</div>
        <div className="text-xs text-muted-foreground">{order.status}</div>
      </div>
    </div>
  )
}

function OrdersList({ orders, statuses, onStatusChange, loading, emptyMsg }) {
  if (loading) return <p className="text-muted-foreground">Carregando...</p>
  if (!orders.length) return (
    <Card className="border-white/10 bg-zinc-900/60">
      <CardContent className="p-12 text-center text-muted-foreground">{emptyMsg || 'Nenhum pedido aqui ainda'}</CardContent>
    </Card>
  )
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Card key={o.id} className="border-white/10 bg-zinc-900/60">
          <CardContent className="p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">#{o.id.slice(0, 8).toUpperCase()}</span>
                  {o.type === 'local' ? (
                    <Badge className="bg-amber-500/20 text-amber-300"><Utensils className="mr-1 h-3 w-3" /> Mesa {o.table}</Badge>
                  ) : (
                    <Badge className="bg-orange-500/20 text-orange-300"><Bike className="mr-1 h-3 w-3" /> Delivery</Badge>
                  )}
                </div>
                <div className="mt-1 text-sm">
                  <span className="font-medium">{o.customer?.name}</span>
                  {o.customer?.phone && <span className="text-muted-foreground"> · {o.customer.phone}</span>}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString('pt-BR')}</div>
                {o.type === 'delivery' && o.address && (
                  <div className="mt-1 text-xs text-muted-foreground">📍 {o.address.street}, {o.address.number} · {o.address.district} · {o.address.city}</div>
                )}
                {o.payment && (
                  <div className="mt-1 text-xs text-muted-foreground">💳 {o.payment.method} ({o.payment.status})</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-amber-400">{brl(o.total)}</div>
                <Select value={o.status} onValueChange={(v) => onStatusChange(o.id, v)}>
                  <SelectTrigger className="mt-1 h-8 w-48 border-white/10 bg-white/5 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/30 p-3">
              <div className="space-y-1">
                {o.items.map((i, k) => (
                  <div key={k} className="flex justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">{i.quantity}× </span>
                      <span>{i.name}</span>
                      {i.observations && <span className="italic text-amber-300/70"> — {i.observations}</span>}
                    </div>
                    <span className="text-muted-foreground">{brl(i.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default AdminPage
