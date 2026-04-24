import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import QRCode from 'qrcode'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'restaurant_app'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

let cachedClient = null
async function getDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URL)
    await cachedClient.connect()
  }
  return cachedClient.db(DB_NAME)
}

// --- Seed data ---
const SEED_CATEGORIES = [
  { id: 'cat-lanches', name: 'Lanches', slug: 'lanches', icon: '🍔', order: 1 },
  { id: 'cat-pizzas', name: 'Pizzas', slug: 'pizzas', icon: '🍕', order: 2 },
  { id: 'cat-bebidas', name: 'Bebidas', slug: 'bebidas', icon: '🥤', order: 3 },
  { id: 'cat-sobremesas', name: 'Sobremesas', slug: 'sobremesas', icon: '🍰', order: 4 },
  { id: 'cat-acompanhamentos', name: 'Acompanhamentos', slug: 'acompanhamentos', icon: '🍟', order: 5 },
]

const SEED_PRODUCTS = [
  { id: 'p-burger-classic', name: 'Burger Clássico', description: 'Hambúrguer artesanal 180g, queijo cheddar, alface, tomate, cebola caramelizada e molho da casa no pão brioche.', price: 38.9, image: 'https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?w=800&q=80', categoryId: 'cat-lanches', active: true },
  { id: 'p-burger-bbq', name: 'Burger BBQ Bacon', description: 'Blend bovino 200g, bacon crocante, cheddar inglês, cebola roxa e molho barbecue defumado.', price: 44.9, image: 'https://images.unsplash.com/photo-1648146299178-566fbf8522d1?w=800&q=80', categoryId: 'cat-lanches', active: true },
  { id: 'p-pizza-margherita', name: 'Pizza Margherita', description: 'Molho de tomate San Marzano, mussarela de búfala, manjericão fresco e azeite extra virgem.', price: 52.0, image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=800&q=80', categoryId: 'cat-pizzas', active: true },
  { id: 'p-pizza-pepperoni', name: 'Pizza Pepperoni', description: 'Mussarela, fatias generosas de pepperoni italiano e orégano em massa artesanal.', price: 58.0, image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=800&q=80', categoryId: 'cat-pizzas', active: true },
  { id: 'p-suco-laranja', name: 'Suco de Laranja', description: 'Suco natural 500ml, feito na hora com laranjas frescas. Sem açúcar adicionado.', price: 12.0, image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&q=80', categoryId: 'cat-bebidas', active: true },
  { id: 'p-vinho-taca', name: 'Taça de Vinho Tinto', description: 'Seleção especial da casa — uva Cabernet Sauvignon, servida em taça de cristal.', price: 28.0, image: 'https://images.unsplash.com/photo-1648146299076-ec0c5e5ead00?w=800&q=80', categoryId: 'cat-bebidas', active: true },
  { id: 'p-sobremesa-chocolate', name: 'Petit Gateau de Chocolate', description: 'Bolo quente de chocolate belga com recheio cremoso, acompanhado de sorvete de creme.', price: 24.9, image: 'https://images.unsplash.com/photo-1583528225108-295481722b35?w=800&q=80', categoryId: 'cat-sobremesas', active: true },
  { id: 'p-sobremesa-cupcake', name: 'Cupcake Red Velvet', description: 'Clássico cupcake red velvet com cobertura de cream cheese e cereja caramelizada.', price: 18.0, image: 'https://images.unsplash.com/photo-1574085733277-851d9d856a3a?w=800&q=80', categoryId: 'cat-sobremesas', active: true },
  { id: 'p-batata-rustica', name: 'Batata Rústica', description: 'Batatas rústicas assadas com alecrim, páprica defumada e maionese artesanal.', price: 22.0, image: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800&q=80', categoryId: 'cat-acompanhamentos', active: true },
  { id: 'p-onion-rings', name: 'Anéis de Cebola', description: 'Anéis de cebola empanados e crocantes, servidos com molho especial da casa.', price: 19.9, image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80', categoryId: 'cat-acompanhamentos', active: true },
]

async function ensureSeed(db) {
  if (await db.collection('categories').countDocuments() === 0) {
    await db.collection('categories').insertMany(SEED_CATEGORIES)
  }
  if (await db.collection('products').countDocuments() === 0) {
    await db.collection('products').insertMany(SEED_PRODUCTS)
  }
  if (await db.collection('banners').countDocuments() === 0) {
    await db.collection('banners').insertOne({
      id: uuidv4(),
      title: 'Bem-vindo ao Sabor & Arte',
      subtitle: 'Sabores autorais direto da nossa cozinha para sua mesa',
      image: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=1600&q=80',
      buttonText: '',
      buttonLink: '',
      active: true,
      createdAt: new Date().toISOString(),
    })
  }
  if (await db.collection('promotions').countDocuments() === 0) {
    await db.collection('promotions').insertMany([
      {
        id: uuidv4(),
        title: 'Combo Duplo Pizza + Vinho',
        description: 'Uma pizza artesanal grande + uma taça de vinho tinto por um preço especial.',
        image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=800&q=80',
        priceText: 'R$ 69,90',
        active: true,
        order: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        title: 'Happy Hour',
        description: 'De terça a sexta, das 17h às 20h — bebidas com 30% de desconto.',
        image: 'https://images.unsplash.com/photo-1648146299076-ec0c5e5ead00?w=800&q=80',
        priceText: '30% OFF',
        active: true,
        order: 2,
        createdAt: new Date().toISOString(),
      },
    ])
  }
  // Mark some products as featured if none are
  const featuredCount = await db.collection('products').countDocuments({ featured: true })
  if (featuredCount === 0) {
    await db.collection('products').updateMany(
      { id: { $in: ['p-burger-classic', 'p-pizza-margherita', 'p-sobremesa-chocolate'] } },
      { $set: { featured: true, featuredOrder: 1 } }
    )
  }
  // Seed branding settings
  const settings = await db.collection('settings').findOne({ id: 'branding' })
  if (!settings) {
    await db.collection('settings').insertOne({
      id: 'branding',
      restaurantName: 'Sabor & Arte',
      slogan: 'gastronomia autoral',
      logoUrl: '', // empty = use default ChefHat icon
      updatedAt: new Date().toISOString(),
    })
  }
  // Seed default admin
  const adminExists = await db.collection('users').findOne({ email: 'admin@sabor.com' })
  if (!adminExists) {
    await db.collection('users').insertOne({
      id: uuidv4(),
      email: 'admin@sabor.com',
      name: 'Administrador',
      passwordHash: bcrypt.hashSync('admin123', 8),
      role: 'owner_admin',
      createdAt: new Date().toISOString(),
    })
  } else if (adminExists.role === 'admin') {
    // Migration: rename old 'admin' to 'owner_admin'
    await db.collection('users').updateMany({ role: 'admin' }, { $set: { role: 'owner_admin' } })
  }
  // Seed payment methods config (with migration to new structure)
  const payCfg = await db.collection('settings').findOne({ id: 'payment-methods' })
  const DEFAULT_DELIVERY_METHODS = [
    { id: 'pix', label: 'PIX', active: true, online: true },
    { id: 'card_delivery', label: 'Cartão na Entrega', active: true, online: false },
    { id: 'cash_delivery', label: 'Dinheiro na Entrega', active: true, online: false },
  ]
  if (!payCfg) {
    await db.collection('settings').insertOne({
      id: 'payment-methods',
      deliveryMethods: DEFAULT_DELIVERY_METHODS,
      updatedAt: new Date().toISOString(),
    })
  } else {
    // Migrate old method ids to new structure
    const existing = payCfg.deliveryMethods || []
    const hasOldIds = existing.some((m) => ['credit_card', 'debit_card', 'cash_on_delivery'].includes(m.id))
    const missingNew = !existing.some((m) => m.id === 'card_delivery') || !existing.some((m) => m.id === 'cash_delivery')
    if (hasOldIds || missingNew) {
      await db.collection('settings').updateOne(
        { id: 'payment-methods' },
        { $set: { deliveryMethods: DEFAULT_DELIVERY_METHODS, updatedAt: new Date().toISOString() } }
      )
    }
  }

  // Seed theme settings
  const themeDoc = await db.collection('settings').findOne({ id: 'theme' })
  if (!themeDoc) {
    await db.collection('settings').insertOne({
      id: 'theme',
      mode: 'dark', // 'light' | 'dark' | 'auto'
      brand: {
        from: '#f59e0b', // amber-500
        to: '#ea580c',   // orange-600
      },
      dark: {
        background: '#09090b',
        foreground: '#fafafa',
        card: '#18181b',
        border: '#27272a',
        primary: '#f59e0b',
        primaryForeground: '#0a0a0a',
        secondary: '#27272a',
        secondaryForeground: '#fafafa',
        accent: '#f59e0b',
        muted: '#27272a',
        mutedForeground: '#a1a1aa',
        destructive: '#ef4444',
      },
      light: {
        background: '#ffffff',
        foreground: '#0a0a0a',
        card: '#ffffff',
        border: '#e5e7eb',
        primary: '#f59e0b',
        primaryForeground: '#ffffff',
        secondary: '#f4f4f5',
        secondaryForeground: '#0a0a0a',
        accent: '#f59e0b',
        muted: '#f4f4f5',
        mutedForeground: '#71717a',
        destructive: '#dc2626',
      },
      updatedAt: new Date().toISOString(),
    })
  }

  // Seed PIX config (stub, ready for provider integration)
  const pixCfg = await db.collection('settings').findOne({ id: 'pix-config' })
  if (!pixCfg) {
    await db.collection('settings').insertOne({
      id: 'pix-config',
      provider: 'stub', // 'stub' | 'mercadopago' | 'efi' | 'asaas'
      environment: 'sandbox', // 'sandbox' | 'production'
      apiKey: '',
      clientId: '',
      clientSecret: '',
      webhookUrl: '',
      pixKey: 'pagamento@sabor-arte.com.br',
      merchantName: 'Sabor e Arte',
      merchantCity: 'SAO PAULO',
      expirationMinutes: 15,
      updatedAt: new Date().toISOString(),
    })
  }
}

function stripId(doc) {
  if (!doc) return doc
  const { _id, passwordHash, ...rest } = doc
  return rest
}

// ===== PIX helpers =====
// Generates a BR Code (EMV QR Code) string for PIX static/dynamic payment.
// This is a simplified version suitable for stub/testing. Real providers return their own.
function buildPixBRCode({ pixKey, merchantName, merchantCity, amount, txid, description }) {
  const sanitize = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().slice(0, 25)
  const tlv = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`
  const gui = tlv('00', 'br.gov.bcb.pix')
  const key = tlv('01', pixKey || '')
  const desc = description ? tlv('02', description.slice(0, 50)) : ''
  const merchantAccountInfo = tlv('26', gui + key + desc)
  const payload =
    tlv('00', '01') +                              // Payload Format Indicator
    tlv('01', '12') +                              // Point of initiation method: dynamic
    merchantAccountInfo +                          // Merchant account info
    tlv('52', '0000') +                            // Merchant Category Code
    tlv('53', '986') +                             // Transaction currency (BRL)
    tlv('54', amount.toFixed(2)) +                 // Transaction amount
    tlv('58', 'BR') +                              // Country code
    tlv('59', sanitize(merchantName)) +            // Merchant name
    tlv('60', sanitize(merchantCity)) +            // Merchant city
    tlv('62', tlv('05', (txid || '***').slice(0, 25))) + // Additional data (txid)
    '6304'                                         // CRC placeholder
  return payload + crc16(payload)
}
function crc16(str) {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

async function generatePixForOrder(db, order, amount) {
  const cfg = await db.collection('settings').findOne({ id: 'pix-config' }) || {}
  const txid = ('SA' + order.id.replace(/-/g, '')).slice(0, 25).toUpperCase()
  const brCode = buildPixBRCode({
    pixKey: cfg.pixKey || 'pagamento@sabor-arte.com.br',
    merchantName: cfg.merchantName || 'Sabor e Arte',
    merchantCity: cfg.merchantCity || 'SAO PAULO',
    amount: Number(amount || 0),
    txid,
    description: `Pedido ${order.id.slice(0, 8)}`,
  })
  const qrDataUrl = await QRCode.toDataURL(brCode, { width: 360, margin: 1 })
  const expiresInMin = Number(cfg.expirationMinutes || 15)
  const expiresAt = new Date(Date.now() + expiresInMin * 60 * 1000).toISOString()
  return {
    provider: cfg.provider || 'stub',
    brCode,
    copyPaste: brCode,
    qrDataUrl,
    txid,
    amount: Number(amount || 0),
    createdAt: new Date().toISOString(),
    expiresAt,
    status: 'aguardando_pagamento', // pending
  }
}

function getAuthUser(request) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

async function requireAdmin(request, db) {
  const user = getAuthUser(request)
  if (!user) return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
  const dbUser = await db.collection('users').findOne({ id: user.id })
  if (!dbUser || !['owner_admin', 'admin', 'attendant', 'delivery_driver'].includes(dbUser.role)) {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }
  return { user: dbUser }
}

async function createNotification(db, { type, referenceId, title, message, targetRoles }) {
  const notif = {
    id: uuidv4(),
    type,
    referenceId: referenceId || null,
    title: title || '',
    message: message || '',
    targetRoles: targetRoles || ['owner_admin', 'admin', 'attendant'],
    readBy: [],
    createdAt: new Date().toISOString(),
  }
  await db.collection('notifications').insertOne(notif)
  return notif
}

async function requireOwner(request, db) {
  const res = await requireAdmin(request, db)
  if (res.error) return res
  if (!['owner_admin', 'admin'].includes(res.user.role)) {
    return { error: NextResponse.json({ error: 'Apenas Admin Dono pode realizar esta ação' }, { status: 403 }) }
  }
  return res
}

async function requireStaff(request, db, allowedRoles) {
  const res = await requireAdmin(request, db)
  if (res.error) return res
  if (allowedRoles && !allowedRoles.includes(res.user.role) && !['owner_admin', 'admin'].includes(res.user.role)) {
    return { error: NextResponse.json({ error: 'Acesso negado para este papel' }, { status: 403 }) }
  }
  return res
}

// ---- Valid statuses ----
const LOCAL_STATUSES = ['Recebido', 'Em preparo', 'Pronto', 'Entregue', 'Finalizado']
const DELIVERY_STATUSES = ['Aguardando confirmação', 'Confirmado', 'Em preparo', 'Saiu para entrega', 'Entregue', 'Finalizado']

// ============ GET ============
async function handleGet(request, pathParts) {
  const db = await getDb()
  await ensureSeed(db)
  const [resource, id, sub] = pathParts

  if (!resource || resource === 'health') {
    return NextResponse.json({ ok: true, service: 'restaurant-api' })
  }

  if (resource === 'categories') {
    const categories = await db.collection('categories').find({}).sort({ order: 1 }).toArray()
    return NextResponse.json(categories.map(stripId))
  }

  if (resource === 'products') {
    const url = new URL(request.url)
    const featured = url.searchParams.get('featured') === '1'
    const query = url.searchParams.get('all') === '1' ? {} : { active: true }
    if (featured) query.featured = true
    const products = await db.collection('products').find(query).sort(featured ? { featuredOrder: 1 } : {}).toArray()
    return NextResponse.json(products.map(stripId))
  }

  if (resource === 'banner') {
    const banner = await db.collection('banners').findOne({ active: true })
    return NextResponse.json(banner ? stripId(banner) : null)
  }

  if (resource === 'promotions') {
    const promos = await db.collection('promotions').find({ active: true }).sort({ order: 1 }).toArray()
    return NextResponse.json(promos.map(stripId))
  }

  if (resource === 'settings') {
    const s = await db.collection('settings').findOne({ id: 'branding' })
    return NextResponse.json(s ? stripId(s) : { restaurantName: 'Sabor & Arte', slogan: '', logoUrl: '' })
  }

  if (resource === 'payment-methods') {
    const s = await db.collection('settings').findOne({ id: 'payment-methods' })
    const methods = (s?.deliveryMethods || []).filter((m) => m.active)
    return NextResponse.json(methods)
  }

  if (resource === 'theme') {
    const s = await db.collection('settings').findOne({ id: 'theme' })
    if (!s) return NextResponse.json({ mode: 'dark' })
    return NextResponse.json(stripId(s))
  }

  if (resource === 'pix-info') {
    // Public read of non-secret pix info (for UI countdown etc.)
    const s = await db.collection('settings').findOne({ id: 'pix-config' })
    if (!s) return NextResponse.json({ expirationMinutes: 15 })
    return NextResponse.json({
      provider: s.provider,
      environment: s.environment,
      expirationMinutes: s.expirationMinutes,
      merchantName: s.merchantName,
    })
  }

  if (resource === 'orders' && id) {
    const order = await db.collection('orders').findOne({ id })
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    return NextResponse.json(stripId(order))
  }

  if (resource === 'comandas' && id) {
    const comanda = await db.collection('comandas').findOne({ id })
    if (!comanda) return NextResponse.json({ error: 'Comanda não encontrada' }, { status: 404 })
    const orders = await db.collection('orders').find({ comandaId: id }).sort({ createdAt: 1 }).toArray()
    return NextResponse.json({ ...stripId(comanda), orders: orders.map(stripId) })
  }

  if (resource === 'auth' && id === 'me') {
    const user = getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const dbUser = await db.collection('users').findOne({ id: user.id })
    if (!dbUser) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    return NextResponse.json(stripId(dbUser))
  }

  if (resource === 'me' && id === 'orders') {
    const user = getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const orders = await db.collection('orders').find({ userId: user.id }).sort({ createdAt: -1 }).toArray()
    return NextResponse.json(orders.map(stripId))
  }

  // ===== Admin routes =====
  if (resource === 'admin') {
    const guard = await requireAdmin(request, db)
    if (guard.error) return guard.error

    if (id === 'orders') {
      const url = new URL(request.url)
      const type = url.searchParams.get('type')
      const search = (url.searchParams.get('search') || '').trim()
      const status = url.searchParams.get('status')
      const minValue = Number(url.searchParams.get('minValue')) || 0
      const maxValue = Number(url.searchParams.get('maxValue')) || 0
      const table = url.searchParams.get('table')
      const address = (url.searchParams.get('address') || '').trim()
      const dateFrom = url.searchParams.get('dateFrom')
      const dateTo = url.searchParams.get('dateTo')
      const payStatus = url.searchParams.get('paymentStatus')
      const payMethod = url.searchParams.get('paymentMethod')
      const deliveryStatus = url.searchParams.get('deliveryStatus')
      const history = url.searchParams.get('history')
      const q = {}
      if (type) q.type = type
      if (search) q['customer.name'] = { $regex: search, $options: 'i' }
      if (status) q.status = status
      if (minValue) q.total = { ...(q.total || {}), $gte: minValue }
      if (maxValue) q.total = { ...(q.total || {}), $lte: maxValue }
      if (table) q.table = String(table)
      if (address) q['address.street'] = { $regex: address, $options: 'i' }
      if (dateFrom) q.createdAt = { ...(q.createdAt || {}), $gte: new Date(dateFrom).toISOString() }
      if (dateTo) q.createdAt = { ...(q.createdAt || {}), $lte: new Date(dateTo + 'T23:59:59').toISOString() }
      if (payStatus) q['payment.status'] = payStatus
      if (payMethod) q['payment.method'] = payMethod
      if (deliveryStatus) q['delivery.status'] = deliveryStatus
      if (history === '1') q.status = 'Finalizado'
      else if (history === '0') q.status = { $ne: 'Finalizado' }
      const orders = await db.collection('orders').find(q).sort({ createdAt: -1 }).toArray()
      return NextResponse.json(orders.map(stripId))
    }
    if (id === 'comandas') {
      const url = new URL(request.url)
      const status = url.searchParams.get('status')
      const search = (url.searchParams.get('search') || '').trim()
      const q = {}
      if (status) q.status = status
      if (search) q['customer.name'] = { $regex: search, $options: 'i' }
      const comandas = await db.collection('comandas').find(q).sort({ openedAt: -1 }).toArray()
      // Populate each comanda with its operational orders
      const allOrderIds = comandas.flatMap((c) => c.orderIds || [])
      const allOrders = await db.collection('orders').find({ id: { $in: allOrderIds } }).toArray()
      const orderMap = Object.fromEntries(allOrders.map((o) => [o.id, stripId(o)]))
      const enriched = comandas.map((c) => ({
        ...stripId(c),
        orders: (c.orderIds || []).map((oid) => orderMap[oid]).filter(Boolean),
      }))
      return NextResponse.json(enriched)
    }
    if (id === 'products') {
      const products = await db.collection('products').find({}).toArray()
      return NextResponse.json(products.map(stripId))
    }
    if (id === 'categories') {
      const categories = await db.collection('categories').find({}).sort({ order: 1 }).toArray()
      return NextResponse.json(categories.map(stripId))
    }
    if (id === 'users') {
      const users = await db.collection('users').find({}).toArray()
      return NextResponse.json(users.map(stripId))
    }
    if (id === 'payment-methods') {
      const s = await db.collection('settings').findOne({ id: 'payment-methods' })
      return NextResponse.json(s?.deliveryMethods || [])
    }
    if (id === 'theme') {
      const s = await db.collection('settings').findOne({ id: 'theme' })
      return NextResponse.json(s ? stripId(s) : { mode: 'dark' })
    }
    if (id === 'pix-config') {
      const ownerCheck = await requireOwner(request, db)
      if (ownerCheck.error) return ownerCheck.error
      const s = await db.collection('settings').findOne({ id: 'pix-config' })
      return NextResponse.json(s ? stripId(s) : {})
    }
    if (id === 'notifications') {
      // Get notifications targeted to current user's role, newest first, limit 50
      const me = guard.user
      const notifs = await db.collection('notifications')
        .find({ targetRoles: { $in: [me.role] } })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()
      // Mark each with isRead flag for current user
      const enriched = notifs.map((n) => ({
        ...stripId(n),
        isRead: (n.readBy || []).includes(me.id),
      }))
      return NextResponse.json(enriched)
    }
    if (id === 'banners') {
      const banners = await db.collection('banners').find({}).toArray()
      return NextResponse.json(banners.map(stripId))
    }
    if (id === 'promotions') {
      const promos = await db.collection('promotions').find({}).sort({ order: 1 }).toArray()
      return NextResponse.json(promos.map(stripId))
    }
    if (id === 'stats') {
      const owner = await requireOwner(request, db)
      if (owner.error) return owner.error
      const now = new Date()
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const [ordersCount, products, users, dayOrders, monthOrders, openComandas, awaitingPayComandas] = await Promise.all([
        db.collection('orders').countDocuments(),
        db.collection('products').countDocuments(),
        db.collection('users').countDocuments(),
        db.collection('orders').find({ createdAt: { $gte: startDay } }).toArray(),
        db.collection('orders').find({ createdAt: { $gte: startMonth } }).toArray(),
        db.collection('comandas').countDocuments({ status: 'aberta' }),
        db.collection('comandas').countDocuments({ status: 'aguardando_pagamento' }),
      ])
      const paymentsByMethod = {}
      for (const o of dayOrders) {
        const m = o.payment?.method || '—'
        paymentsByMethod[m] = (paymentsByMethod[m] || 0) + (o.total || 0)
      }
      return NextResponse.json({
        totalOrders: ordersCount,
        todayOrders: dayOrders.length,
        todayRevenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
        pendingOrders: dayOrders.filter((o) => !['Finalizado', 'Entregue'].includes(o.status)).length,
        monthOrders: monthOrders.length,
        monthRevenue: monthOrders.reduce((s, o) => s + (o.total || 0), 0),
        openComandas,
        awaitingPayComandas,
        paymentsByMethod,
        products, users,
      })
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// ============ POST ============
async function handlePost(request, pathParts) {
  const db = await getDb()
  await ensureSeed(db)
  const [resource, id] = pathParts

  // Auth
  if (resource === 'auth' && id === 'register') {
    const { email, password, name } = await request.json()
    if (!email || !password) return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
    const exists = await db.collection('users').findOne({ email: email.toLowerCase() })
    if (exists) return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 })
    const user = {
      id: uuidv4(),
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      passwordHash: bcrypt.hashSync(password, 8),
      role: 'customer',
      createdAt: new Date().toISOString(),
    }
    await db.collection('users').insertOne(user)
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
    return NextResponse.json({ token, user: stripId(user) }, { status: 201 })
  }

  if (resource === 'auth' && id === 'login') {
    const { email, password } = await request.json()
    const user = await db.collection('users').findOne({ email: (email || '').toLowerCase() })
    if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
    return NextResponse.json({ token, user: stripId(user) })
  }

  // Orders (create)
  if (resource === 'orders' && !id) {
    const body = await request.json()
    const { type, items, customer, table, address, payment, notes } = body
    const authed = getAuthUser(request)

    if (!type || !['local', 'delivery'].includes(type)) return NextResponse.json({ error: 'Tipo de pedido inválido' }, { status: 400 })
    if (!items || !Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })

    const productIds = items.map((i) => i.productId)
    const products = await db.collection('products').find({ id: { $in: productIds } }).toArray()
    const prodMap = Object.fromEntries(products.map((p) => [p.id, p]))

    const snapshotItems = items.map((i) => {
      const p = prodMap[i.productId]
      if (!p) throw new Error(`Produto ${i.productId} inexistente`)
      return { productId: p.id, name: p.name, price: p.price, image: p.image, quantity: i.quantity, observations: i.observations || '', subtotal: p.price * i.quantity }
    })

    const total = snapshotItems.reduce((s, i) => s + i.subtotal, 0)
    const initialStatus = type === 'local' ? 'Recebido' : 'Aguardando confirmação'
    const now = new Date().toISOString()

    let comandaId = null
    if (type === 'local') {
      if (!table) return NextResponse.json({ error: 'Número da mesa obrigatório' }, { status: 400 })
      const custName = customer?.name || 'Visitante'
      // Find OPEN conta (grupo de conta aberta) prioritizing logged userId.
      // A conta only groups orders that are still open (não paga/não fechada).
      let comanda = null
      if (authed?.id) {
        comanda = await db.collection('comandas').findOne({
          userId: authed.id, status: { $in: ['aberta', 'aguardando_pagamento'] }
        })
        // If the customer moved tables, update the comanda's table
        if (comanda && comanda.table !== String(table)) {
          await db.collection('comandas').updateOne({ id: comanda.id }, { $set: { table: String(table) } })
          comanda.table = String(table)
        }
      }
      if (!comanda) {
        // Guest users: match by table only (guests at same table share conta)
        comanda = await db.collection('comandas').findOne({
          table: String(table), userId: null, status: { $in: ['aberta', 'aguardando_pagamento'] }
        })
      }
      if (!comanda) {
        comanda = {
          id: uuidv4(), table: String(table),
          customer: { name: custName, phone: customer?.phone || '' },
          userId: authed?.id || null,
          status: 'aberta', paymentMethod: null, paymentStatus: 'pendente',
          total: 0, orderIds: [],
          openedAt: now, closedAt: null, paidAt: null,
        }
        await db.collection('comandas').insertOne(comanda)
      }
      comandaId = comanda.id
    }

    const order = {
      id: uuidv4(), type, userId: authed?.id || null, comandaId,
      customer: customer || { name: 'Visitante' },
      items: snapshotItems, total, notes: notes || '',
      status: initialStatus,
      statusHistory: [{ status: initialStatus, at: now }],
      createdAt: now,
    }
    if (type === 'local') {
      order.table = String(table)
    } else {
      if (!address?.street) return NextResponse.json({ error: 'Endereço obrigatório' }, { status: 400 })
      order.address = address
      // Normalize payment method for delivery: 'pix' | 'card_delivery' | 'cash_delivery'
      const rawMethod = (payment?.method || 'pix').toLowerCase()
      const methodMap = {
        pix: 'pix',
        pagar_pix: 'pix',
        cartao: 'card_delivery',
        cartão: 'card_delivery',
        card_delivery: 'card_delivery',
        credit_card: 'card_delivery',
        debit_card: 'card_delivery',
        dinheiro: 'cash_delivery',
        cash_delivery: 'cash_delivery',
        cash_on_delivery: 'cash_delivery',
      }
      const normalizedMethod = methodMap[rawMethod] || 'pix'
      if (normalizedMethod === 'pix') {
        order.payment = { method: 'pix', status: 'aguardando_pagamento' }
        try {
          order.pix = await generatePixForOrder(db, { id: order.id }, total)
          order.payment.txid = order.pix.txid
          order.payment.expiresAt = order.pix.expiresAt
        } catch (e) {
          console.error('PIX generation error:', e)
        }
      } else {
        // Card / cash on delivery → payment stays pending until delivered
        order.payment = { method: normalizedMethod, status: 'pendente_entrega' }
      }
    }
    await db.collection('orders').insertOne(order)

    if (comandaId) {
      await db.collection('comandas').updateOne(
        { id: comandaId },
        { $inc: { total }, $push: { orderIds: order.id } }
      )
    }

    // Create notification for new order
    await createNotification(db, {
      type: type === 'local' ? 'new_local_order' : 'new_delivery_order',
      referenceId: order.id,
      title: type === 'local' ? `Novo pedido — Mesa ${order.table}` : `Novo delivery — ${order.customer?.name}`,
      message: `${snapshotItems.length} ${snapshotItems.length === 1 ? 'item' : 'itens'} · ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      targetRoles: type === 'local' ? ['owner_admin', 'admin', 'attendant'] : ['owner_admin', 'admin', 'attendant', 'delivery_driver'],
    })
    return NextResponse.json({ ...stripId(order), comandaId }, { status: 201 })
  }

  // Customer requests payment for comanda
  if (resource === 'comandas' && id && pathParts[2] === 'request-payment') {
    const body = await request.json()
    const method = body.method
    if (!['Pix', 'Cartão', 'Dinheiro'].includes(method)) return NextResponse.json({ error: 'Método inválido' }, { status: 400 })
    const comanda = await db.collection('comandas').findOne({ id })
    if (!comanda) return NextResponse.json({ error: 'Comanda não encontrada' }, { status: 404 })
    if (comanda.status === 'paga' || comanda.status === 'fechada') return NextResponse.json({ error: 'Comanda já finalizada' }, { status: 400 })
    await db.collection('comandas').updateOne(
      { id },
      { $set: { status: 'aguardando_pagamento', paymentMethod: method, paymentRequestedAt: new Date().toISOString() } }
    )
    const updated = await db.collection('comandas').findOne({ id })
    // Create notification for payment request
    await createNotification(db, {
      type: 'payment_request',
      referenceId: updated.id,
      title: `💰 Mesa ${updated.table} pediu a conta`,
      message: `${updated.customer?.name} · ${method} · ${(updated.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      targetRoles: ['owner_admin', 'admin', 'attendant'],
    })
    return NextResponse.json(stripId(updated))
  }

  // PIX: regenerate / refresh payment for a delivery order
  if (resource === 'orders' && id && pathParts[2] === 'pix-regenerate') {
    const order = await db.collection('orders').findOne({ id })
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    if (order.type !== 'delivery' || order.payment?.method !== 'pix') {
      return NextResponse.json({ error: 'Pedido não é PIX' }, { status: 400 })
    }
    if (order.payment?.status === 'pago') {
      return NextResponse.json({ error: 'Pedido já foi pago' }, { status: 400 })
    }
    const pix = await generatePixForOrder(db, order, order.total)
    await db.collection('orders').updateOne(
      { id },
      { $set: { pix, 'payment.status': 'aguardando_pagamento', 'payment.txid': pix.txid, 'payment.expiresAt': pix.expiresAt } }
    )
    const updated = await db.collection('orders').findOne({ id })
    return NextResponse.json(stripId(updated))
  }

  // PIX: simulate confirmation (stub / admin manual / webhook)
  // In production this would be triggered by provider webhook + signature verification.
  if (resource === 'orders' && id && pathParts[2] === 'pix-confirm') {
    const body = await request.json().catch(() => ({}))
    const order = await db.collection('orders').findOne({ id })
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    // For admin-triggered confirmation we require admin auth. Webhook calls use a shared secret in body.provider_token (stub skips).
    const authed = getAuthUser(request)
    const isAdmin = authed && ['owner_admin', 'admin', 'attendant'].includes(authed.role)
    const isStubWebhook = body.source === 'webhook' && body.provider_token === 'stub'
    if (!isAdmin && !isStubWebhook) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    if (order.payment?.method !== 'pix') {
      return NextResponse.json({ error: 'Pedido não é PIX' }, { status: 400 })
    }
    const paidAt = new Date().toISOString()
    await db.collection('orders').updateOne(
      { id },
      { $set: {
          'payment.status': 'pago',
          'payment.paidAt': paidAt,
          'payment.confirmedBy': isAdmin ? (authed.email || authed.id) : 'webhook:stub',
          'pix.status': 'pago',
          // Promote order from "aguardando_pagamento" → "Confirmado" if applicable
          ...(order.status === 'Aguardando pagamento' || order.status === 'Recebido' ? { status: 'Confirmado' } : {}),
        },
        $push: { statusHistory: { status: 'Pagamento PIX confirmado', at: paidAt } },
      }
    )
    await createNotification(db, {
      type: 'payment_confirmed',
      referenceId: id,
      title: `✅ Pagamento PIX confirmado`,
      message: `Pedido de ${order.customer?.name || 'cliente'} · ${(order.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      targetRoles: ['owner_admin', 'admin', 'attendant', 'delivery_driver'],
    })
    const updated = await db.collection('orders').findOne({ id })
    return NextResponse.json(stripId(updated))
  }

  // PIX: status check (polling from customer tracking page)
  if (resource === 'orders' && id && pathParts[2] === 'pix-status') {
    const order = await db.collection('orders').findOne({ id })
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    // Auto-expire if past expiresAt and still pending
    if (order.pix?.expiresAt && order.payment?.status === 'aguardando_pagamento' && new Date(order.pix.expiresAt) < new Date()) {
      await db.collection('orders').updateOne(
        { id },
        { $set: { 'payment.status': 'expirado', 'pix.status': 'expirado' } }
      )
      return NextResponse.json({ status: 'expirado', paymentStatus: 'expirado' })
    }
    return NextResponse.json({
      status: order.pix?.status || order.payment?.status,
      paymentStatus: order.payment?.status,
      orderStatus: order.status,
    })
  }

  // Admin create
  if (resource === 'admin') {
    const guard = await requireAdmin(request, db)
    if (guard.error) return guard.error
    const body = await request.json()

    if (id === 'products') {
      const product = {
        id: uuidv4(),
        name: body.name,
        description: body.description || '',
        price: Number(body.price) || 0,
        image: body.image || '',
        categoryId: body.categoryId,
        active: body.active !== false,
      }
      await db.collection('products').insertOne(product)
      return NextResponse.json(stripId(product), { status: 201 })
    }
    if (id === 'categories') {
      const category = {
        id: uuidv4(),
        name: body.name,
        slug: (body.name || '').toLowerCase().replace(/\s+/g, '-'),
        icon: body.icon || '🍽️',
        order: Number(body.order) || 99,
      }
      await db.collection('categories').insertOne(category)
      return NextResponse.json(stripId(category), { status: 201 })
    }
    if (id === 'banners') {
      const banner = {
        id: uuidv4(),
        title: body.title || '',
        subtitle: body.subtitle || '',
        image: body.image || '',
        buttonText: body.buttonText || '',
        buttonLink: body.buttonLink || '',
        active: body.active !== false,
        createdAt: new Date().toISOString(),
      }
      // If new banner is active, deactivate others
      if (banner.active) {
        await db.collection('banners').updateMany({}, { $set: { active: false } })
      }
      await db.collection('banners').insertOne(banner)
      return NextResponse.json(stripId(banner), { status: 201 })
    }
    if (id === 'promotions') {
      const promo = {
        id: uuidv4(),
        title: body.title || '',
        description: body.description || '',
        image: body.image || '',
        priceText: body.priceText || '',
        active: body.active !== false,
        order: Number(body.order) || 99,
        startsAt: body.startsAt || null,
        endsAt: body.endsAt || null,
        createdAt: new Date().toISOString(),
      }
      await db.collection('promotions').insertOne(promo)
      return NextResponse.json(stripId(promo), { status: 201 })
    }
    if (id === 'users') {
      const ownerCheck = await requireOwner(request, db)
      if (ownerCheck.error) return ownerCheck.error
      const { email, password, name, role } = body
      if (!email || !password || !role) return NextResponse.json({ error: 'Email, senha e papel obrigatórios' }, { status: 400 })
      if (!['owner_admin', 'attendant', 'delivery_driver'].includes(role)) return NextResponse.json({ error: 'Papel inválido' }, { status: 400 })
      const exists = await db.collection('users').findOne({ email: email.toLowerCase() })
      if (exists) return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 })
      const user = {
        id: uuidv4(),
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        passwordHash: bcrypt.hashSync(password, 8),
        role,
        createdAt: new Date().toISOString(),
      }
      await db.collection('users').insertOne(user)
      return NextResponse.json(stripId(user), { status: 201 })
    }
    if (id === 'notifications' && body.action === 'read-all') {
      const me = guard.user
      await db.collection('notifications').updateMany(
        { targetRoles: { $in: [me.role] }, readBy: { $ne: me.id } },
        { $push: { readBy: me.id } }
      )
      return NextResponse.json({ ok: true })
    }
    if (id === 'notifications' && body.notificationId && body.action === 'read') {
      const me = guard.user
      await db.collection('notifications').updateOne(
        { id: body.notificationId, readBy: { $ne: me.id } },
        { $push: { readBy: me.id } }
      )
      return NextResponse.json({ ok: true })
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// ============ PATCH ============
async function handlePatch(request, pathParts) {
  const db = await getDb()
  const [resource, id, targetId] = pathParts
  const body = await request.json()

  if (resource === 'admin') {
    const guard = await requireAdmin(request, db)
    if (guard.error) return guard.error

    if (id === 'orders' && targetId) {
      const order = await db.collection('orders').findOne({ id: targetId })
      if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
      const updates = {}
      const entries = []
      const now = new Date().toISOString()

      // Operational status update (allowed for attendant + owner)
      if (body.status !== undefined) {
        const valid = order.type === 'local' ? LOCAL_STATUSES : DELIVERY_STATUSES
        if (!valid.includes(body.status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
        updates.status = body.status
        entries.push({ status: body.status, at: now })
      }
      // Delivery status + observation (allowed for driver + owner)
      if (body.deliveryStatus !== undefined) {
        if (!['Entregue', 'Não Entregue'].includes(body.deliveryStatus)) return NextResponse.json({ error: 'Status de entrega inválido' }, { status: 400 })
        if (body.deliveryStatus === 'Não Entregue' && !body.deliveryObservation) return NextResponse.json({ error: 'Observação obrigatória para pedido não entregue' }, { status: 400 })
        updates.delivery = {
          status: body.deliveryStatus,
          observation: body.deliveryObservation || '',
          updatedAt: now,
          driverId: guard.user.id,
        }
        entries.push({ status: `Entrega: ${body.deliveryStatus}`, at: now, note: body.deliveryObservation || '' })
      }
      // Payment status/method update
      if (body.paymentStatus || body.paymentMethod) {
        const newPayment = { ...(order.payment || {}) }
        if (body.paymentStatus) newPayment.status = body.paymentStatus
        if (body.paymentMethod) newPayment.method = body.paymentMethod
        if (body.paymentStatus === 'Pago') newPayment.paidAt = now
        updates.payment = newPayment
        entries.push({ status: `Pagamento: ${newPayment.status || ''} via ${newPayment.method || ''}`, at: now })
      }

      if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nada a atualizar' }, { status: 400 })
      const setObj = { $set: updates }
      if (entries.length > 0) setObj.$push = { statusHistory: { $each: entries } }
      await db.collection('orders').updateOne({ id: targetId }, setObj)
      const updated = await db.collection('orders').findOne({ id: targetId })
      return NextResponse.json(stripId(updated))
    }
    if (id === 'products' && targetId) {
      const updates = {}
      for (const k of ['name', 'description', 'price', 'image', 'categoryId', 'active', 'featured', 'featuredOrder']) {
        if (body[k] !== undefined) updates[k] = (k === 'price' || k === 'featuredOrder') ? Number(body[k]) : body[k]
      }
      await db.collection('products').updateOne({ id: targetId }, { $set: updates })
      const updated = await db.collection('products').findOne({ id: targetId })
      return NextResponse.json(stripId(updated))
    }
    if (id === 'payments' && targetId) {
      const order = await db.collection('orders').findOne({ id: targetId })
      if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
      const method = body.method || order.payment?.method || 'Dinheiro'
      const paidAt = new Date().toISOString()
      const payment = { method, status: 'Pago', paidAt }
      const entry = { status: 'Pago', at: paidAt, note: `Pagamento via ${method}` }
      await db.collection('orders').updateOne(
        { id: targetId },
        { $set: { payment }, $push: { statusHistory: entry } }
      )
      const updated = await db.collection('orders').findOne({ id: targetId })
      return NextResponse.json(stripId(updated))
    }
    if (id === 'categories' && targetId) {
      const updates = {}
      for (const k of ['name', 'icon', 'order']) {
        if (body[k] !== undefined) updates[k] = k === 'order' ? Number(body[k]) : body[k]
      }
      await db.collection('categories').updateOne({ id: targetId }, { $set: updates })
      const updated = await db.collection('categories').findOne({ id: targetId })
      return NextResponse.json(stripId(updated))
    }
    if (id === 'banners' && targetId) {
      const updates = {}
      for (const k of ['title', 'subtitle', 'image', 'buttonText', 'buttonLink', 'active']) {
        if (body[k] !== undefined) updates[k] = body[k]
      }
      // If activating, deactivate others
      if (updates.active === true) {
        await db.collection('banners').updateMany({ id: { $ne: targetId } }, { $set: { active: false } })
      }
      await db.collection('banners').updateOne({ id: targetId }, { $set: updates })
      const updated = await db.collection('banners').findOne({ id: targetId })
      return NextResponse.json(stripId(updated))
    }
    if (id === 'promotions' && targetId) {
      const updates = {}
      for (const k of ['title', 'description', 'image', 'priceText', 'active', 'order', 'startsAt', 'endsAt']) {
        if (body[k] !== undefined) updates[k] = k === 'order' ? Number(body[k]) : body[k]
      }
      await db.collection('promotions').updateOne({ id: targetId }, { $set: updates })
      const updated = await db.collection('promotions').findOne({ id: targetId })
      return NextResponse.json(stripId(updated))
    }
    if (id === 'settings') {
      const updates = { updatedAt: new Date().toISOString() }
      for (const k of ['restaurantName', 'slogan', 'logoUrl']) {
        if (body[k] !== undefined) updates[k] = body[k]
      }
      await db.collection('settings').updateOne({ id: 'branding' }, { $set: updates }, { upsert: true })
      const updated = await db.collection('settings').findOne({ id: 'branding' })
      return NextResponse.json(stripId(updated))
    }
    if (id === 'payment-methods') {
      const updates = { updatedAt: new Date().toISOString() }
      if (Array.isArray(body.deliveryMethods)) updates.deliveryMethods = body.deliveryMethods
      await db.collection('settings').updateOne({ id: 'payment-methods' }, { $set: updates }, { upsert: true })
      const updated = await db.collection('settings').findOne({ id: 'payment-methods' })
      return NextResponse.json(stripId(updated))
    }
    if (id === 'theme') {
      const updates = { updatedAt: new Date().toISOString() }
      for (const k of ['mode', 'brand', 'dark', 'light']) {
        if (body[k] !== undefined) updates[k] = body[k]
      }
      await db.collection('settings').updateOne({ id: 'theme' }, { $set: updates }, { upsert: true })
      const updated = await db.collection('settings').findOne({ id: 'theme' })
      return NextResponse.json(stripId(updated))
    }
    if (id === 'pix-config') {
      const ownerCheck = await requireOwner(request, db)
      if (ownerCheck.error) return ownerCheck.error
      const updates = { updatedAt: new Date().toISOString() }
      for (const k of ['provider', 'environment', 'apiKey', 'clientId', 'clientSecret', 'webhookUrl', 'pixKey', 'merchantName', 'merchantCity', 'expirationMinutes']) {
        if (body[k] !== undefined) updates[k] = body[k]
      }
      await db.collection('settings').updateOne({ id: 'pix-config' }, { $set: updates }, { upsert: true })
      const updated = await db.collection('settings').findOne({ id: 'pix-config' })
      return NextResponse.json(stripId(updated))
    }
    if (id === 'users' && targetId) {
      const ownerCheck = await requireOwner(request, db)
      if (ownerCheck.error) return ownerCheck.error
      const updates = {}
      if (body.role && ['owner_admin', 'attendant', 'delivery_driver', 'customer'].includes(body.role)) {
        updates.role = body.role
      }
      if (body.name) updates.name = body.name
      if (body.password) updates.passwordHash = bcrypt.hashSync(body.password, 8)
      if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nada a atualizar' }, { status: 400 })
      await db.collection('users').updateOne({ id: targetId }, { $set: updates })
      const updated = await db.collection('users').findOne({ id: targetId })
      return NextResponse.json(stripId(updated))
    }
    if (id === 'comandas' && targetId) {
      const comanda = await db.collection('comandas').findOne({ id: targetId })
      if (!comanda) return NextResponse.json({ error: 'Comanda não encontrada' }, { status: 404 })
      const now = new Date().toISOString()
      const action = body.action // 'pay' | 'close'
      if (action === 'pay') {
        const method = body.method || comanda.paymentMethod || 'Dinheiro'
        await db.collection('comandas').updateOne({ id: targetId }, { $set: { status: 'paga', paymentStatus: 'pago', paymentMethod: method, paidAt: now, closedAt: now } })
        // Propagate payment info to all orders in this comanda (keep their operational status intact)
        if (comanda.orderIds?.length) {
          await db.collection('orders').updateMany(
            { id: { $in: comanda.orderIds } },
            { $set: { 'payment.method': method, 'payment.status': 'Pago', 'payment.paidAt': now } }
          )
        }
      } else if (action === 'close') {
        await db.collection('comandas').updateOne({ id: targetId }, { $set: { status: 'fechada', closedAt: now } })
      } else if (action === 'reopen') {
        await db.collection('comandas').updateOne({ id: targetId }, { $set: { status: 'aberta', closedAt: null, paidAt: null } })
      } else {
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
      }
      const updated = await db.collection('comandas').findOne({ id: targetId })
      return NextResponse.json(stripId(updated))
    }
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// ============ DELETE ============
async function handleDelete(request, pathParts) {
  const db = await getDb()
  const [resource, id, targetId] = pathParts
  if (resource === 'admin') {
    const guard = await requireAdmin(request, db)
    if (guard.error) return guard.error
    if (id === 'orders' && targetId) {
      // Only owner can delete orders
      const owner = await requireOwner(request, db)
      if (owner.error) return owner.error
      const order = await db.collection('orders').findOne({ id: targetId })
      if (order?.comandaId) {
        // Remove from comanda and recompute total
        await db.collection('comandas').updateOne(
          { id: order.comandaId },
          { $inc: { total: -(order.total || 0) }, $pull: { orderIds: targetId } }
        )
      }
      await db.collection('orders').deleteOne({ id: targetId })
      return NextResponse.json({ ok: true })
    }
    if (id === 'products' && targetId) {
      await db.collection('products').deleteOne({ id: targetId })
      return NextResponse.json({ ok: true })
    }
    if (id === 'categories' && targetId) {
      await db.collection('categories').deleteOne({ id: targetId })
      return NextResponse.json({ ok: true })
    }
    if (id === 'banners' && targetId) {
      await db.collection('banners').deleteOne({ id: targetId })
      return NextResponse.json({ ok: true })
    }
    if (id === 'promotions' && targetId) {
      await db.collection('promotions').deleteOne({ id: targetId })
      return NextResponse.json({ ok: true })
    }
    if (id === 'users' && targetId) {
      const owner = await requireOwner(request, db)
      if (owner.error) return owner.error
      await db.collection('users').deleteOne({ id: targetId })
      return NextResponse.json({ ok: true })
    }
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function GET(request, { params }) {
  try {
    const pathParts = (await params).path || []
    return await handleGet(request, pathParts)
  } catch (e) {
    console.error('GET error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export async function POST(request, { params }) {
  try {
    const pathParts = (await params).path || []
    return await handlePost(request, pathParts)
  } catch (e) {
    console.error('POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export async function PATCH(request, { params }) {
  try {
    const pathParts = (await params).path || []
    return await handlePatch(request, pathParts)
  } catch (e) {
    console.error('PATCH error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export async function DELETE(request, { params }) {
  try {
    const pathParts = (await params).path || []
    return await handleDelete(request, pathParts)
  } catch (e) {
    console.error('DELETE error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
