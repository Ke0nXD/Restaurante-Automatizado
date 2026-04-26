# 🍽️ Sabor & Arte — Sistema Completo de Restaurante

> Plataforma full-stack de gestão de restaurante com cardápio digital, pedidos no local (comandas), delivery, painel administrativo, área do cliente e fluxo dedicado para entregadores.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.6-green?logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/UI-shadcn%2Fui-black)](https://ui.shadcn.com/)
[![License](https://img.shields.io/badge/license-Proprietary-red)](#-licença)

---

## 📖 Sobre o Projeto

**Sabor & Arte** é um sistema web completo para restaurantes, construído com Next.js 14 (App Router), MongoDB e Tailwind CSS. A aplicação cobre toda a operação do negócio — do cardápio digital exibido ao cliente até o controle interno de pedidos, comandas e equipe de atendimento.

O sistema oferece duas modalidades de atendimento: **No Local** (com agrupamento automático de pedidos por **comanda**/mesa) e **Delivery** (com endereço, métodos de pagamento e fluxo de confirmação pelo entregador). O cliente acompanha tudo em uma área "Minha Conta" com histórico, comandas ativas e rastreamento em tempo real.

Foi pensado para **estabelecimentos de pequeno e médio porte** que querem digitalizar a operação sem depender de múltiplas ferramentas — cardápio, pedidos, comandas, equipe, identidade visual e conteúdo institucional ficam todos em um só painel administrativo, totalmente customizável.

---

## ✨ Principais Funcionalidades

### 👤 Área do Cliente
- 🔐 **Cadastro e login** com validação rigorosa de e-mail e telefone (10–13 dígitos)
- 🪑 **Escolha de modalidade**: "Estou no Local" (informa a mesa) ou "Delivery" (informa endereço)
- 📜 **Cardápio dinâmico** com categorias, banner promocional e seção de destaques
- ➕ **Adicionais com preço extra** por produto (ex.: bacon, queijo, dose dupla)
- 📝 **Observações em texto livre** por item ("sem cebola", "ponto da carne", etc.)
- 🛒 **Carrinho persistente** com cálculo automático de subtotais incluindo adicionais
- 🧾 **Conta aberta no local** — múltiplos pedidos da mesma mesa são agrupados na **mesma comanda**
- 📍 Página **"Minha Conta"** com:
  - Comandas ativas com itens, total e ações (pedir a conta, adicionar mais itens)
  - Histórico de pedidos delivery com status em tempo real
- 💳 **Métodos de pagamento delivery**: PIX (com QR Code BR Code dinâmico), Cartão na Entrega, Dinheiro com cálculo automático de troco
- ✅ **Confirmação de recebimento** do delivery pelo próprio cliente

### 🛠️ Painel Administrativo
- 📊 **Dashboard** com KPIs de vendas (dia, mês, pedidos pendentes, comandas abertas, distribuição por método de pagamento)
- 🍔 **Gestão de produtos** com upload de imagem (do dispositivo ou via URL), categorias, adicionais editáveis e flag de destaque
- 🏷️ **Categorias** ordenáveis com ícones emoji
- 🍳 **Pedidos no Local** com mudança de status (Recebido → Em preparo → Pronto → Entregue → Finalizado)
- 🛵 **Pedidos Delivery** com fluxo completo e filtros avançados
- 🧾 **Comandas** segregadas em três abas: aguardando pagamento, abertas e fechadas
  - Admin Dono pode **excluir comandas fechadas** com cascata nos pedidos relacionados
- 📅 **Histórico** consolidado com filtros por data, valor, status, método de pagamento, mesa e endereço
- 👥 **Gestão de equipe** com 3 papéis: **Admin Dono**, **Atendente** e **Entregador (Motoboy)**
- 🎨 **Editor de Tema** dinâmico:
  - Modo Claro / Escuro / Auto
  - Cores 100% customizáveis (background, foreground, primary, accent, etc.) com **validação automática de contraste WCAG**
- 🦶 **Editor de Rodapé**: endereço, telefone, WhatsApp, Instagram, horário de funcionamento, área atendida e copyright
- ℹ️ **Página "Sobre o Estabelecimento"** com editor de texto rico (markdown simples) totalmente editável
- 💰 **Configuração de Métodos de Pagamento** para delivery (ativar/desativar PIX, cartão, dinheiro)
- 🔑 **Configuração PIX** com suporte a múltiplos provedores (stub, MercadoPago, Efí, Asaas) — chave PIX, merchant, expiração
- 🔔 **Sistema de notificações** segmentado por papel (novos pedidos, pedidos de pagamento, etc.)

### 🛵 Área do Motoboy / Entregador
- 📋 Lista de pedidos delivery atribuídos
- 💵 **Confirmação de pagamento em 2 etapas**:
  1. O entregador confirma se o cliente pagou (cartão/dinheiro na entrega)
  2. Se **não pagou**, o pedido é automaticamente marcado como **"Não Entregue"** com motivo obrigatório
- ✅ Marcação de **Entregue** (pendente confirmação do cliente) ou **Não Entregue + motivo**
- 📜 Pedidos finalizados migram automaticamente para o histórico

---

## 🧰 Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework** | [Next.js 14.2](https://nextjs.org/) (App Router, Server Components, API Routes) |
| **Runtime** | Node.js 18+ |
| **Linguagem** | JavaScript (ES2022) |
| **UI** | [Tailwind CSS 3.4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix Primitives) |
| **Ícones** | [Lucide React](https://lucide.dev/) |
| **Banco de dados** | [MongoDB 6.6](https://www.mongodb.com/) (driver oficial Node) |
| **Autenticação** | JWT (`jsonwebtoken`) + hash de senha com `bcryptjs` |
| **Identificadores** | UUID v4 (`uuid` + `crypto.randomUUID()`) — **nunca ObjectId** |
| **Validação de Forms** | `react-hook-form` + `@hookform/resolvers` + `zod` |
| **Tabelas** | `@tanstack/react-table` |
| **Gráficos** | `recharts` |
| **PIX / QR Code** | `qrcode` + gerador BR Code EMV próprio |
| **Notificações UI** | `sonner` (toast) |
| **Datas** | `date-fns` |
| **Tema** | `next-themes` + variáveis CSS dinâmicas |

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

- **Node.js** ≥ 18.17 ([download](https://nodejs.org/))
- **Yarn** ≥ 1.22 ([download](https://classic.yarnpkg.com/)) — o projeto usa Yarn, **não use npm** para evitar conflitos no `lockfile`
- **MongoDB** ≥ 5.0 (local ou Atlas) — o sistema cria automaticamente as coleções e dados de seed na primeira execução

---

## ⚙️ Instalação e Configuração

### 1. Clone o repositório
```bash
git clone https://github.com/Ke0nXD/Restaurante-Automatizado.git
cd sabor-arte
```

### 2. Instale as dependências
```bash
yarn install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto (ou copie do `.env.example` se existir):

```env
# Banco de Dados
MONGO_URL=mongodb://localhost:27017
DB_NAME=restaurant_app

# URL pública (sem barra final)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Segurança
JWT_SECRET=troque-por-uma-chave-aleatoria-forte

# CORS (separado por vírgula)
CORS_ORIGINS=http://localhost:3000
```

> ⚠️ **Nunca commite o `.env`** — ele já está no `.gitignore`. Para produção, use chaves geradas com `openssl rand -hex 32`.

### 4. Suba o MongoDB
Local:
```bash
# macOS (via brew)
brew services start mongodb-community

# Linux (via systemd)
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name mongo mongo:7
```

Ou use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) gratuito e atualize `MONGO_URL`.

### 5. Inicie o servidor de desenvolvimento
```bash
yarn dev
```

A aplicação estará disponível em **http://localhost:3000**.

> Na primeira execução, o sistema **popula automaticamente** o banco com:
> - 5 categorias e 10 produtos de exemplo
> - 1 banner e 2 promoções
> - Configurações default de tema, rodapé, página "Sobre", PIX e métodos de pagamento
> - **Usuário Admin Dono**: `admin@sabor.com` / `admin123` (⚠️ altere imediatamente em produção)

### 6. Build de produção
```bash
yarn build
yarn start
```

---

## 🔑 Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|---|---|---|
| `MONGO_URL` | String de conexão MongoDB (ex.: `mongodb://localhost:27017` ou Atlas SRV) | ✅ |
| `DB_NAME` | Nome do banco (default: `restaurant_app`) | ✅ |
| `NEXT_PUBLIC_BASE_URL` | URL pública da aplicação (usada no front para chamadas absolutas) | ✅ |
| `JWT_SECRET` | Chave secreta de assinatura dos tokens JWT (mínimo 32 caracteres) | ✅ |
| `CORS_ORIGINS` | Origens permitidas para CORS, separadas por vírgula | Opcional |

---

## 🚀 Fluxos Principais de Uso

### 🪑 Cliente no Local
1. Abre o cardápio → escolhe **"Estou no Local"** → informa o **número da mesa**
2. Adiciona produtos ao carrinho (com adicionais e observações)
3. Finaliza pedido → backend cria/atualiza a **comanda** vinculada à mesa+usuário
4. Pode adicionar mais pedidos ao longo da refeição (todos vão para a mesma comanda)
5. Acessa **"Minha Conta"** → clica em **"Pedir a Conta"** e escolhe método de pagamento
6. Atendente confirma o pagamento no admin → comanda é fechada

### 🛵 Cliente no Delivery
1. Escolhe **"Delivery"** → informa endereço completo
2. Monta o carrinho → seleciona método de pagamento (PIX / Cartão na Entrega / Dinheiro)
3. Se **dinheiro**, informa "Troco para quanto?" → sistema calcula automaticamente
4. Se **PIX**, recebe QR Code BR Code + Copia-e-Cola com expiração configurável
5. Acompanha o status do pedido em tempo real
6. Quando o motoboy marcar como entregue, o cliente confirma o recebimento na "Minha Conta"

### 🛠️ Admin (Dono / Atendente)
1. Login no `/login` → redirecionado para `/admin`
2. **Dashboard** mostra KPIs do dia/mês
3. Cadastra/edita produtos, categorias, banners e promoções (com upload de imagem do dispositivo)
4. Acompanha pedidos por aba (Comandas, Local, Delivery, Histórico)
5. Atualiza status manualmente conforme andamento na cozinha
6. Personaliza tema (cores + dark mode), rodapé e página "Sobre"
7. Cria contas para Atendentes e Entregadores

### 🛵 Motoboy
1. Login → vê apenas a aba **Delivery** com pedidos atribuídos
2. Ao chegar com o pedido, abre o pedido e marca:
   - **"Cliente pagou?"** (Sim / Não) — apenas para cartão/dinheiro
   - **Status de entrega**: Entregue / Não Entregue
   - Se "Não Entregue" → **motivo obrigatório**
3. Se cliente não pagou → pedido cai automaticamente em "Não Entregue"
4. Pedidos finalizados saem da aba ativa e vão para o **Histórico**

---

## 🏗️ Estrutura de Pastas

```
.
├── app/
│   ├── api/[[...path]]/route.js    # API monolítica (catch-all Next.js)
│   ├── api/upload/route.js         # Endpoint dedicado de upload
│   ├── page.js                     # SPA do Cliente (cardápio + carrinho + checkout)
│   ├── layout.js                   # Layout root + ThemeProvider
│   ├── globals.css                 # Estilos globais + variáveis CSS de tema
│   ├── admin/page.js               # SPA do Painel Admin
│   ├── login/page.js               # Tela de autenticação
│   ├── minha-conta/page.js         # Área do cliente (comandas + histórico)
│   ├── comanda/[id]/page.js        # Rastreio individual de comanda no local
│   ├── pedido/[id]/page.js         # Rastreio individual de pedido delivery
│   └── sobre/page.js               # Página pública "Sobre" (renderiza markdown editável)
│
├── components/
│   ├── ui/                         # shadcn/ui (button, card, dialog, etc.)
│   ├── image-field.jsx             # Componente de upload OU URL de imagem
│   ├── rich-text.jsx               # Editor/renderizador de texto rico simples
│   └── site-footer.jsx             # Rodapé global dinâmico
│
├── lib/
│   ├── auth.js                     # apiFetch, getUser, getToken, clearAuth
│   ├── branding.js                 # Hook + Logo dinâmico do restaurante
│   ├── theme.js                    # Hook de tema, contrastRatio, WCAG label
│   └── utils.js                    # cn() para merge de classes Tailwind
│
├── public/uploads/                 # Imagens enviadas pelo admin (persistente)
├── memory/                         # Documentos internos do projeto
├── .env                            # Variáveis de ambiente (NÃO COMMITAR)
├── package.json
├── tailwind.config.js
└── README.md                       # Este arquivo
```

---

## 🗄️ Modelo de Dados (MongoDB)

| Coleção | Campos principais |
|---|---|
| `users` | `id` (UUID), `email`, `name`, `phone`, `passwordHash` (bcrypt), `role` (`owner_admin`/`attendant`/`delivery_driver`/`customer`) |
| `categories` | `id`, `name`, `slug`, `icon`, `order` |
| `products` | `id`, `name`, `description`, `price`, `image`, `categoryId`, `active`, `featured`, `addOns: [{id, name, price, active}]` |
| `orders` | `id`, `type` (`local`/`delivery`), `comandaId`, `userId`, `items[]`, `total`, `status`, `statusHistory[]`, `payment`, `delivery`, `pix`, `address` |
| `comandas` | `id`, `table`, `customer`, `userId`, `status` (`aberta`/`aguardando_pagamento`/`paga`/`fechada`), `total`, `orderIds[]` |
| `banners` | `id`, `title`, `subtitle`, `image`, `buttonText`, `buttonLink`, `active` |
| `promotions` | `id`, `title`, `description`, `image`, `priceText`, `active`, `order` |
| `settings` | Documentos com `id`: `branding`, `theme`, `footer`, `about`, `payment-methods`, `pix-config` |
| `notifications` | `id`, `type`, `referenceId`, `title`, `message`, `targetRoles[]`, `readBy[]` |

> ⚠️ **Identificadores**: o projeto usa **exclusivamente UUIDs** (`crypto.randomUUID()`). O `_id` ObjectId do Mongo é sempre filtrado nas respostas (helper `stripId`).

---

## 🌐 API REST

Todos os endpoints são prefixados com `/api`.

### Públicos
- `GET /api/health` — healthcheck
- `GET /api/categories` — categorias ativas
- `GET /api/products?featured=1` — produtos (com filtro de destaques)
- `GET /api/banner` — banner ativo
- `GET /api/promotions` — promoções ativas
- `GET /api/settings` — branding (nome, logo, slogan)
- `GET /api/theme` — tema dinâmico
- `GET /api/footer` — dados do rodapé
- `GET /api/about` — conteúdo da página "Sobre"
- `GET /api/payment-methods` — métodos de pagamento ativos
- `POST /api/auth/register` — cadastro
- `POST /api/auth/login` — login
- `POST /api/orders` — criar pedido (local ou delivery)

### Autenticadas (cliente)
- `GET /api/auth/me` — dados do usuário logado
- `GET /api/me/orders` — meus pedidos
- `GET /api/me/comandas` — minhas comandas com pedidos relacionados
- `GET /api/orders/:id` — rastreio de pedido
- `GET /api/comandas/:id` — rastreio de comanda
- `POST /api/comandas/:id/request-payment` — pedir a conta
- `POST /api/orders/:id/confirm-delivery` — cliente confirma recebimento
- `POST /api/orders/:id/pix-regenerate` — gerar novo QR Code PIX
- `GET /api/orders/:id/pix-status` — polling de pagamento PIX

### Admin (com Bearer Token)
- `GET/POST/PATCH/DELETE /api/admin/orders` — gestão completa de pedidos
- `GET/POST/PATCH/DELETE /api/admin/products` — produtos
- `GET/POST/PATCH/DELETE /api/admin/categories` — categorias
- `GET/POST/PATCH/DELETE /api/admin/users` — equipe (apenas Admin Dono)
- `GET/PATCH/DELETE /api/admin/comandas/:id` — comandas
- `PATCH /api/admin/orders/:id/delivery-status` — fluxo do motoboy
- `PATCH /api/admin/theme | footer | about | settings | payment-methods | pix-config`
- `GET /api/admin/stats` — KPIs do dashboard
- `GET /api/admin/notifications` + `POST` (`read` / `read-all`)
- `POST /api/admin/orders/:id/pix-confirm` — confirmação manual de PIX
- `POST /api/upload` — upload de imagem (multipart ou base64, máx 5 MB)

---

## 🎨 Padrões e Boas Práticas

- ✅ **Identificadores UUID** em todas as coleções (nunca ObjectId)
- ✅ **Hash de senha com bcryptjs** (10 rounds)
- ✅ **JWT** com expiração de 30 dias e secret via env
- ✅ **Validação de e-mail e telefone** no backend (regex + normalização)
- ✅ **Snapshot de produto** dentro do pedido (preços não mudam retroativamente se o produto for editado)
- ✅ **Status history** em todos os pedidos (auditoria completa)
- ✅ **Controle de acesso por papel** (`requireOwner`, `requireStaff`, `requireAdmin`)
- ✅ **Variáveis CSS dinâmicas** para tema com validação WCAG de contraste
- ✅ **Cliente MongoDB cacheado** (sem reconexão a cada request)
- ✅ **Componentes Radix/shadcn** acessíveis (a11y)
- ✅ **Mobile-first** — todas as telas responsivas

---

## 🗺️ Roadmap

### 🔜 Próximos passos
- 💳 **Integração PIX real** com gateway (MercadoPago, Asaas ou Efí) + webhook de confirmação automática
- ♻️ **Refatoração modular** dos arquivos `route.js` (1.485 linhas) e `admin/page.js` (2.087 linhas) em controllers/components
- 🔔 **WebSocket / SSE** para notificações em tempo real (cozinha, atendimento, cliente)

### 🌱 Ideias futuras
- 📊 Relatórios avançados com export CSV/PDF
- 🎟️ Cupons de desconto e programa de fidelidade
- 🖨️ Impressão automática de comandas (cozinha + cliente)
- 📱 PWA com notificações push
- 🗺️ Cardápio digital com QR Code por mesa
- 📦 Controle de estoque por ingrediente
- ⏰ Pausar pedidos por horário de funcionamento
- 🏢 Suporte multi-unidade (rede de restaurantes)
- 🤖 Integração WhatsApp (confirmação de pedido + status)

---

## 🧪 Comandos Úteis

```bash
# Desenvolvimento
yarn dev                 # inicia em http://localhost:3000 (hot reload)

# Build & Produção
yarn build               # build otimizado
yarn start               # roda o build de produção

# Banco
mongo restaurant_app     # abre shell direto na database
```

### Resetar o seed
Para repopular o banco do zero:
```bash
mongosh restaurant_app --eval "db.dropDatabase()"
yarn dev   # ao iniciar, o ensureSeed() recria tudo
```

---

## 🔐 Credenciais Padrão (Dev)

| Papel | E-mail | Senha |
|---|---|---|
| **Admin Dono** | `admin@sabor.com` | `admin123` |

> 🚨 **Em produção**: altere imediatamente após o primeiro login ou crie um novo Admin e exclua este.

---

## 🤝 Contribuindo

Este projeto segue um workflow simples:

1. Faça um fork
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit: `git commit -m 'feat: minha feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

**Proprietário** — Todos os direitos reservados.

Este software é de uso privado e foi desenvolvido para fins comerciais específicos. Reprodução, distribuição ou uso comercial sem autorização expressa é proibido.

---

## 📞 Suporte

Para dúvidas, sugestões ou bugs, abra uma issue no repositório ou entre em contato com a equipe responsável.

---

<div align="center">

**Feito com ❤️ usando Next.js + MongoDB + Tailwind CSS**

⭐ Se este projeto foi útil, não esqueça de dar uma estrela!

</div>
