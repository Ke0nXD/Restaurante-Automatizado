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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import {
  ChefHat, LogOut, LayoutDashboard, Utensils, Bike, ClipboardList, Package,
  Tag, Users, Plus, Pencil, Trash2, Clock, Check, TrendingUp, DollarSign, ShoppingBag,
  Bell, CreditCard, Banknote, QrCode, CheckCircle2, Search, Menu, X, Calendar,
  Sparkles, Image as ImageIcon, Star, Flame, Settings, Upload, Palette, Sun, Moon, Monitor, Copy, Info,
} from 'lucide-react'
import { apiFetch, getUser, clearAuth, getToken, authHeaders } from '@/lib/auth'
import { refreshBranding, BrandLogo, useBranding } from '@/lib/branding'
import { useTheme, DEFAULT_THEME, contrastRatio, wcagLabel } from '@/lib/theme'
import { ImageField } from '@/components/image-field'
import { RichText } from '@/components/rich-text'

const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const LOCAL_STATUSES = ['Recebido', 'Em preparo', 'Pronto', 'Entregue', 'Finalizado']
const DELIVERY_STATUSES = ['Aguardando confirmação', 'Confirmado', 'Em preparo', 'Saiu para entrega', 'Entregue', 'Finalizado']
const COMANDA_LABELS = {
  aberta: { label: 'Aberta', color: 'bg-emerald-500/20 text-emerald-300' },
  aguardando_pagamento: { label: 'Aguardando pagamento', color: 'bg-amber-500/20 text-amber-300' },
  paga: { label: 'Paga', color: 'bg-blue-500/20 text-blue-300' },
  fechada: { label: 'Fechada', color: 'bg-zinc-500/20 text-zinc-300' },
}

const ROLES = {
  owner_admin: 'Admin Dono',
  admin: 'Admin Dono',
  attendant: 'Atendente',
  delivery_driver: 'Entregador',
  customer: 'Cliente',
}

// Tabs with allowed roles; empty = all staff
const TABS = [
  { value: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, roles: ['owner_admin', 'admin'] },
  { value: 'comandas', label: 'Comandas', Icon: ClipboardList, roles: ['owner_admin', 'admin', 'attendant'] },
  { value: 'local', label: 'Pedidos Local', Icon: Utensils, roles: ['owner_admin', 'admin', 'attendant'] },
  { value: 'delivery', label: 'Delivery', Icon: Bike, roles: ['owner_admin', 'admin', 'attendant', 'delivery_driver'] },
  { value: 'history', label: 'Histórico', Icon: Calendar, roles: ['owner_admin', 'admin'] },
  { value: 'products', label: 'Produtos', Icon: Package, roles: ['owner_admin', 'admin'] },
  { value: 'categories', label: 'Categorias', Icon: Tag, roles: ['owner_admin', 'admin'] },
  { value: 'content', label: 'Conteúdo', Icon: Sparkles, roles: ['owner_admin', 'admin'] },
  { value: 'payments', label: 'Pagamentos', Icon: CreditCard, roles: ['owner_admin', 'admin'] },
  { value: 'theme', label: 'Tema', Icon: Palette, roles: ['owner_admin', 'admin'] },
  { value: 'footer', label: 'Rodapé', Icon: LayoutDashboard, roles: ['owner_admin', 'admin'] },
  { value: 'about', label: 'Sobre', Icon: Info, roles: ['owner_admin', 'admin'] },
  { value: 'settings', label: 'Configurações', Icon: Settings, roles: ['owner_admin', 'admin'] },
  { value: 'users', label: 'Usuários', Icon: Users, roles: ['owner_admin', 'admin'] },
]

function AdminPage() {
  const router = useRouter()
  const branding = useBranding()
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
  const [banners, setBanners] = useState([])
  const [promotions, setPromotions] = useState([])
  const [editBanner, setEditBanner] = useState(null)
  const [editPromo, setEditPromo] = useState(null)
  const [paymentMethodsConfig, setPaymentMethodsConfig] = useState([])
  const [deliveryDialog, setDeliveryDialog] = useState(null)
  const [filters, setFilters] = useState({ type: '', status: '', minValue: '', maxValue: '', table: '', address: '', dateFrom: '', dateTo: '', paymentStatus: '', paymentMethod: '', deliveryStatus: '' })
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [notifBellOpen, setNotifBellOpen] = useState(false)
  const beepedIdsRef = useRef(new Set())

  // Confirmation dialog (reliable shadcn replacement for window.confirm)
  const [confirmState, setConfirmState] = useState({ open: false, title: '', description: '', confirmLabel: 'Confirmar', destructive: false, onConfirm: null })
  const askConfirm = ({ title, description, confirmLabel = 'Confirmar', destructive = false, onConfirm }) => {
    setConfirmState({ open: true, title, description, confirmLabel, destructive, onConfirm })
  }

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

  // Fetch notifications from server (source of truth)
  const fetchNotifications = async () => {
    try {
      const list = await apiFetch('/api/admin/notifications')
      setNotifications(list)
      return list
    } catch { return [] }
  }

  useEffect(() => {
    const u = getUser()
    if (!u || !['owner_admin', 'admin', 'attendant', 'delivery_driver'].includes(u.role) || !getToken()) {
      router.push('/login'); return
    }
    setUser(u)
    // Set initial tab based on role
    if (u.role === 'delivery_driver') setTab('delivery')
    else if (u.role === 'attendant') setTab('comandas')
  }, [router])

  const allowedTabs = TABS.filter((t) => t.roles.includes(user?.role))
  const isOwner = user && ['owner_admin', 'admin'].includes(user.role)
  const isAttendant = user?.role === 'attendant'
  const isDriver = user?.role === 'delivery_driver'

  const loadAll = async () => {
    setLoading(true)
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : ''
      const promises = {
        orders: apiFetch(`/api/admin/orders${qs ? qs + '&history=0' : '?history=0'}`),
        history: isOwner ? apiFetch(`/api/admin/orders?history=1${search ? '&search=' + encodeURIComponent(search) : ''}`) : Promise.resolve([]),
        comandas: apiFetch(`/api/admin/comandas${qs}`),
      }
      // Owner-only data
      if (isOwner) {
        promises.stats = apiFetch('/api/admin/stats')
        promises.products = apiFetch('/api/admin/products')
        promises.categories = apiFetch('/api/admin/categories')
        promises.users = apiFetch('/api/admin/users')
        promises.banners = apiFetch('/api/admin/banners')
        promises.promotions = apiFetch('/api/admin/promotions')
        promises.paymentMethodsConfig = apiFetch('/api/admin/payment-methods')
      }
      const results = await Promise.allSettled(Object.entries(promises).map(async ([k, p]) => [k, await p]))
      const data = {}
      results.forEach((r) => { if (r.status === 'fulfilled') { const [k, v] = r.value; data[k] = v } })
      // Defensive: ensure arrays even if API returns errors/objects
      const arr = (v) => Array.isArray(v) ? v : []
      if (data.orders !== undefined) setOrders([...arr(data.orders), ...arr(data.history)])
      if (data.comandas !== undefined) setComandas(arr(data.comandas))
      if (data.stats) setStats(data.stats)
      if (data.products !== undefined) setProducts(arr(data.products))
      if (data.categories !== undefined) setCategories(arr(data.categories))
      if (data.users !== undefined) setUsers(arr(data.users))
      if (data.banners !== undefined) setBanners(arr(data.banners))
      if (data.promotions !== undefined) setPromotions(arr(data.promotions))
      if (data.paymentMethodsConfig !== undefined) setPaymentMethodsConfig(arr(data.paymentMethodsConfig))
    } catch (e) {
      if (e.message.includes('autenticado') || e.message.includes('negado')) { clearAuth(); router.push('/login') }
      else toast.error(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (user) {
      loadAll()
      // On first load, fetch notifications and mark all as "already beeped" to avoid beeping for old ones
      apiFetch('/api/admin/notifications').then((notifs) => {
        setNotifications(notifs)
        notifs.forEach((n) => beepedIdsRef.current.add(n.id))
      }).catch(() => {})
    }
  }, [user, search])

  // Poll for new data + notifications (server-driven, no duplicates)
  useEffect(() => {
    if (!user) return
    const pollOnce = async () => {
      try {
        const qs = search ? `?search=${encodeURIComponent(search)}` : ''
        const [oRaw, cmdRaw, notifsRaw] = await Promise.all([
          apiFetch(`/api/admin/orders${qs ? qs + '&history=0' : '?history=0'}`),
          apiFetch(`/api/admin/comandas${qs}`),
          apiFetch('/api/admin/notifications'),
        ])
        const o = Array.isArray(oRaw) ? oRaw : []
        const cmd = Array.isArray(cmdRaw) ? cmdRaw : []
        const notifs = Array.isArray(notifsRaw) ? notifsRaw : []
        // Detect NEW notifications (not beeped yet in this session) to play sound + toast
        const freshUnread = notifs.filter((n) => !n.isRead && !beepedIdsRef.current.has(n.id))
        if (freshUnread.length > 0) {
          playBeep()
          freshUnread.forEach((n) => {
            toast.info(`${n.title}${n.message ? ' — ' + n.message : ''}`, { duration: 6000, id: `notif-${n.id}` })
            beepedIdsRef.current.add(n.id)
          })
        }
        // Also add to beeped set any already-read so they never beep again
        notifs.filter((n) => n.isRead).forEach((n) => beepedIdsRef.current.add(n.id))
        setNotifications(notifs)
        setOrders((prev) => {
          const TERMINAL = ['Finalizado', 'Não Entregue', 'Cancelado']
          const history = prev.filter((x) => TERMINAL.includes(x.status))
          return [...o, ...history]
        })
        setComandas(cmd)
        if (isOwner) {
          apiFetch('/api/admin/stats').then(setStats).catch(() => {})
        }
      } catch {}
    }
    const iv = setInterval(pollOnce, 8000)
    return () => clearInterval(iv)
  }, [user, search, isOwner])

  const logout = () => { clearAuth(); router.push('/') }

  const changeStatus = async (orderId, status) => {
    try {
      const updated = await apiFetch(`/api/admin/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o))
      // Update the order inside any comanda that contains it
      setComandas((prev) => prev.map((c) => ({
        ...c,
        orders: (c.orders || []).map((o) => o.id === orderId ? updated : o),
      })))
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
    askConfirm({
      title: 'Excluir produto?',
      description: 'Esta ação é permanente. O produto será removido do cardápio.',
      confirmLabel: 'Excluir',
      destructive: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' })
          setProducts((p) => p.filter((x) => x.id !== id))
          toast.success('Produto excluído')
        } catch (e) { toast.error(e.message) }
      },
    })
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
    askConfirm({
      title: 'Excluir categoria?',
      description: 'Esta ação é permanente.',
      confirmLabel: 'Excluir',
      destructive: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
          setCategories((p) => p.filter((x) => x.id !== id))
          toast.success('Categoria excluída')
        } catch (e) { toast.error(e.message) }
      },
    })
  }

  const saveBanner = async (b) => {
    try {
      if (b.id) {
        const u = await apiFetch(`/api/admin/banners/${b.id}`, { method: 'PATCH', body: JSON.stringify(b) })
        setBanners((prev) => prev.map((x) => x.id === u.id ? u : x).map((x) => u.active && x.id !== u.id ? { ...x, active: false } : x))
      } else {
        const c = await apiFetch('/api/admin/banners', { method: 'POST', body: JSON.stringify(b) })
        setBanners((prev) => (c.active ? prev.map((x) => ({ ...x, active: false })) : prev).concat(c))
      }
      toast.success('Banner salvo'); setEditBanner(null)
    } catch (e) { toast.error(e.message) }
  }
  const deleteBanner = async (id) => {
    askConfirm({
      title: 'Excluir banner?',
      description: 'Esta ação é permanente.',
      confirmLabel: 'Excluir',
      destructive: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin/banners/${id}`, { method: 'DELETE' })
          setBanners((p) => p.filter((x) => x.id !== id))
          toast.success('Banner excluído')
        } catch (e) { toast.error(e.message) }
      },
    })
  }

  const savePromo = async (p) => {
    try {
      if (p.id) {
        const u = await apiFetch(`/api/admin/promotions/${p.id}`, { method: 'PATCH', body: JSON.stringify(p) })
        setPromotions((prev) => prev.map((x) => x.id === u.id ? u : x))
      } else {
        const c = await apiFetch('/api/admin/promotions', { method: 'POST', body: JSON.stringify(p) })
        setPromotions((prev) => [...prev, c])
      }
      toast.success('Promoção salva'); setEditPromo(null)
    } catch (e) { toast.error(e.message) }
  }
  const deletePromo = async (id) => {
    askConfirm({
      title: 'Excluir promoção?',
      description: 'Esta ação é permanente.',
      confirmLabel: 'Excluir',
      destructive: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin/promotions/${id}`, { method: 'DELETE' })
          setPromotions((p) => p.filter((x) => x.id !== id))
          toast.success('Promoção excluída')
        } catch (e) { toast.error(e.message) }
      },
    })
  }

  const toggleFeatured = async (prod) => {
    try {
      const updated = await apiFetch(`/api/admin/products/${prod.id}`, { method: 'PATCH', body: JSON.stringify({ featured: !prod.featured, featuredOrder: prod.featuredOrder || 1 }) })
      setProducts((prev) => prev.map((x) => x.id === updated.id ? updated : x))
      toast.success(updated.featured ? 'Adicionado aos destaques' : 'Removido dos destaques')
    } catch (e) { toast.error(e.message) }
  }

  const deleteOrder = async (orderId) => {
    askConfirm({
      title: 'Apagar este pedido?',
      description: 'Esta ação é PERMANENTE. O pedido será removido dos relatórios e histórico.',
      confirmLabel: 'Apagar pedido',
      destructive: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' })
          setOrders((prev) => prev.filter((o) => o.id !== orderId))
          toast.success('Pedido excluído')
        } catch (e) { toast.error(e.message) }
      },
    })
  }

  const confirmPix = async (orderId) => {
    askConfirm({
      title: 'Confirmar pagamento PIX?',
      description: 'Use apenas se confirmou o recebimento fora do sistema. Em provedor real, isso é feito automaticamente via webhook.',
      confirmLabel: 'Confirmar pagamento',
      destructive: false,
      onConfirm: async () => {
        try {
          const updated = await apiFetch(`/api/orders/${orderId}/pix-confirm`, { method: 'POST', body: JSON.stringify({}) })
          setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o))
          toast.success('Pagamento PIX confirmado')
        } catch (e) { toast.error(e.message) }
      },
    })
  }

  const deleteComanda = async (comandaId) => {
    askConfirm({
      title: 'Apagar esta comanda?',
      description: 'Apenas comandas FECHADAS/PAGAS podem ser apagadas. A comanda e todos os pedidos vinculados serão removidos permanentemente.',
      confirmLabel: 'Apagar comanda',
      destructive: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin/comandas/${comandaId}`, { method: 'DELETE' })
          setComandas((prev) => prev.filter((c) => c.id !== comandaId))
          // Also remove orders linked to this comanda from local state
          setOrders((prev) => prev.filter((o) => o.comandaId !== comandaId))
          toast.success('Comanda excluída')
        } catch (e) { toast.error(e.message) }
      },
    })
  }

  const saveDeliveryStatus = async (orderId, deliveryStatus, deliveryObservation, paymentConfirmed) => {
    try {
      const updated = await apiFetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ deliveryStatus, deliveryObservation, paymentConfirmed }),
      })
      setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o))
      toast.success(`Entrega marcada como "${deliveryStatus}"`)
      setDeliveryDialog(null)
    } catch (e) { toast.error(e.message) }
  }

  const updatePayment = async (orderId, paymentStatus, paymentMethod) => {
    try {
      const updated = await apiFetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentStatus, paymentMethod }),
      })
      setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o))
      toast.success('Pagamento atualizado')
    } catch (e) { toast.error(e.message) }
  }

  const savePaymentMethodsConfig = async (methods) => {
    try {
      await apiFetch('/api/admin/payment-methods', { method: 'PATCH', body: JSON.stringify({ deliveryMethods: methods }) })
      setPaymentMethodsConfig(methods)
      toast.success('Métodos de pagamento atualizados')
    } catch (e) { toast.error(e.message) }
  }

  const saveUser = async (u) => {
    try {
      if (u.id) {
        const upd = await apiFetch(`/api/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify(u) })
        setUsers((prev) => prev.map((x) => x.id === upd.id ? upd : x))
      } else {
        const cr = await apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(u) })
        setUsers((prev) => [...prev, cr])
      }
      toast.success('Usuário salvo')
      return true
    } catch (e) { toast.error(e.message); return false }
  }

  const deleteUser = async (id) => {
    const target = users.find((u) => u.id === id)
    askConfirm({
      title: 'Excluir usuário?',
      description: target ? `O usuário "${target.name || target.email}" será removido permanentemente do sistema.` : 'Esta ação é permanente.',
      confirmLabel: 'Excluir usuário',
      destructive: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
          setUsers((prev) => prev.filter((x) => x.id !== id))
          toast.success('Usuário excluído')
        } catch (e) { toast.error(e.message) }
      },
    })
  }

  if (!user) return null

  const TERMINAL_STATUSES = ['Finalizado', 'Não Entregue', 'Cancelado']
  const applyFilters = (list) => list.filter((o) => {
    if (filters.type && o.type !== filters.type) return false
    if (filters.status && o.status !== filters.status) return false
    if (filters.minValue && o.total < Number(filters.minValue)) return false
    if (filters.maxValue && o.total > Number(filters.maxValue)) return false
    if (filters.table && String(o.table || '') !== filters.table) return false
    if (filters.address && !(o.address?.street || '').toLowerCase().includes(filters.address.toLowerCase())) return false
    if (filters.dateFrom && new Date(o.createdAt) < new Date(filters.dateFrom)) return false
    if (filters.dateTo && new Date(o.createdAt) > new Date(filters.dateTo + 'T23:59:59')) return false
    if (filters.paymentStatus && o.payment?.status !== filters.paymentStatus) return false
    if (filters.paymentMethod && o.payment?.method !== filters.paymentMethod) return false
    if (filters.deliveryStatus && o.delivery?.status !== filters.deliveryStatus) return false
    return true
  })

  const deliveryOrders = applyFilters(orders.filter((o) => o.type === 'delivery' && !TERMINAL_STATUSES.includes(o.status)))
  const localOrders = applyFilters(orders.filter((o) => o.type === 'local' && !TERMINAL_STATUSES.includes(o.status)))
  const historyOrders = applyFilters(orders.filter((o) => TERMINAL_STATUSES.includes(o.status)))
  const openComandas = comandas.filter((c) => c.status === 'aberta')
  const awaitingPay = comandas.filter((c) => c.status === 'aguardando_pagamento')
  const closedComandas = comandas.filter((c) => c.status === 'paga' || c.status === 'fechada')

  const NavList = ({ onSelect }) => (
    <div className="space-y-1">
      {allowedTabs.map(({ value, label, Icon }) => {
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
                  <BrandLogo size="sm" />
                  <div><div className="text-sm font-bold">{branding.restaurantName}</div><div className="text-[10px] uppercase tracking-wider text-amber-400">Admin</div></div>
                </div>
                <NavList onSelect={() => setMenuOpen(false)} />
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo size="sm" />
              <div className="leading-tight"><div className="text-sm font-bold">{branding.restaurantName}</div><div className="text-[10px] uppercase tracking-wider text-amber-400">Admin</div></div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Sheet open={notifBellOpen} onOpenChange={async (open) => {
              setNotifBellOpen(open)
              if (open) {
                // Mark all as read when bell is opened
                try {
                  await apiFetch('/api/admin/notifications', { method: 'POST', body: JSON.stringify({ action: 'read-all' }) })
                  // Update local state optimistically
                  setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
                } catch {}
              }
            }}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative border-white/10 bg-white/5">
                  <Bell className="h-4 w-4" />
                  {notifications.filter((n) => !n.isRead).length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {notifications.filter((n) => !n.isRead).length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full border-white/10 bg-zinc-950 sm:max-w-md overflow-y-auto">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-400" />
                    <h2 className="text-lg font-bold">Notificações</h2>
                  </div>
                  {notifications.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20">
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Limpar tudo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-white/10 bg-zinc-900">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Limpar todas as notificações?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá excluir <strong>permanentemente</strong> todas as {notifications.length} {notifications.length === 1 ? 'notificação' : 'notificações'} desta área. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-white/10">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-500 text-white hover:bg-red-600"
                            onClick={async () => {
                              try {
                                const res = await apiFetch('/api/admin/notifications', { method: 'POST', body: JSON.stringify({ action: 'clear-all' }) })
                                setNotifications([])
                                beepedIdsRef.current = new Set()
                                toast.success(`${res?.deletedCount || 0} ${(res?.deletedCount || 0) === 1 ? 'notificação removida' : 'notificações removidas'}`)
                              } catch (e) {
                                toast.error('Erro ao limpar: ' + (e.message || ''))
                              }
                            }}
                          >
                            Sim, limpar tudo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((n) => (
                      <div key={n.id} className={`rounded-lg border p-3 text-sm ${n.isRead ? 'border-white/5 bg-white/5 opacity-60' : n.type === 'payment_request' ? 'border-amber-500/40 bg-amber-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium leading-tight">{n.title}</div>
                            {n.message && <div className="mt-0.5 text-xs text-muted-foreground">{n.message}</div>}
                          </div>
                          {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleString('pt-BR')}</div>
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
          {/* Search + filters */}
          {['local', 'delivery', 'comandas', 'history'].includes(tab) && (
            <>
              <div className="mb-3 relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome do cliente..." className="border-white/10 bg-white/5 pl-9" />
              </div>
              {['local', 'delivery', 'history'].includes(tab) && (
                <FiltersBar filters={filters} setFilters={setFilters} tab={tab} statuses={tab === 'delivery' ? DELIVERY_STATUSES : tab === 'history' ? [...new Set([...LOCAL_STATUSES, ...DELIVERY_STATUSES, 'Não Entregue', 'Cancelado'])] : LOCAL_STATUSES} />
              )}
            </>
          )}

          {tab === 'dashboard' && isOwner && <DashboardTab stats={stats} orders={orders} />}
          {tab === 'comandas' && (
            <ComandasTab
              open={openComandas} awaiting={awaitingPay} closed={closedComandas}
              onPayRequest={(c) => setPayDialog({ comanda: c, method: c.paymentMethod || 'Dinheiro' })}
              onAction={comandaAction}
              onStatusChange={changeStatus}
              onDeleteComanda={deleteComanda}
              isOwner={isOwner}
              loading={loading}
            />
          )}
          {tab === 'local' && <OrdersList orders={localOrders} statuses={LOCAL_STATUSES} onStatusChange={changeStatus} loading={loading} isOwner={isOwner} onDelete={deleteOrder} onUpdatePayment={updatePayment} onConfirmPix={confirmPix} />}
          {tab === 'delivery' && <OrdersList orders={deliveryOrders} statuses={DELIVERY_STATUSES} onStatusChange={changeStatus} loading={loading} isOwner={isOwner} onDelete={deleteOrder} onUpdatePayment={updatePayment} onConfirmPix={confirmPix} isDriver={isDriver} onDeliveryAction={(o) => setDeliveryDialog({ order: o, status: 'Entregue', observation: '' })} />}
          {tab === 'history' && isOwner && <OrdersList orders={historyOrders} statuses={[...LOCAL_STATUSES, ...DELIVERY_STATUSES]} onStatusChange={changeStatus} loading={loading} isOwner={isOwner} onDelete={deleteOrder} onUpdatePayment={updatePayment} history />}
          {tab === 'products' && isOwner && (
            <ProductsTab products={products} categories={categories} onEdit={setEditProduct} onDelete={deleteProduct} onNew={() => setEditProduct({ name: '', description: '', price: 0, image: '', categoryId: categories[0]?.id, active: true })} />
          )}
          {tab === 'categories' && isOwner && (
            <CategoriesTab categories={categories} onEdit={setEditCategory} onDelete={deleteCategory} onNew={() => setEditCategory({ name: '', icon: '🍽️', order: categories.length + 1 })} />
          )}
          {tab === 'users' && isOwner && <UsersTab users={users} orders={orders} onSave={saveUser} onDelete={deleteUser} />}
          {tab === 'settings' && isOwner && <SettingsTab />}
          {tab === 'content' && isOwner && (
            <ContentTab
              banners={banners} promotions={promotions} products={products}
              onEditBanner={setEditBanner} onDeleteBanner={deleteBanner}
              onEditPromo={setEditPromo} onDeletePromo={deletePromo}
              onToggleFeatured={toggleFeatured}
            />
          )}
          {tab === 'payments' && isOwner && <PaymentsTab methods={paymentMethodsConfig} onSave={savePaymentMethodsConfig} />}
          {tab === 'theme' && isOwner && <ThemeTab />}
          {tab === 'footer' && isOwner && <FooterTab />}
          {tab === 'about' && isOwner && <AboutTab />}
        </div>
      </div>

      <DeliveryActionDialog
        dialog={deliveryDialog}
        onClose={(updated) => setDeliveryDialog(updated || null)}
        onConfirm={saveDeliveryStatus}
      />

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
            <div><ImageField label="Imagem" value={editProduct.image} onChange={(v) => setEditProduct({ ...editProduct, image: v })} /></div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-3"><Label>Ativo</Label><Switch checked={editProduct.active} onCheckedChange={(v) => setEditProduct({ ...editProduct, active: v })} /></div>
            {/* Add-ons editor */}
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-sm font-semibold">Adicionais (opcionais com preço extra)</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 border-white/10" onClick={() => setEditProduct({ ...editProduct, addOns: [...(editProduct.addOns || []), { id: crypto.randomUUID(), name: '', price: 0, active: true }] })}>
                  <Plus className="mr-1 h-3 w-3" /> Adicional
                </Button>
              </div>
              {(editProduct.addOns || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem adicionais. Clique em &ldquo;+ Adicional&rdquo; para criar.</p>
              ) : (
                <div className="space-y-2">
                  {(editProduct.addOns || []).map((a, idx) => (
                    <div key={a.id || idx} className="flex items-center gap-2 rounded-md border border-white/5 bg-white/5 p-2">
                      <Input
                        placeholder="Ex.: Queijo extra"
                        value={a.name}
                        onChange={(e) => {
                          const next = [...editProduct.addOns]
                          next[idx] = { ...next[idx], name: e.target.value }
                          setEditProduct({ ...editProduct, addOns: next })
                        }}
                        className="h-8 flex-1 border-white/10 bg-black/20 text-sm"
                      />
                      <div className="relative w-28">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="0.10"
                          value={a.price}
                          onChange={(e) => {
                            const next = [...editProduct.addOns]
                            next[idx] = { ...next[idx], price: Number(e.target.value) }
                            setEditProduct({ ...editProduct, addOns: next })
                          }}
                          className="h-8 border-white/10 bg-black/20 pl-7 text-sm"
                        />
                      </div>
                      <Switch checked={a.active !== false} onCheckedChange={(v) => {
                        const next = [...editProduct.addOns]
                        next[idx] = { ...next[idx], active: v }
                        setEditProduct({ ...editProduct, addOns: next })
                      }} />
                      <Button type="button" size="sm" variant="outline" className="h-8 w-8 border-red-500/30 bg-red-500/10 p-0 text-red-300" onClick={() => {
                        setEditProduct({ ...editProduct, addOns: editProduct.addOns.filter((_, k) => k !== idx) })
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>)}
          <DialogFooter><Button variant="outline" onClick={() => setEditProduct(null)}>Cancelar</Button><Button onClick={() => saveProduct(editProduct)} className="bg-brand-gradient">Salvar</Button></DialogFooter>
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
          <DialogFooter><Button variant="outline" onClick={() => setEditCategory(null)}>Cancelar</Button><Button onClick={() => saveCategory(editCategory)} className="bg-brand-gradient">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editBanner} onOpenChange={(o) => !o && setEditBanner(null)}>
        <DialogContent className="border-white/10 bg-zinc-950">
          <DialogHeader><DialogTitle>{editBanner?.id ? 'Editar' : 'Novo'} banner</DialogTitle></DialogHeader>
          {editBanner && (<div className="space-y-3">
            <div><Label>Título</Label><Input value={editBanner.title} onChange={(e) => setEditBanner({ ...editBanner, title: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
            <div><Label>Subtítulo</Label><Input value={editBanner.subtitle} onChange={(e) => setEditBanner({ ...editBanner, subtitle: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
            <div><ImageField label="Imagem" value={editBanner.image} onChange={(v) => setEditBanner({ ...editBanner, image: v })} /></div>
            {editBanner.image && <img src={editBanner.image} alt="" className="h-32 w-full rounded-lg object-cover" />}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Texto do botão (opcional)</Label><Input value={editBanner.buttonText || ''} onChange={(e) => setEditBanner({ ...editBanner, buttonText: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
              <div><Label>Link do botão</Label><Input value={editBanner.buttonLink || ''} onChange={(e) => setEditBanner({ ...editBanner, buttonLink: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-3"><Label>Ativo (aparece no cardápio)</Label><Switch checked={!!editBanner.active} onCheckedChange={(v) => setEditBanner({ ...editBanner, active: v })} /></div>
            <p className="text-xs text-muted-foreground">⚠️ Apenas um banner pode estar ativo por vez. Ativar este desativa os outros.</p>
          </div>)}
          <DialogFooter><Button variant="outline" onClick={() => setEditBanner(null)}>Cancelar</Button><Button onClick={() => saveBanner(editBanner)} className="bg-brand-gradient">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPromo} onOpenChange={(o) => !o && setEditPromo(null)}>
        <DialogContent className="border-white/10 bg-zinc-950">
          <DialogHeader><DialogTitle>{editPromo?.id ? 'Editar' : 'Nova'} promoção</DialogTitle></DialogHeader>
          {editPromo && (<div className="space-y-3">
            <div><Label>Título</Label><Input value={editPromo.title} onChange={(e) => setEditPromo({ ...editPromo, title: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
            <div><Label>Descrição</Label><Textarea value={editPromo.description} onChange={(e) => setEditPromo({ ...editPromo, description: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
            <div><ImageField label="Imagem" value={editPromo.image} onChange={(v) => setEditPromo({ ...editPromo, image: v })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preço / texto (ex: R$ 59,90, 30% OFF)</Label><Input value={editPromo.priceText} onChange={(e) => setEditPromo({ ...editPromo, priceText: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
              <div><Label>Ordem</Label><Input type="number" value={editPromo.order} onChange={(e) => setEditPromo({ ...editPromo, order: e.target.value })} className="mt-1 border-white/10 bg-white/5" /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-3"><Label>Ativa</Label><Switch checked={!!editPromo.active} onCheckedChange={(v) => setEditPromo({ ...editPromo, active: v })} /></div>
          </div>)}
          <DialogFooter><Button variant="outline" onClick={() => setEditPromo(null)}>Cancelar</Button><Button onClick={() => savePromo(editPromo)} className="bg-brand-gradient">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reliable confirmation dialog (replaces window.confirm) */}
      <AlertDialog open={confirmState.open} onOpenChange={(open) => setConfirmState((s) => ({ ...s, open }))}>
        <AlertDialogContent className="border-white/10 bg-zinc-950 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
            {confirmState.description && (
              <AlertDialogDescription className="text-muted-foreground">{confirmState.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const fn = confirmState.onConfirm
                setConfirmState((s) => ({ ...s, open: false }))
                if (typeof fn === 'function') {
                  try { await fn() } catch (e) { toast.error(e?.message || 'Erro') }
                }
              }}
              className={confirmState.destructive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-brand-gradient'}
            >
              {confirmState.confirmLabel || 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

function ContentTab({ banners, promotions, products, onEditBanner, onDeleteBanner, onEditPromo, onDeletePromo, onToggleFeatured }) {
  const featuredProducts = products.filter((p) => p.featured)
  return (
    <Tabs defaultValue="banner">
      <TabsList className="mb-4 flex w-full flex-wrap bg-black/30">
        <TabsTrigger value="banner"><ImageIcon className="mr-1 h-4 w-4" /> Banner</TabsTrigger>
        <TabsTrigger value="promotions"><Flame className="mr-1 h-4 w-4" /> Promoções ({promotions.length})</TabsTrigger>
        <TabsTrigger value="featured"><Star className="mr-1 h-4 w-4" /> Destaques ({featuredProducts.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="banner">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Banners ({banners.length})</h3>
          <Button onClick={() => onEditBanner({ title: '', subtitle: '', image: '', buttonText: '', buttonLink: '', active: true })} className="bg-brand-gradient"><Plus className="mr-1 h-4 w-4" /> Novo banner</Button>
        </div>
        <div className="space-y-3">
          {banners.map((b) => (
            <Card key={b.id} className="overflow-hidden border-white/10 bg-zinc-900/60">
              <div className="relative h-40 overflow-hidden">
                {b.image && <img src={b.image} alt={b.title} className="h-full w-full object-cover opacity-60" />}
                <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/80 via-black/40 to-transparent p-5">
                  <h4 className="text-xl font-bold">{b.title}</h4>
                  <p className="text-sm text-muted-foreground">{b.subtitle}</p>
                </div>
                {b.active && <Badge className="absolute right-3 top-3 bg-emerald-500">Ativo</Badge>}
              </div>
              <div className="flex gap-2 border-t border-white/5 p-3">
                <Button size="sm" variant="outline" className="flex-1 border-white/10" onClick={() => onEditBanner(b)}><Pencil className="mr-1 h-3 w-3" /> Editar</Button>
                <Button size="sm" variant="outline" className="border-white/10 text-red-400" onClick={() => onDeleteBanner(b.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
          {banners.length === 0 && <Card className="border-white/10 bg-zinc-900/60"><CardContent className="p-10 text-center text-muted-foreground">Nenhum banner criado ainda.</CardContent></Card>}
        </div>
      </TabsContent>

      <TabsContent value="promotions">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Promoções ({promotions.length})</h3>
          <Button onClick={() => onEditPromo({ title: '', description: '', image: '', priceText: '', active: true, order: promotions.length + 1 })} className="bg-brand-gradient"><Plus className="mr-1 h-4 w-4" /> Nova promoção</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {promotions.map((p) => (
            <Card key={p.id} className="border-white/10 bg-zinc-900/60"><CardContent className="p-4">
              <div className="flex gap-3">
                {p.image && <img src={p.image} alt={p.title} className="h-20 w-20 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2"><div className="truncate font-semibold">{p.title}</div>{!p.active && <Badge variant="secondary" className="bg-red-500/20 text-red-300">Off</Badge>}</div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                  {p.priceText && <div className="mt-1 inline-flex rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-bold text-orange-300">{p.priceText}</div>}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 border-white/10" onClick={() => onEditPromo(p)}><Pencil className="mr-1 h-3 w-3" /> Editar</Button>
                <Button size="sm" variant="outline" className="border-white/10 text-red-400" onClick={() => onDeletePromo(p.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="featured">
        <h3 className="mb-2 text-lg font-semibold">Destaques da casa</h3>
        <p className="mb-4 text-sm text-muted-foreground">Marque os produtos que devem aparecer como destaque no topo do cardápio.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className={`border ${p.featured ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/10 bg-zinc-900/60'}`}><CardContent className="p-4">
              <div className="flex gap-3">
                {p.image && <img src={p.image} alt={p.name} className="h-16 w-16 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-amber-400 font-bold">{(p.price||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 p-2">
                <Label className="flex items-center gap-2 text-sm"><Star className={`h-4 w-4 ${p.featured ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} /> Em destaque</Label>
                <Switch checked={!!p.featured} onCheckedChange={() => onToggleFeatured(p)} />
              </div>
            </CardContent></Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
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

function ComandasTab({ open, awaiting, closed, onPayRequest, onAction, onStatusChange, onDeleteComanda, isOwner, loading }) {
  return (
    <Tabs defaultValue="awaiting">
      <TabsList className="mb-4 flex w-full flex-wrap bg-black/30">
        <TabsTrigger value="awaiting" className="data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300">🔔 Aguardando pagamento ({awaiting.length})</TabsTrigger>
        <TabsTrigger value="open">🟢 Abertas ({open.length})</TabsTrigger>
        <TabsTrigger value="closed">Fechadas ({closed.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="awaiting"><ComandaList list={awaiting} onPayRequest={onPayRequest} onAction={onAction} onStatusChange={onStatusChange} loading={loading} emptyMsg="Nenhuma conta aguardando pagamento" highlight /></TabsContent>
      <TabsContent value="open"><ComandaList list={open} onPayRequest={onPayRequest} onAction={onAction} onStatusChange={onStatusChange} loading={loading} emptyMsg="Nenhuma conta aberta" /></TabsContent>
      <TabsContent value="closed"><ComandaList list={closed} onPayRequest={onPayRequest} onAction={onAction} onStatusChange={onStatusChange} onDeleteComanda={isOwner ? onDeleteComanda : null} loading={loading} emptyMsg="Nenhuma conta fechada" /></TabsContent>
    </Tabs>
  )
}

function ComandaList({ list, onPayRequest, onAction, onStatusChange, onDeleteComanda, loading, emptyMsg, highlight }) {
  if (loading) return <p className="text-muted-foreground">Carregando...</p>
  if (!list.length) return <Card className="border-white/10 bg-zinc-900/60"><CardContent className="p-10 text-center text-muted-foreground">{emptyMsg}</CardContent></Card>
  return (
    <div className="space-y-3">
      {list.map((c) => {
        const s = COMANDA_LABELS[c.status] || { label: c.status, color: 'bg-white/10' }
        const isAwait = c.status === 'aguardando_pagamento'
        const ops = c.orders || []
        return (
          <Card key={c.id} className={`border bg-zinc-900/60 ${highlight && isAwait ? 'border-amber-500/50 shadow-lg shadow-amber-500/10 animate-pulse' : 'border-white/10'}`}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-amber-500/20 text-amber-300"><Utensils className="mr-1 h-3 w-3" /> Mesa {c.table}</Badge>
                    <Badge className={s.color}>{s.label}</Badge>
                    {c.userId && <Badge variant="outline" className="text-xs">👤 Cliente logado</Badge>}
                    {isAwait && c.paymentMethod && <Badge variant="outline" className="border-amber-500/50 text-amber-300">💳 {c.paymentMethod}</Badge>}
                  </div>
                  <div className="mt-2 font-semibold">Conta de: {c.customer?.name}</div>
                  <div className="text-xs text-muted-foreground">Aberta: {new Date(c.openedAt).toLocaleString('pt-BR')}</div>
                  {c.closedAt && <div className="text-xs text-muted-foreground">Fechada: {new Date(c.closedAt).toLocaleString('pt-BR')}</div>}
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total da conta</div>
                  <div className="text-2xl font-bold text-amber-400">{brl(c.total)}</div>
                  {onDeleteComanda && (c.status === 'paga' || c.status === 'fechada') && (
                    <Button size="sm" variant="outline" onClick={() => onDeleteComanda(c.id)} className="mt-2 h-7 border-red-500/30 bg-red-500/10 text-xs text-red-300 hover:bg-red-500/20">
                      <Trash2 className="mr-1 h-3 w-3" /> Apagar
                    </Button>
                  )}
                </div>
              </div>

              {/* Operational orders within this conta */}
              {ops.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedidos operacionais ({ops.length})</div>
                  {ops.map((o) => (
                    <div key={o.id} className="rounded-lg border border-white/5 bg-black/30 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold">#{o.id.slice(0, 8).toUpperCase()}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {o.items.map((it, k) => (
                              <div key={k} className="text-xs">
                                <span className="text-muted-foreground">{it.quantity}× </span>
                                <span>{it.name}</span>
                                {it.observations && <span className="italic text-amber-300/70"> — {it.observations}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-amber-400">{brl(o.total)}</span>
                          {onStatusChange && (
                            <Select value={o.status} onValueChange={(v) => onStatusChange(o.id, v)}>
                              <SelectTrigger className="h-7 border-white/10 bg-white/5 text-[10px] w-36"><SelectValue /></SelectTrigger>
                              <SelectContent>{LOCAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {isAwait && (
                  <Button onClick={() => onPayRequest(c)} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 min-w-[200px]"><CheckCircle2 className="mr-1 h-4 w-4" /> Confirmar pagamento da conta</Button>
                )}
                {c.status === 'aberta' && (
                  <Button onClick={() => onPayRequest(c)} variant="outline" className="flex-1 border-amber-500/30 text-amber-300 min-w-[180px]"><DollarSign className="mr-1 h-4 w-4" /> Receber pagamento</Button>
                )}
                {(c.status === 'paga' || c.status === 'fechada') && (
                  <Button onClick={() => onAction(c.id, 'reopen')} variant="outline" size="sm" className="border-white/10">Reabrir conta</Button>
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

function OrdersList({ orders, statuses, onStatusChange, loading, isOwner, isDriver, onDelete, onUpdatePayment, onDeliveryAction, onConfirmPix, history }) {
  if (loading) return <p className="text-muted-foreground">Carregando...</p>
  if (!orders.length) return <Card className="border-white/10 bg-zinc-900/60"><CardContent className="p-10 text-center text-muted-foreground">Nenhum pedido</CardContent></Card>
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Card key={o.id} className="border-white/10 bg-zinc-900/60"><CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold">#{o.id.slice(0,8).toUpperCase()}</span>{o.type==='local'?<Badge className="bg-amber-500/20 text-amber-300"><Utensils className="mr-1 h-3 w-3"/>Mesa {o.table}</Badge>:<Badge className="bg-orange-500/20 text-orange-300"><Bike className="mr-1 h-3 w-3"/>Delivery</Badge>}
                {o.payment?.status === 'Pago' ? <Badge className="bg-emerald-500/20 text-emerald-300">💰 Pago · {o.payment.method}</Badge> : <Badge variant="outline" className="border-amber-500/30 text-amber-300">⏳ Pgto Pendente</Badge>}
                {o.delivery?.status === 'Aguardando confirmação cliente' && <Badge className="bg-blue-500/20 text-blue-300">📦 Aguardando cliente confirmar</Badge>}
                {o.delivery?.status === 'Entregue' && <Badge className="bg-emerald-500/20 text-emerald-300">📦 Entregue {o.delivery?.deliveryConfirmationStatus === 'confirmado_cliente' ? '✅' : ''}</Badge>}
                {o.delivery?.status === 'Não Entregue' && <Badge className="bg-red-500/20 text-red-300">⚠️ Não Entregue</Badge>}
              </div>
              <div className="mt-1 text-sm font-medium">{o.customer?.name}{o.customer?.phone && <span className="text-muted-foreground"> · {o.customer.phone}</span>}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString('pt-BR')}</div>
              {o.type==='delivery' && o.address && <div className="mt-1 text-xs text-muted-foreground">📍 {o.address.street}, {o.address.number} · {o.address.district} · {o.address.city}</div>}
              {o.payment?.changeFor && o.payment?.method === 'cash_delivery' && (
                <div className="mt-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                  💵 <strong>Troco para R$ {Number(o.payment.changeFor).toFixed(2)}</strong>
                  {o.total && ` (devolver R$ ${(Number(o.payment.changeFor) - Number(o.total)).toFixed(2)})`}
                </div>
              )}
              {o.delivery?.notDeliveredReason && (
                <div className="mt-1 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-300">
                  ⚠️ <strong>Motivo da não entrega:</strong> {o.delivery.notDeliveredReason}
                </div>
              )}
              {o.delivery?.deliveredByDriverAt && !o.delivery?.confirmedByCustomerAt && o.delivery?.status === 'Aguardando confirmação cliente' && (
                <div className="mt-1 rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-300">
                  📦 Entregador marcou em {new Date(o.delivery.deliveredByDriverAt).toLocaleString('pt-BR')} — aguardando cliente confirmar
                </div>
              )}
              {o.delivery?.confirmedByCustomerAt && (
                <div className="mt-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                  ✅ Cliente confirmou recebimento em {new Date(o.delivery.confirmedByCustomerAt).toLocaleString('pt-BR')}
                </div>
              )}
              {o.delivery?.observation && !o.delivery?.notDeliveredReason && <div className="mt-1 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-300">💬 {o.delivery.observation}</div>}
            </div>
            <div className="w-full sm:w-auto sm:text-right">
              <div className="text-xl font-bold text-amber-400">{brl(o.total)}</div>
              {!isDriver && !history && (
                <Select value={o.status} onValueChange={(v) => onStatusChange(o.id, v)}>
                  <SelectTrigger className="mt-1 h-9 border-white/10 bg-white/5 text-xs w-full sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {history && <Badge className="mt-1 bg-zinc-500/20 text-zinc-300">{o.status}</Badge>}
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-white/5 bg-black/30 p-3">
            <div className="space-y-1">{o.items.map((i, k) => (
              <div key={k} className="text-sm">
                <div className="flex justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-muted-foreground">{i.quantity}× </span>
                    <span>{i.name}</span>
                  </div>
                  <span className="whitespace-nowrap text-muted-foreground">{brl(i.subtotal)}</span>
                </div>
                {Array.isArray(i.addOns) && i.addOns.length > 0 && (
                  <div className="ml-4 mt-0.5 text-[11px] text-emerald-300/90">
                    {i.addOns.map((a, ak) => <div key={ak}>+ {a.name} ({brl(a.price)})</div>)}
                  </div>
                )}
                {i.observations && <div className="ml-4 mt-0.5 text-[11px] italic text-amber-300/80">💬 {i.observations}</div>}
              </div>
            ))}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {isDriver && o.type === 'delivery' && !o.delivery?.status && (
              <Button onClick={() => onDeliveryAction(o)} size="sm" className="bg-gradient-to-r from-emerald-500 to-green-600"><CheckCircle2 className="mr-1 h-4 w-4"/>Marcar entrega</Button>
            )}
            {!isDriver && !history && o.payment?.method === 'pix' && o.payment?.status === 'aguardando_pagamento' && onConfirmPix && (
              <Button onClick={() => onConfirmPix(o.id)} size="sm" className="bg-gradient-to-r from-emerald-500 to-green-600"><QrCode className="mr-1 h-3 w-3"/>Confirmar PIX manualmente</Button>
            )}
            {!isDriver && o.payment?.status !== 'pago' && o.payment?.status !== 'Pago' && !history && (
              <Select value="" onValueChange={(v) => onUpdatePayment(o.id, 'Pago', v)}>
                <SelectTrigger className="h-8 border-emerald-500/30 bg-emerald-500/10 text-xs w-48 text-emerald-300"><SelectValue placeholder="💰 Marcar como pago (método)" /></SelectTrigger>
                <SelectContent>
                  {['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {isOwner && onDelete && (
              <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => onDelete(o.id)}><Trash2 className="mr-1 h-3 w-3"/>Apagar</Button>
            )}
          </div>
        </CardContent></Card>
      ))}
    </div>
  )
}

function ProductsTab({ products, categories, onEdit, onDelete, onNew }) {
  return (<>
    <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">Produtos ({products.length})</h3><Button onClick={onNew} className="bg-brand-gradient"><Plus className="mr-1 h-4 w-4" /> Novo</Button></div>
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
    <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">Categorias ({categories.length})</h3><Button onClick={onNew} className="bg-brand-gradient"><Plus className="mr-1 h-4 w-4" /> Nova</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{categories.map((c) => (
      <Card key={c.id} className="border-white/10 bg-zinc-900/60"><CardContent className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><div className="text-3xl">{c.icon}</div><div><div className="font-semibold">{c.name}</div><div className="text-xs text-muted-foreground">Ordem: {c.order}</div></div></div><div className="flex gap-1"><Button size="sm" variant="outline" className="border-white/10" onClick={() => onEdit(c)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="outline" className="border-white/10 text-red-400" onClick={() => onDelete(c.id)}><Trash2 className="h-3 w-3" /></Button></div></CardContent></Card>
    ))}</div>
  </>)
}

function UsersTab({ users, orders, onSave, onDelete }) {
  const [editing, setEditing] = useState(null)
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Usuários e Permissões ({users.length})</h3>
        <Button onClick={() => setEditing({ email: '', password: '', name: '', role: 'attendant' })} className="bg-brand-gradient"><Plus className="mr-1 h-4 w-4" /> Novo usuário</Button>
      </div>
      <Card className="border-white/10 bg-zinc-900/60"><CardContent className="p-0"><div className="divide-y divide-white/5">
        {users.map((u) => { const userOrders = orders.filter((o) => o.userId === u.id); const roleLabel = ROLES[u.role] || u.role; return (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="font-medium">{u.name}</div>
              <div className="truncate text-sm text-muted-foreground">{u.email}</div>
              {u.phone && <div className="truncate text-xs text-muted-foreground">📞 {u.phone}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{userOrders.length} pedidos</span>
              <Badge className={['owner_admin','admin'].includes(u.role) ? 'bg-amber-500 text-black' : u.role === 'attendant' ? 'bg-blue-500/20 text-blue-300' : u.role === 'delivery_driver' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10'}>{roleLabel}</Badge>
              {u.role !== 'customer' && (
                <Button variant="outline" size="sm" className="border-white/10" onClick={() => setEditing({ id: u.id, name: u.name, role: u.role, password: '' })}><Pencil className="h-3 w-3" /></Button>
              )}
              {u.email !== 'admin@sabor.com' && (
                <Button variant="outline" size="sm" className="border-red-500/30 text-red-400" onClick={() => onDelete(u.id)}><Trash2 className="h-3 w-3" /></Button>
              )}
            </div>
          </div>
        )})}
      </div></CardContent></Card>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-white/10 bg-zinc-950">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar' : 'Novo'} usuário</DialogTitle></DialogHeader>
          {editing && (<div className="space-y-3">
            {!editing.id && <div><Label>Email</Label><Input type="email" value={editing.email} onChange={(e) => setEditing({...editing, email: e.target.value})} className="mt-1 border-white/10 bg-white/5" /></div>}
            <div><Label>Nome</Label><Input value={editing.name || ''} onChange={(e) => setEditing({...editing, name: e.target.value})} className="mt-1 border-white/10 bg-white/5" /></div>
            <div><Label>Telefone</Label><Input type="tel" placeholder="(11) 99999-9999" value={editing.phone || ''} onChange={(e) => setEditing({...editing, phone: e.target.value})} className="mt-1 border-white/10 bg-white/5" /></div>
            <div><Label>Senha {editing.id && <span className="text-xs text-muted-foreground">(deixe em branco para manter)</span>}</Label><Input type="password" value={editing.password || ''} onChange={(e) => setEditing({...editing, password: e.target.value})} className="mt-1 border-white/10 bg-white/5" /></div>
            <div><Label>Papel</Label>
              <Select value={editing.role} onValueChange={(v) => setEditing({...editing, role: v})}>
                <SelectTrigger className="mt-1 border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner_admin">🛡️ Admin Dono (acesso total)</SelectItem>
                  <SelectItem value="attendant">👨‍🍳 Atendente (comandas e pedidos)</SelectItem>
                  <SelectItem value="delivery_driver">🛵 Entregador (apenas delivery)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={async () => { const ok = await onSave(editing); if (ok) setEditing(null) }} className="bg-brand-gradient">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PaymentsTab({ methods, onSave }) {
  const [local, setLocal] = useState(methods)
  const [pixCfg, setPixCfg] = useState(null)
  const [savingPix, setSavingPix] = useState(false)
  useEffect(() => { setLocal(methods) }, [methods])
  useEffect(() => {
    apiFetch('/api/admin/pix-config').then(setPixCfg).catch(() => {})
  }, [])
  const toggle = (i) => setLocal((prev) => prev.map((m, k) => k === i ? { ...m, active: !m.active } : m))
  const anyActive = (local || []).some((m) => m.active)
  const savePix = async () => {
    setSavingPix(true)
    try {
      const updated = await apiFetch('/api/admin/pix-config', { method: 'PATCH', body: JSON.stringify(pixCfg) })
      setPixCfg(updated)
      toast.success('Configuração PIX salva')
    } catch (e) { toast.error(e.message) }
    finally { setSavingPix(false) }
  }
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pagamentos do Delivery</h2>
        <p className="text-sm text-muted-foreground">Configure os métodos aceitos e a integração PIX.</p>
      </div>
      {!anyActive && (
        <Card className="border-red-500/30 bg-red-500/5"><CardContent className="p-4"><p className="text-sm text-red-300">⚠️ Nenhum método ativo — clientes não conseguirão finalizar pedidos delivery. Ative ao menos um método abaixo.</p></CardContent></Card>
      )}

      <Card className="border-white/10 bg-zinc-900/60">
        <CardContent className="p-0">
          <div className="border-b border-white/10 p-4">
            <h3 className="font-semibold">Métodos aceitos</h3>
            <p className="text-xs text-muted-foreground">Escolha quais aparecem no checkout de delivery.</p>
          </div>
          <div className="divide-y divide-white/5">
            {(local || []).map((m, i) => (
              <div key={m.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${m.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-muted-foreground'}`}>
                    {m.id === 'pix' && <QrCode className="h-5 w-5" />}
                    {(m.id === 'card_delivery' || m.id === 'credit_card' || m.id === 'debit_card') && <CreditCard className="h-5 w-5" />}
                    {(m.id === 'cash_delivery' || m.id === 'cash_on_delivery') && <Banknote className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.id === 'pix' ? 'Online — confirmação automática' : m.id.includes('card') ? 'Na entrega — maquininha com motoboy' : m.id.includes('cash') ? 'Na entrega — dinheiro' : (m.active ? 'Disponível no checkout' : 'Oculto para clientes')}
                    </div>
                  </div>
                </div>
                <Switch checked={m.active} onCheckedChange={() => toggle(i)} />
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-white/10 p-3">
            <Button onClick={() => onSave(local)} className="bg-brand-gradient">Salvar métodos</Button>
          </div>
        </CardContent>
      </Card>

      {/* PIX Configuration */}
      <Card className="border-white/10 bg-zinc-900/60">
        <CardContent className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><QrCode className="h-4 w-4 text-amber-400" /> Integração PIX</h3>
              <p className="text-xs text-muted-foreground">Dados usados para gerar BR Code e confirmar pagamentos. Em modo <Badge variant="outline" className="ml-1 border-amber-500/30 text-amber-300">stub</Badge> o QR é gerado localmente e a confirmação é manual/simulada.</p>
            </div>
          </div>
          {pixCfg ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs">Provedor</Label>
                <Select value={pixCfg.provider || 'stub'} onValueChange={(v) => setPixCfg({ ...pixCfg, provider: v })}>
                  <SelectTrigger className="mt-1 border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stub">🧪 Stub (testes / sem integração)</SelectItem>
                    <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                    <SelectItem value="efi">Efí / Gerencianet</SelectItem>
                    <SelectItem value="asaas">Asaas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ambiente</Label>
                <Select value={pixCfg.environment || 'sandbox'} onValueChange={(v) => setPixCfg({ ...pixCfg, environment: v })}>
                  <SelectTrigger className="mt-1 border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox / Teste</SelectItem>
                    <SelectItem value="production">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Chave PIX do recebedor</Label>
                <Input value={pixCfg.pixKey || ''} onChange={(e) => setPixCfg({ ...pixCfg, pixKey: e.target.value })} placeholder="email / CPF / CNPJ / telefone" className="mt-1 border-white/10 bg-white/5" />
              </div>
              <div>
                <Label className="text-xs">Tempo de expiração (minutos)</Label>
                <Input type="number" min={1} max={120} value={pixCfg.expirationMinutes || 15} onChange={(e) => setPixCfg({ ...pixCfg, expirationMinutes: Number(e.target.value) })} className="mt-1 border-white/10 bg-white/5" />
              </div>
              <div>
                <Label className="text-xs">Nome do recebedor</Label>
                <Input value={pixCfg.merchantName || ''} onChange={(e) => setPixCfg({ ...pixCfg, merchantName: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
              </div>
              <div>
                <Label className="text-xs">Cidade (sem acento, maiúsculas)</Label>
                <Input value={pixCfg.merchantCity || ''} onChange={(e) => setPixCfg({ ...pixCfg, merchantCity: e.target.value.toUpperCase() })} className="mt-1 border-white/10 bg-white/5" />
              </div>
              <div className="md:col-span-2 rounded-lg border border-white/5 bg-black/30 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credenciais do provedor (opcionais para stub)</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-xs">API Key / Access Token</Label>
                    <Input type="password" value={pixCfg.apiKey || ''} onChange={(e) => setPixCfg({ ...pixCfg, apiKey: e.target.value })} placeholder="••••••" className="mt-1 border-white/10 bg-white/5" />
                  </div>
                  <div>
                    <Label className="text-xs">Client ID</Label>
                    <Input value={pixCfg.clientId || ''} onChange={(e) => setPixCfg({ ...pixCfg, clientId: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                  </div>
                  <div>
                    <Label className="text-xs">Client Secret</Label>
                    <Input type="password" value={pixCfg.clientSecret || ''} onChange={(e) => setPixCfg({ ...pixCfg, clientSecret: e.target.value })} placeholder="••••••" className="mt-1 border-white/10 bg-white/5" />
                  </div>
                  <div>
                    <Label className="text-xs">Webhook URL</Label>
                    <Input value={pixCfg.webhookUrl || ''} onChange={(e) => setPixCfg({ ...pixCfg, webhookUrl: e.target.value })} placeholder="https://..." className="mt-1 border-white/10 bg-white/5" />
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button disabled={savingPix} onClick={savePix} className="bg-brand-gradient">{savingPix ? 'Salvando...' : 'Salvar PIX'}</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Carregando configuração...</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DeliveryActionDialog({ dialog, onClose, onConfirm }) {
  if (!dialog) return null
  const { order, status, observation, paymentConfirmed } = dialog
  const isOnDelivery = order?.payment?.method === 'card_delivery' || order?.payment?.method === 'cash_delivery'
  const alreadyPaid = order?.payment?.status === 'pago'
  // Step 1: payment confirmation (only for card/cash on delivery)
  // Step 2: delivery status
  const showStep2 = !isOnDelivery || alreadyPaid || paymentConfirmed === true
  const obsRequired = (status === 'Não Entregue') || (isOnDelivery && paymentConfirmed === false)
  return (
    <Dialog open={!!dialog} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-white/10 bg-zinc-950">
        <DialogHeader><DialogTitle>Confirmar entrega — Pedido #{order.id.slice(0,8).toUpperCase()}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Step 1: Payment confirmation (for card_delivery / cash_delivery only) */}
          {isOnDelivery && !alreadyPaid && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <Label className="mb-2 block text-sm font-semibold">1. Cliente efetuou o pagamento?</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Método: <strong>{order.payment.method === 'card_delivery' ? 'Cartão na entrega' : 'Dinheiro na entrega'}</strong>
                {order.payment.changeFor && ` · Troco para R$ ${order.payment.changeFor.toFixed(2)}`}
              </p>
              <RadioGroup value={paymentConfirmed === true ? 'yes' : paymentConfirmed === false ? 'no' : ''} onValueChange={(v) => onClose({ ...dialog, paymentConfirmed: v === 'yes' })} className="grid grid-cols-2 gap-2">
                <label className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${paymentConfirmed === true ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-white/10'}`}>
                  <RadioGroupItem value="yes" /> ✅ Cliente pagou
                </label>
                <label className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${paymentConfirmed === false ? 'border-red-500 bg-red-500/10 text-red-300' : 'border-white/10'}`}>
                  <RadioGroupItem value="no" /> ❌ Cliente não pagou
                </label>
              </RadioGroup>
              {paymentConfirmed === false && (
                <div className="mt-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
                  ⚠️ Pedido será marcado automaticamente como <strong>Não Entregue</strong>. Adicione observação abaixo.
                </div>
              )}
            </div>
          )}
          {/* Step 2: Delivery status — visible only after payment is OK or not required */}
          {showStep2 && (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <Label className="mb-2 block text-sm font-semibold">{isOnDelivery && !alreadyPaid ? '2. ' : ''}Status da entrega</Label>
              <RadioGroup value={status} onValueChange={(v) => onClose({ ...dialog, status: v })} className="space-y-2">
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${status === 'Entregue' ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10'}`}>
                  <RadioGroupItem value="Entregue" /><Check className="h-5 w-5 text-emerald-400" /><span>Entregue com sucesso</span>
                </label>
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${status === 'Não Entregue' ? 'border-red-500 bg-red-500/5' : 'border-white/10'}`}>
                  <RadioGroupItem value="Não Entregue" /><X className="h-5 w-5 text-red-400" /><span>Não Entregue</span>
                </label>
              </RadioGroup>
            </div>
          )}
          {(status === 'Não Entregue' || (isOnDelivery && paymentConfirmed === false)) && (
            <div>
              <Label className="mb-1 block">Motivo (obrigatório)</Label>
              <Textarea
                value={observation || ''}
                onChange={(e) => onClose({ ...dialog, observation: e.target.value })}
                placeholder="Ex.: cliente não estava no local, endereço incorreto, pedido recusado, cliente sem dinheiro..."
                className="min-h-24 border-white/10 bg-white/5"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>Cancelar</Button>
          <Button
            disabled={(isOnDelivery && !alreadyPaid && paymentConfirmed === undefined) || (obsRequired && !observation) || (showStep2 && !status && (paymentConfirmed !== false))}
            onClick={() => onConfirm(order.id, paymentConfirmed === false ? 'Não Entregue' : status, observation, paymentConfirmed)}
            className={(status === 'Entregue' && paymentConfirmed !== false) ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-orange-600'}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatCard({ icon, label, value, color }) {
  const c = { amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400', emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400', orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400', purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400' }[color]
  return <Card className={`border bg-gradient-to-br ${c}`}><CardContent className="p-4 sm:p-5"><div className="mb-2 h-6 w-6 sm:h-8 sm:w-8">{icon}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">{label}</div><div className="mt-1 text-lg font-bold sm:text-2xl">{value}</div></CardContent></Card>
}

function FooterTab() {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    apiFetch('/api/admin/footer').then(setForm).catch(() => setForm({}))
  }, [])
  const save = async () => {
    setSaving(true)
    try {
      const updated = await apiFetch('/api/admin/footer', { method: 'PATCH', body: JSON.stringify(form) })
      setForm(updated)
      toast.success('Rodapé salvo — aplicado imediatamente em todas as páginas')
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }
  if (!form) return <div className="py-10 text-center text-muted-foreground">Carregando...</div>

  const fields = [
    { key: 'address', label: 'Endereço', placeholder: 'Rua, número — bairro, cidade/UF', rows: 2 },
    { key: 'phone', label: 'Telefone', placeholder: '(11) 3000-0000' },
    { key: 'whatsapp', label: 'WhatsApp', placeholder: '(11) 99999-9999' },
    { key: 'openingHours', label: 'Horário de funcionamento', placeholder: 'Seg–Sex 11h–23h · Sáb–Dom 12h–00h', rows: 2 },
    { key: 'instagramUrl', label: 'Link do Instagram', placeholder: 'https://instagram.com/seu_perfil' },
    { key: 'deliveryNotice', label: 'Área atendida / aviso de delivery', placeholder: 'Entregamos em um raio de 5 km' },
    { key: 'copyrightText', label: 'Copyright', placeholder: '© Sabor & Arte · Todos os direitos reservados' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Rodapé do Site</h2>
        <p className="text-sm text-muted-foreground">Edite as informações exibidas no rodapé público (cardápio e páginas do cliente). Campos vazios são ocultados automaticamente.</p>
      </div>
      <Card className="border-white/10 bg-zinc-900/60">
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.rows ? 'md:col-span-2' : ''}>
              <Label className="text-xs">{f.label}</Label>
              {f.rows ? (
                <Textarea
                  rows={f.rows}
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="mt-1 border-white/10 bg-white/5"
                />
              ) : (
                <Input
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="mt-1 border-white/10 bg-white/5"
                />
              )}
            </div>
          ))}
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={save} disabled={saving} className="bg-brand-gradient">{saving ? 'Salvando...' : 'Salvar rodapé'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AboutTab() {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  useEffect(() => {
    apiFetch('/api/admin/about').then(setForm).catch(() => setForm({ title: '', subtitle: '', content: '' }))
  }, [])
  const save = async () => {
    setSaving(true)
    try {
      const updated = await apiFetch('/api/admin/about', { method: 'PATCH', body: JSON.stringify(form) })
      setForm(updated)
      toast.success('Página "Sobre" salva — visível em /sobre')
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }
  const insertSnippet = (snippet) => {
    setForm({ ...form, content: (form.content || '') + (form.content?.endsWith('\n') ? '' : '\n') + snippet + '\n' })
  }
  if (!form) return <div className="py-10 text-center text-muted-foreground">Carregando...</div>
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">📘 Sobre o Estabelecimento</h2>
          <p className="text-sm text-muted-foreground">Página pública editável: <code className="rounded bg-white/5 px-1">/sobre</code> · Suporta markdown leve (# título, **negrito**, *itálico*, - listas).</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)} className="border-white/10">
            {showPreview ? 'Ocultar preview' : 'Mostrar preview'}
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="bg-brand-gradient">{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </div>

      <Card className="border-white/10 bg-zinc-900/60">
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="text-xs">Título</Label>
            <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Subtítulo</Label>
            <Input value={form.subtitle || ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
          </div>
          <div className="md:col-span-2">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Label className="text-xs">Conteúdo</Label>
              <div className="ml-auto flex flex-wrap gap-1 text-[11px]">
                <Button type="button" size="sm" variant="outline" onClick={() => insertSnippet('# Título principal')} className="h-7 border-white/10 px-2">H1</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => insertSnippet('## Subtítulo')} className="h-7 border-white/10 px-2">H2</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => insertSnippet('### Seção')} className="h-7 border-white/10 px-2">H3</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => insertSnippet('**texto em negrito**')} className="h-7 border-white/10 px-2 font-bold">B</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => insertSnippet('*texto em itálico*')} className="h-7 border-white/10 px-2 italic">i</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => insertSnippet('- item da lista\n- outro item')} className="h-7 border-white/10 px-2">• Lista</Button>
              </div>
            </div>
            <Textarea
              rows={18}
              value={form.content || ''}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder={'# Nossa história\n\nFundado em **2015**...\n\n## Diferenciais\n\n- Ingredientes locais\n- Atendimento personalizado'}
              className="mt-1 border-white/10 bg-black/30 font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {showPreview && (
        <Card className="border-amber-500/30 bg-zinc-900/60">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
              <Info className="h-4 w-4 text-brand" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Preview</span>
            </div>
            <h1 className="text-3xl font-bold">{form.title}</h1>
            {form.subtitle && <p className="mt-1 text-muted-foreground">{form.subtitle}</p>}
            <div className="mt-4">
              <RichText source={form.content || ''} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


function SettingsTab() {
  const current = useBranding()
  const [form, setForm] = useState({ restaurantName: '', slogan: '', logoUrl: '' })
  const [saving, setSaving] = useState(false)
  const [loadedFromServer, setLoadedFromServer] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => {
      setForm({ restaurantName: d.restaurantName || '', slogan: d.slogan || '', logoUrl: d.logoUrl || '' })
      setLoadedFromServer(true)
    })
  }, [])

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 5MB)')
      return
    }
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', headers: { ...authHeaders() }, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro no upload')
      setForm({ ...form, logoUrl: data.url })
      toast.info('Logo enviada — clique em Salvar para aplicar')
    } catch (err) { toast.error(err.message) }
  }

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(form) })
      await refreshBranding()
      toast.success('Configurações salvas! Alterações aplicadas em todo o sistema.')
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const removeLogo = () => setForm({ ...form, logoUrl: '' })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Identidade da Marca</h2>
        <p className="text-sm text-muted-foreground">Personalize o nome, slogan e logo do seu restaurante. As alterações são refletidas em todo o sistema imediatamente.</p>
      </div>

      <Card className="border-white/10 bg-zinc-900/60">
        <CardContent className="p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Logo</h3>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl bg-brand-gradient shadow-lg shadow-amber-500/30">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ChefHat className="h-10 w-10 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10">
                <Upload className="h-4 w-4" />
                {form.logoUrl ? 'Substituir logo' : 'Enviar logo'}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              {form.logoUrl && (
                <Button variant="ghost" size="sm" onClick={removeLogo} className="text-red-400 hover:text-red-300">
                  <Trash2 className="mr-1 h-3 w-3" /> Remover logo
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG ou JPG · até 2MB · idealmente quadrada</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-zinc-900/60">
        <CardContent className="p-6 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Informações</h3>
          <div>
            <Label>Nome do restaurante *</Label>
            <Input
              value={form.restaurantName}
              onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
              placeholder="Ex.: Sabor & Arte"
              className="mt-1 border-white/10 bg-white/5"
            />
          </div>
          <div>
            <Label>Slogan (opcional)</Label>
            <Input
              value={form.slogan}
              onChange={(e) => setForm({ ...form, slogan: e.target.value })}
              placeholder="Ex.: gastronomia autoral"
              className="mt-1 border-white/10 bg-white/5"
            />
            <p className="mt-1 text-xs text-muted-foreground">Se deixar vazio, o slogan não será exibido.</p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">Prévia</h3>
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-2xl bg-brand-gradient">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ChefHat className="h-7 w-7 text-white" />
                </div>
              )}
            </div>
            <div>
              <div className="text-2xl font-bold">{form.restaurantName || 'Nome do restaurante'}</div>
              {form.slogan && <div className="text-xs uppercase tracking-[0.2em] text-amber-400">{form.slogan}</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={saving || !form.restaurantName} onClick={save} size="lg" className="bg-brand-gradient">
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  )
}

function FiltersBar({ filters, setFilters, tab, statuses }) {
  const [open, setOpen] = useState(false)
  const count = Object.values(filters).filter((v) => v).length
  const clear = () => setFilters({ type: '', status: '', minValue: '', maxValue: '', table: '', address: '', dateFrom: '', dateTo: '', paymentStatus: '', paymentMethod: '', deliveryStatus: '' })
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)} className="border-white/10">
          🔍 Filtros {count > 0 && <Badge className="ml-1 bg-amber-500 text-black text-[10px]">{count}</Badge>}
        </Button>
        {count > 0 && <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">Limpar</Button>}
      </div>
      {open && (
        <Card className="mt-2 border-white/10 bg-zinc-900/60"><CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
                <SelectTrigger className="mt-1 border-white/10 bg-white/5"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Data de</Label>
              <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
            </div>
            <div>
              <Label className="text-xs">Data até</Label>
              <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
            </div>
            <div>
              <Label className="text-xs">Valor mínimo (R$)</Label>
              <Input type="number" step="0.01" value={filters.minValue} onChange={(e) => setFilters({ ...filters, minValue: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
            </div>
            <div>
              <Label className="text-xs">Valor máximo (R$)</Label>
              <Input type="number" step="0.01" value={filters.maxValue} onChange={(e) => setFilters({ ...filters, maxValue: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
            </div>
            {tab === 'local' && (
              <div>
                <Label className="text-xs">Mesa</Label>
                <Input value={filters.table} onChange={(e) => setFilters({ ...filters, table: e.target.value })} placeholder="Ex.: 5" className="mt-1 border-white/10 bg-white/5" />
              </div>
            )}
            {tab === 'delivery' && (
              <>
                <div>
                  <Label className="text-xs">Endereço</Label>
                  <Input value={filters.address} onChange={(e) => setFilters({ ...filters, address: e.target.value })} placeholder="Rua, avenida..." className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div>
                  <Label className="text-xs">Status entrega</Label>
                  <Select value={filters.deliveryStatus || 'all'} onValueChange={(v) => setFilters({ ...filters, deliveryStatus: v === 'all' ? '' : v })}>
                    <SelectTrigger className="mt-1 border-white/10 bg-white/5"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="Entregue">Entregue</SelectItem><SelectItem value="Não Entregue">Não Entregue</SelectItem></SelectContent>
                  </Select>
                </div>
              </>
            )}
            {tab === 'history' && (
              <>
                <div>
                  <Label className="text-xs">Tipo de venda</Label>
                  <Select value={filters.type || 'all'} onValueChange={(v) => setFilters({ ...filters, type: v === 'all' ? '' : v })}>
                    <SelectTrigger className="mt-1 border-white/10 bg-white/5"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="local">🍽️ Local</SelectItem>
                      <SelectItem value="delivery">🛵 Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status do pagamento</Label>
                  <Select value={filters.paymentStatus || 'all'} onValueChange={(v) => setFilters({ ...filters, paymentStatus: v === 'all' ? '' : v })}>
                    <SelectTrigger className="mt-1 border-white/10 bg-white/5"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="Pago">Pago</SelectItem><SelectItem value="Pendente">Pendente</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Método de pagamento</Label>
                  <Select value={filters.paymentMethod || 'all'} onValueChange={(v) => setFilters({ ...filters, paymentMethod: v === 'all' ? '' : v })}>
                    <SelectTrigger className="mt-1 border-white/10 bg-white/5"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {['Pix', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Pagar com Dinheiro na Entrega'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}

// ============ Theme Tab ============
function ThemeTab() {
  const { theme, setTheme, refresh, resolvedMode } = useTheme()
  const [local, setLocal] = useState(theme)
  const [saving, setSaving] = useState(false)
  useEffect(() => { setLocal(theme) }, [theme])

  const activePalette = local?.[resolvedMode] || local?.dark
  const updatePalette = (key, value) => {
    const mode = resolvedMode === 'light' ? 'light' : 'dark'
    setLocal((prev) => {
      const next = { ...prev, [mode]: { ...(prev[mode] || {}), [key]: value } }
      setTheme(next) // apply live
      return next
    })
  }
  const updateBrand = (key, value) => {
    setLocal((prev) => {
      const next = { ...prev, brand: { ...(prev.brand || {}), [key]: value } }
      setTheme(next)
      return next
    })
  }
  const updateMode = (v) => {
    setLocal((prev) => {
      const next = { ...prev, mode: v }
      setTheme(next)
      return next
    })
  }
  const save = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/admin/theme', { method: 'PATCH', body: JSON.stringify({ mode: local.mode, brand: local.brand, dark: local.dark, light: local.light }) })
      await refresh()
      toast.success('Tema salvo e aplicado')
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }
  const reset = () => {
    const DEFAULTS = DEFAULT_THEME
    setLocal(DEFAULTS)
    setTheme(DEFAULTS)
  }

  const paletteFields = [
    { key: 'background', label: 'Fundo' },
    { key: 'foreground', label: 'Texto' },
    { key: 'card', label: 'Card' },
    { key: 'border', label: 'Borda' },
    { key: 'primary', label: 'Primária' },
    { key: 'primaryForeground', label: 'Texto primária' },
    { key: 'secondary', label: 'Secundária' },
    { key: 'secondaryForeground', label: 'Texto secundária' },
    { key: 'accent', label: 'Destaque' },
    { key: 'muted', label: 'Muted' },
    { key: 'mutedForeground', label: 'Texto muted' },
    { key: 'destructive', label: 'Destrutiva' },
  ]

  // Key contrast checks (text on background, primary on primary-fg)
  const checks = [
    { fg: activePalette?.foreground, bg: activePalette?.background, label: 'Texto × Fundo' },
    { fg: activePalette?.primaryForeground, bg: activePalette?.primary, label: 'Texto primária × Primária' },
    { fg: activePalette?.foreground, bg: activePalette?.card, label: 'Texto × Card' },
    { fg: activePalette?.mutedForeground, bg: activePalette?.background, label: 'Muted × Fundo' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">🎨 Personalização do Tema</h2>
          <p className="text-sm text-muted-foreground">Ajuste as cores do sistema. Alterações são aplicadas em tempo real — salve para persistir.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} className="border-white/10">Restaurar padrão</Button>
          <Button size="sm" onClick={save} disabled={saving} className="bg-brand-gradient">{saving ? 'Salvando...' : 'Salvar tema'}</Button>
        </div>
      </div>

      {/* Mode selector */}
      <Card className="border-white/10 bg-zinc-900/60">
        <CardContent className="p-4">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Modo</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { v: 'light', label: 'Claro', Icon: Sun },
              { v: 'dark', label: 'Escuro', Icon: Moon },
              { v: 'auto', label: 'Automático', Icon: Monitor },
            ].map(({ v, label, Icon }) => (
              <button
                key={v}
                onClick={() => updateMode(v)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition ${local?.mode === v ? 'border-brand bg-brand-soft text-foreground' : 'border-white/10 hover:border-white/20 text-muted-foreground'}`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Modo efetivo agora: <Badge variant="outline" className="border-white/10">{resolvedMode}</Badge>
            {local?.mode === 'auto' && ' (segue o sistema operacional do cliente)'}
          </div>
        </CardContent>
      </Card>

      {/* Brand gradient */}
      <Card className="border-white/10 bg-zinc-900/60">
        <CardContent className="p-4">
          <h3 className="mb-3 font-semibold">Gradiente da marca</h3>
          <p className="mb-3 text-xs text-muted-foreground">Usado em botões de destaque, hero e elementos principais.</p>
          <div className="grid gap-3 md:grid-cols-3">
            <ColorField label="Cor inicial" value={local?.brand?.from} onChange={(v) => updateBrand('from', v)} />
            <ColorField label="Cor final" value={local?.brand?.to} onChange={(v) => updateBrand('to', v)} />
            <div className="flex items-end">
              <div className="h-10 w-full rounded-lg bg-brand-gradient shadow-inner" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Palette editor + preview */}
      <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
        <Card className="border-white/10 bg-zinc-900/60">
          <CardContent className="p-4">
            <h3 className="mb-1 font-semibold">Paleta — Modo {resolvedMode === 'light' ? 'Claro' : 'Escuro'}</h3>
            <p className="mb-3 text-xs text-muted-foreground">Edite clicando no quadrado ou digitando HEX.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {paletteFields.map((f) => (
                <ColorField key={f.key} label={f.label} value={activePalette?.[f.key]} onChange={(v) => updatePalette(f.key, v)} />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Preview */}
          <Card className="border-white/10 bg-zinc-900/60">
            <CardContent className="p-4">
              <h3 className="mb-3 font-semibold">Pré-visualização</h3>
              <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-brand-gradient" />
                  <div>
                    <div className="text-sm font-bold text-foreground">Sabor & Arte</div>
                    <div className="text-[10px] text-muted-foreground">Restaurante</div>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-sm font-semibold text-foreground">Burger Clássico</div>
                  <div className="text-xs text-muted-foreground">Hambúrguer artesanal</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-bold text-brand">R$ 38,90</span>
                    <Button size="sm" className="bg-brand-gradient text-white">Adicionar</Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-primary text-primary-foreground">Primária</Button>
                  <Button size="sm" variant="secondary">Secundária</Button>
                  <Button size="sm" variant="outline">Outline</Button>
                  <Button size="sm" variant="destructive">Destrutiva</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contrast checks */}
          <Card className="border-white/10 bg-zinc-900/60">
            <CardContent className="p-4">
              <h3 className="mb-2 font-semibold">Acessibilidade (WCAG)</h3>
              <p className="mb-3 text-xs text-muted-foreground">Contraste mínimo recomendado: 4.5:1 (AA) para texto normal.</p>
              <div className="space-y-2">
                {checks.map((c, i) => {
                  const ratio = contrastRatio(c.fg || '#000', c.bg || '#fff')
                  const lbl = wcagLabel(ratio)
                  return (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          <span className="inline-block h-5 w-5 rounded-l border border-white/10" style={{ background: c.bg }} />
                          <span className="inline-block h-5 w-5 rounded-r border-y border-r border-white/10" style={{ background: c.fg }} />
                        </div>
                        <span className="text-xs">{c.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs tabular-nums text-muted-foreground">{ratio.toFixed(2)}:1</span>
                        <Badge variant="outline" className={`border-white/10 ${lbl.color}`}>{lbl.label}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }) {
  const safe = (value || '#000000').toLowerCase()
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
          style={{ background: 'transparent' }}
        />
        <Input
          value={safe}
          onChange={(e) => {
            const v = e.target.value
            if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) onChange(v.startsWith('#') ? v : '#' + v)
          }}
          className="h-7 border-0 bg-transparent p-0 font-mono text-xs uppercase"
        />
      </div>
    </div>
  )
}

export default AdminPage
