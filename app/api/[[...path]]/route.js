import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'restaurant_app'

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
  {
    id: 'p-burger-classic',
    name: 'Burger Clássico',
    description: 'Hambúrguer artesanal 180g, queijo cheddar, alface, tomate, cebola caramelizada e molho da casa no pão brioche.',
    price: 38.9,
    image: 'https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?w=800&q=80',
    categoryId: 'cat-lanches',
    active: true,
  },
  {
    id: 'p-burger-bbq',
    name: 'Burger BBQ Bacon',
    description: 'Blend bovino 200g, bacon crocante, cheddar inglês, cebola roxa e molho barbecue defumado.',
    price: 44.9,
    image: 'https://images.unsplash.com/photo-1648146299178-566fbf8522d1?w=800&q=80',
    categoryId: 'cat-lanches',
    active: true,
  },
  {
    id: 'p-pizza-margherita',
    name: 'Pizza Margherita',
    description: 'Molho de tomate San Marzano, mussarela de búfala, manjericão fresco e azeite extra virgem.',
    price: 52.0,
    image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=800&q=80',
    categoryId: 'cat-pizzas',
    active: true,
  },
  {
    id: 'p-pizza-pepperoni',
    name: 'Pizza Pepperoni',
    description: 'Mussarela, fatias generosas de pepperoni italiano e orégano em massa artesanal.',
    price: 58.0,
    image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=800&q=80',
    categoryId: 'cat-pizzas',
    active: true,
  },
  {
    id: 'p-suco-laranja',
    name: 'Suco de Laranja',
    description: 'Suco natural 500ml, feito na hora com laranjas frescas. Sem açúcar adicionado.',
    price: 12.0,
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&q=80',
    categoryId: 'cat-bebidas',
    active: true,
  },
  {
    id: 'p-vinho-taca',
    name: 'Taça de Vinho Tinto',
    description: 'Seleção especial da casa — uva Cabernet Sauvignon, servida em taça de cristal.',
    price: 28.0,
    image: 'https://images.unsplash.com/photo-1648146299076-ec0c5e5ead00?w=800&q=80',
    categoryId: 'cat-bebidas',
    active: true,
  },
  {
    id: 'p-sobremesa-chocolate',
    name: 'Petit Gateau de Chocolate',
    description: 'Bolo quente de chocolate belga com recheio cremoso, acompanhado de sorvete de creme.',
    price: 24.9,
    image: 'https://images.unsplash.com/photo-1583528225108-295481722b35?w=800&q=80',
    categoryId: 'cat-sobremesas',
    active: true,
  },
  {
    id: 'p-sobremesa-cupcake',
    name: 'Cupcake Red Velvet',
    description: 'Clássico cupcake red velvet com cobertura de cream cheese e cereja caramelizada.',
    price: 18.0,
    image: 'https://images.unsplash.com/photo-1574085733277-851d9d856a3a?w=800&q=80',
    categoryId: 'cat-sobremesas',
    active: true,
  },
  {
    id: 'p-batata-rustica',
    name: 'Batata Rústica',
    description: 'Batatas rústicas assadas com alecrim, páprica defumada e maionese artesanal.',
    price: 22.0,
    image: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800&q=80',
    categoryId: 'cat-acompanhamentos',
    active: true,
  },
  {
    id: 'p-onion-rings',
    name: 'Anéis de Cebola',
    description: 'Anéis de cebola empanados e crocantes, servidos com molho especial da casa.',
    price: 19.9,
    image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80',
    categoryId: 'cat-acompanhamentos',
    active: true,
  },
]

async function ensureSeed(db) {
  const catCount = await db.collection('categories').countDocuments()
  if (catCount === 0) {
    await db.collection('categories').insertMany(SEED_CATEGORIES)
  }
  const prodCount = await db.collection('products').countDocuments()
  if (prodCount === 0) {
    await db.collection('products').insertMany(SEED_PRODUCTS)
  }
}

function stripId(doc) {
  if (!doc) return doc
  const { _id, ...rest } = doc
  return rest
}

// ---- Handlers ----
async function handleGet(request, pathParts) {
  const db = await getDb()
  await ensureSeed(db)

  const resource = pathParts[0]

  if (!resource || resource === 'health') {
    return NextResponse.json({ ok: true, service: 'restaurant-api' })
  }

  if (resource === 'categories') {
    const categories = await db.collection('categories').find({}).sort({ order: 1 }).toArray()
    return NextResponse.json(categories.map(stripId))
  }

  if (resource === 'products') {
    const products = await db.collection('products').find({ active: true }).toArray()
    return NextResponse.json(products.map(stripId))
  }

  if (resource === 'orders' && pathParts[1]) {
    const order = await db.collection('orders').findOne({ id: pathParts[1] })
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    return NextResponse.json(stripId(order))
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

async function handlePost(request, pathParts) {
  const db = await getDb()
  const resource = pathParts[0]

  if (resource === 'orders') {
    const body = await request.json()
    const { type, items, customer, table, address, payment, notes, userId } = body

    if (!type || !['local', 'delivery'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de pedido inválido' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })
    }

    // Snapshot items with latest product info
    const productIds = items.map((i) => i.productId)
    const products = await db.collection('products').find({ id: { $in: productIds } }).toArray()
    const prodMap = Object.fromEntries(products.map((p) => [p.id, p]))

    const snapshotItems = items.map((i) => {
      const p = prodMap[i.productId]
      if (!p) throw new Error(`Produto ${i.productId} inexistente`)
      return {
        productId: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        quantity: i.quantity,
        observations: i.observations || '',
        subtotal: p.price * i.quantity,
      }
    })

    const total = snapshotItems.reduce((s, i) => s + i.subtotal, 0)

    const order = {
      id: uuidv4(),
      type,
      userId: userId || null,
      customer: customer || { name: 'Visitante' },
      items: snapshotItems,
      total,
      notes: notes || '',
      status: type === 'local' ? 'Recebido' : 'Aguardando confirmação',
      statusHistory: [
        {
          status: type === 'local' ? 'Recebido' : 'Aguardando confirmação',
          at: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    }

    if (type === 'local') {
      if (!table) return NextResponse.json({ error: 'Número da mesa obrigatório' }, { status: 400 })
      order.table = String(table)
    } else {
      if (!address || !address.street) {
        return NextResponse.json({ error: 'Endereço obrigatório' }, { status: 400 })
      }
      order.address = address
      order.payment = {
        method: payment?.method || 'Pix',
        status: 'Pendente (simulado)',
      }
    }

    await db.collection('orders').insertOne(order)
    return NextResponse.json(stripId(order), { status: 201 })
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
