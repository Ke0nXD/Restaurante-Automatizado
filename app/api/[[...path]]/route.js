import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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
  // Seed default admin
  const adminExists = await db.collection('users').findOne({ email: 'admin@sabor.com' })
  if (!adminExists) {
    await db.collection('users').insertOne({
      id: uuidv4(),
      email: 'admin@sabor.com',
      name: 'Administrador',
      passwordHash: bcrypt.hashSync('admin123', 8),
      role: 'admin',
      createdAt: new Date().toISOString(),
    })
  }
}

function stripId(doc) {
  if (!doc) return doc
  const { _id, passwordHash, ...rest } = doc
  return rest
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
  if (!dbUser || dbUser.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }
  return { user: dbUser }
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
    const query = request.url.includes('all=1') ? {} : { active: true }
    const products = await db.collection('products').find(query).toArray()
    return NextResponse.json(products.map(stripId))
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
      const q = {}
      if (type) q.type = type
      if (search) q['customer.name'] = { $regex: search, $options: 'i' }
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
      return NextResponse.json(comandas.map(stripId))
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
    if (id === 'stats') {
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

  // Orders
  if (resource === 'orders') {
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
      // Find open comanda for this table
      const custName = customer?.name || 'Visitante'
      let comanda = await db.collection('comandas').findOne({
        table: String(table), status: { $in: ['aberta', 'aguardando_pagamento'] }
      })
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
      order.payment = { method: payment?.method || 'Pix', status: 'Pendente' }
    }
    await db.collection('orders').insertOne(order)

    if (comandaId) {
      await db.collection('comandas').updateOne(
        { id: comandaId },
        { $inc: { total }, $push: { orderIds: order.id } }
      )
    }
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
    return NextResponse.json(stripId(updated))
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
      const valid = order.type === 'local' ? LOCAL_STATUSES : DELIVERY_STATUSES
      if (!valid.includes(body.status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
      const entry = { status: body.status, at: new Date().toISOString() }
      await db.collection('orders').updateOne(
        { id: targetId },
        { $set: { status: body.status }, $push: { statusHistory: entry } }
      )
      const updated = await db.collection('orders').findOne({ id: targetId })
      return NextResponse.json(stripId(updated))
    }
    if (id === 'products' && targetId) {
      const updates = {}
      for (const k of ['name', 'description', 'price', 'image', 'categoryId', 'active']) {
        if (body[k] !== undefined) updates[k] = k === 'price' ? Number(body[k]) : body[k]
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
    if (id === 'comandas' && targetId) {
      const comanda = await db.collection('comandas').findOne({ id: targetId })
      if (!comanda) return NextResponse.json({ error: 'Comanda não encontrada' }, { status: 404 })
      const now = new Date().toISOString()
      const action = body.action // 'pay' | 'close'
      if (action === 'pay') {
        const method = body.method || comanda.paymentMethod || 'Dinheiro'
        await db.collection('comandas').updateOne({ id: targetId }, { $set: { status: 'paga', paymentStatus: 'pago', paymentMethod: method, paidAt: now, closedAt: now } })
      } else if (action === 'close') {
        await db.collection('comandas').updateOne({ id: targetId }, { $set: { status: 'fechada', closedAt: now } })
      } else if (action === 'reopen') {
        await db.collection('comandas').updateOne({ id: targetId }, { $set: { status: 'aberta' } })
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
    if (id === 'products' && targetId) {
      await db.collection('products').deleteOne({ id: targetId })
      return NextResponse.json({ ok: true })
    }
    if (id === 'categories' && targetId) {
      await db.collection('categories').deleteOne({ id: targetId })
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
