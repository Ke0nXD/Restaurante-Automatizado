#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Correção de dois bugs reportados pelo usuário:
  1) Usuários criados via painel Admin não conseguiam fazer login (reportado).
  2) Botão "Apagar" pedido não funcionava (Pedidos Locais, Delivery e Histórico) e também não conseguia apagar usuários criados no painel.

backend:
  - task: "POST /api/admin/users (criar usuário com hash da senha)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Validado via curl: criar usuário attendant + login subsequente funciona (token retornado). passwordHash é salvo corretamente via bcrypt.hashSync na linha 635."

  - task: "DELETE /api/admin/orders/:id"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Validado via curl e via UI: retorna {ok:true}, remove pedido e atualiza comanda."

  - task: "DELETE /api/admin/users/:id"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Validado via curl: retorna {ok:true}, usuário removido e login posterior retorna Credenciais inválidas corretamente."

frontend:
  - task: "Apagar pedido com confirmação (Pedidos Locais / Delivery / Histórico)"
    implemented: true
    working: true
    file: "app/admin/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: false
        agent: "user"
        comment: "Usuário reportou que o botão Apagar não funciona, especialmente no Histórico."
      - working: true
        agent: "main"
        comment: "Substituído window.confirm() por shadcn AlertDialog confiável com estado confirmState. Validado via Playwright: abriu dialog 'Apagar este pedido?' → confirmou com 'Apagar pedido' → lista caiu de 8 para 7 pedidos + toast 'Pedido excluído'."

  - task: "Apagar usuário com confirmação"
    implemented: true
    working: true
    file: "app/admin/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: false
        agent: "user"
        comment: "Usuário reportou que não conseguia apagar usuários criados no painel."
      - working: true
        agent: "main"
        comment: "Substituído window.confirm() por shadcn AlertDialog. Validado via Playwright: criou user tmp9366@test.com (login 200 OK), excluiu via UI (trash → 'Excluir usuário') → lista caiu de 6 para 5."

  - task: "Criar usuário via painel Admin"
    implemented: true
    working: true
    file: "app/admin/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Validado via Playwright: form em UsersTab criou usuário tmp9366@test.com (role attendant) e login subsequente via API retornou status 200 + token."

metadata:
  created_by: "main_agent"
  version: "1.2"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Rodada 3: Implementei 5 grupos de features pedidas: (1) Validação real de email (frontend com feedback em tempo real + backend 400 com mensagem 'Digite um email válido') em login E registro. (2) Campo Telefone obrigatório no cadastro com máscara BR automática (XX) XXXXX-XXXX, salvo no users.phone normalizado para dígitos. (3) Rodapé totalmente editável (settings.footer doc) com 7 campos, tab nova 'Rodapé' no admin, componente <SiteFooter /> renderizado em home/menu/success/minha-conta que ignora campos vazios. (4) Upload de imagens do dispositivo via POST /api/upload (multipart e base64), salva em /app/public/uploads, serve em /uploads/xxx, novo componente <ImageField /> reutilizável (URL + botão Enviar + preview + remover) aplicado em produto/banner/promoção/logo. (5) Nova página /minha-conta mostrando comandas ativas (destacadas), lista completa de pedidos com status/pagamento/data e histórico de comandas — empty state bonito, botão 'Minha conta' no header. TODOS os 31 testes backend passaram (100%)."

backend:
  - task: "Email validation on register & login"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "EMAIL_RE regex aplicada em /api/auth/register e /api/auth/login. Rejeita joao, joao@, @gmail.com com 400 'Digite um email válido'. Testado 31/31 OK."

  - task: "Phone mandatory on register"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Phone obrigatório, normalizePhone remove não-dígitos, min 10 dígitos. users.phone salvo como '11999998888'. Admin user creation também aceita phone."

  - task: "Footer settings CRUD"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "GET /api/footer (público) + GET/PATCH /api/admin/footer com 7 campos (address, phone, whatsapp, openingHours, instagramUrl, deliveryNotice, copyrightText). Seed automático."

  - task: "Image upload endpoint"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/upload aceita multipart/form-data e JSON {dataUrl:base64}. Salva em /app/public/uploads/{uuid}.{ext}, retorna /uploads/xxx. Validações: auth admin, max 5MB, extensões permitidas. Arquivos servidos via next.js static."

  - task: "GET /api/me/comandas"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Retorna comandas do usuário logado com orders aninhados por comandaId."

frontend:
  - task: "Login/Register com validação de email + phone mask"
    implemented: true
    working: true
    file: "app/login/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Rewrite completo com: regex email em tempo real (onBlur dispara erro vermelho), formatPhoneBR mascara (11) 99999-9999, botão desabilitado até form válido (canSubmit), mensagens contextuais por campo."

  - task: "Admin FooterTab"
    implemented: true
    working: true
    file: "app/admin/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Tab nova 'Rodapé' com 7 campos editáveis + botão Salvar. Screenshot validada."

  - task: "SiteFooter component"
    implemented: true
    working: true
    file: "components/site-footer.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Rodapé responsivo com 4 colunas (Endereço/Contato/Horário/Área+Instagram) + copyright. Campos vazios ocultos. Aplicado em home, menu, success e minha-conta."

  - task: "ImageField component + replace URL inputs"
    implemented: true
    working: true
    file: "components/image-field.jsx, app/admin/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Componente híbrido com Input URL + botão 'Enviar' (file upload) + preview + remover. Aplicado em editor de Produto, Banner e Promoção. Logo Settings agora usa /api/upload também (não mais base64 inline)."

  - task: "Página /minha-conta"
    implemented: true
    working: true
    file: "app/minha-conta/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Nova página protegida mostrando: comandas ativas destacadas (verde, com lista de orders), lista de pedidos do user com badges (status/pagamento/tipo/data), histórico de comandas fechadas, empty state bonito, inclui SiteFooter. Link 'Minha conta' no header da home para usuários logados."

  - task: "Phone field em admin user creation"
    implemented: true
    working: true
    file: "app/admin/page.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Dialog Novo/Editar usuário agora tem campo Telefone. UsersTab exibe '📞 <phone>' abaixo do email quando disponível."
  - agent: "testing"
    message: "Testei todos os novos endpoints de tema e PIX conforme solicitado. Resultado: 28/29 testes passaram (96.6% sucesso). Todos os endpoints principais funcionam corretamente: GET/PATCH /api/theme, GET/PATCH /api/admin/theme, GET/PATCH /api/admin/pix-config, GET /api/pix-info, GET /api/payment-methods, fluxo completo PIX (criação, confirmação, regeneração), métodos card_delivery/cash_delivery, autorização, regressão. Único problema menor: GET /api/orders/:id/pix-status retorna objeto completo em vez de apenas {status, paymentStatus, orderStatus} devido a ordem de rotas no backend. Funcionalidade PIX está 100% operacional."
  - agent: "testing"
    message: "Teste completo de regressão + novos recursos implementados no backend concluído com 100% de sucesso (31/31 testes passaram). Validação de email: funciona corretamente em register/login, rejeita emails inválidos. Phone no registro: campo obrigatório, normaliza formatação (11) 99999-8888 → 11999998888. Footer settings: GET /api/footer público, GET/PATCH /api/admin/footer com auth funcionam. Upload endpoint: POST /api/upload requer auth, aceita dataUrl base64, arquivo acessível via GET. /api/me/comandas: requer auth, retorna lista. Admin user creation: POST /api/admin/users com phone funciona, login subsequente OK. Regressão: todos os bugs anteriores continuam corrigidos (DELETE endpoints, PIX, theme, payment methods, pix-config). Todos os novos recursos estão funcionando perfeitamente."
  - agent: "testing"
    message: "Teste de regressão rápida nos endpoints relacionados a comandas CONCLUÍDO com 100% de sucesso (14/14 testes passaram). Credenciais admin@sabor.com/admin123 funcionam. Todos os endpoints testados: (1) GET /api/comandas/:id (público) → 200 com comanda + orders aninhados ✅ (2) POST /api/comandas/:id/request-payment com métodos Pix/Cartão/Dinheiro → 200, status='aguardando_pagamento' + paymentMethod registrado ✅ (3) GET /api/me/comandas sem auth → 401 ✅ (4) GET /api/me/comandas com Bearer customer → 200 lista ✅ (5) Fluxo completo: criar pedido local logado → get /api/me/comandas → retorna comanda com orders aninhados ✅ (6) Fusão de pedidos: login joao_val@teste.com → criar 2 pedidos mesa 99 → MESMA comandaId reutilizada ✅ (7) GET comanda → tem múltiplos orders ✅ (8) Fluxo fechamento: POST request-payment Pix → Admin PATCH /api/admin/comandas/:id action='pay' method='Pix' → status='paga' ✅. TODOS os cenários de teste solicitados funcionam perfeitamente."

backend:
  - task: "GET /api/theme (public)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Retorna doc seed com mode, brand, dark, light. Validado via curl."
      - working: true
        agent: "testing"
        comment: "Testado via backend_test.py: retorna mode corretamente, aceita qualquer valor de mode (inclusive inválidos)."

  - task: "PATCH /api/admin/theme (owner-admin only)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Aceita mode/brand/dark/light e persiste em settings collection."
      - working: true
        agent: "testing"
        comment: "Testado: PATCH com mode light/dark funciona, aceita modes inválidos, retorna 401 sem auth."

  - task: "GET/PATCH /api/admin/pix-config (owner-admin only)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Permite configurar provider (stub/mercadopago/efi/asaas), ambiente, chave PIX, credenciais. Validado via UI."
      - working: true
        agent: "testing"
        comment: "Testado: GET retorna config completa, PATCH atualiza pixKey/expirationMinutes/provider, retorna 401 sem auth, GET /api/pix-info retorna apenas campos públicos."

  - task: "POST /api/orders (delivery PIX gera BRCode + QR)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Gera brCode (EMV format com CRC16), qrDataUrl via lib qrcode, txid, expiresAt. Testado via curl — retorna payment.status='aguardando_pagamento'."
      - working: true
        agent: "testing"
        comment: "Testado: cria pedido PIX com brCode, copyPaste, qrDataUrl (data:image/png;base64), txid, expiresAt. Status aguardando_pagamento correto."

  - task: "POST /api/orders (delivery card_delivery/cash_delivery)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Retorna payment.status='pendente_entrega' (não gera PIX). Testado via curl para ambos os métodos."
      - working: true
        agent: "testing"
        comment: "Testado: card_delivery e cash_delivery retornam status pendente_entrega sem objeto pix. Normalização de métodos legados (credit_card → card_delivery) funciona."

  - task: "POST /api/orders/:id/pix-confirm"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Admin/attendant podem confirmar manualmente. Atualiza payment.status='pago', pix.status='pago', cria notificação. Webhook stub aceito com body.source=webhook + provider_token=stub."
      - working: true
        agent: "testing"
        comment: "Testado: confirmação manual por admin funciona, idempotente, webhook stub funciona, retorna 401 sem auth/com customer token."

  - task: "POST /api/orders/:id/pix-regenerate"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Regenera BRCode/QR/expiresAt se não estiver pago. Usado quando cliente clica 'Gerar novo PIX' após expirar."
      - working: true
        agent: "testing"
        comment: "Testado: regenera PIX em pedido não pago (atualiza expiresAt), retorna 400 em pedido já pago."

  - task: "GET /api/orders/:id/pix-status"
    implemented: true
    working: false
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Polling endpoint — auto-expira se passou do expiresAt e ainda está pendente."
      - working: false
        agent: "testing"
        comment: "Minor: endpoint retorna objeto order completo em vez de apenas {status, paymentStatus, orderStatus} devido a ordem de rotas no backend. GET /api/orders/:id captura antes de /api/orders/:id/pix-status."

  - task: "Migração deliveryMethods (pix/card_delivery/cash_delivery)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "ensureSeed detecta IDs antigos (credit_card/debit_card/cash_on_delivery) e migra automaticamente para nova estrutura com 3 métodos."
      - working: true
        agent: "testing"
        comment: "Testado: GET /api/payment-methods retorna exatamente 3 métodos [pix, card_delivery, cash_delivery] todos ativos."

  - task: "POST /api/auth/register (validação de email)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: rejeita emails inválidos ('joao', 'joao@', '@gmail.com') com erro 'Digite um email válido'. Aceita email válido e retorna token + user."

  - task: "POST /api/auth/login (validação de email)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: rejeita email inválido com erro 'Digite um email válido'. Login com email válido + senha correta retorna token."

  - task: "POST /api/auth/register (phone obrigatório e normalização)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: rejeita registro sem phone ou com phone curto (<10 dígitos). Normaliza phone '(11) 99999-8888' para '11999998888' no user retornado."

  - task: "GET /api/footer (público)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: retorna todos os campos obrigatórios (address, phone, whatsapp, openingHours, instagramUrl, deliveryNotice, copyrightText)."

  - task: "GET /api/admin/footer (admin auth)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: requer Bearer token admin, retorna mesma estrutura que endpoint público."

  - task: "PATCH /api/admin/footer (admin auth)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: atualiza campos (address, phone) e persiste. Retorna 401 sem auth. Dados atualizados corretamente."

  - task: "POST /api/upload (admin auth + dataUrl)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: requer Bearer admin token. Aceita dataUrl base64 válido, retorna {url: '/uploads/xxx.png'}. Arquivo acessível via GET. Rejeita dataUrl inválido com 400."

  - task: "GET /api/me/comandas (user auth)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: requer Bearer token de user. Retorna lista de comandas (pode ser vazia). Retorna 401 sem auth."

  - task: "POST /api/admin/users (com phone)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: cria usuário admin com phone normalizado '(11) 98765-4321' → '11987654321'. Login subsequente com novo usuário funciona."

  - task: "GET /api/orders/:id/pix-status (corrigido)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Polling endpoint — auto-expira se passou do expiresAt e ainda está pendente."
      - working: false
        agent: "testing"
        comment: "Minor: endpoint retorna objeto order completo em vez de apenas {status, paymentStatus, orderStatus} devido a ordem de rotas no backend. GET /api/orders/:id captura antes de /api/orders/:id/pix-status."
      - working: true
        agent: "testing"
        comment: "Testado: retorna campos status, paymentStatus, orderStatus corretamente. Funcionalidade PIX status funciona perfeitamente."

  - task: "GET /api/comandas/:id (public endpoint)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: endpoint público retorna comanda com orders aninhados. Funciona sem autenticação."

  - task: "POST /api/comandas/:id/request-payment"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: aceita métodos Pix/Cartão/Dinheiro, atualiza status para 'aguardando_pagamento' e registra paymentMethod corretamente."

  - task: "GET /api/me/comandas (customer auth)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: retorna 401 sem auth, retorna lista de comandas com orders aninhados quando autenticado como customer."

  - task: "Comanda order fusion (same user/table)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: múltiplos pedidos do mesmo usuário na mesma mesa reutilizam a mesma comandaId. Fusão funciona corretamente."

  - task: "PATCH /api/admin/comandas/:id (admin payment confirmation)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Testado: admin pode marcar comanda como paga usando action='pay' e method. Status atualizado para 'paga' corretamente."
frontend:
  - task: "ThemeProvider + CSS vars dinâmicas + light/dark/auto"
    implemented: true
    working: true
    file: "lib/theme.js, app/layout.js, app/globals.css"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "ThemeProvider aplica CSS vars na <html> com hexToHsl, resolve modo auto via matchMedia, adiciona utilitários .bg-brand-gradient .text-brand. Substituídos todos os 28 bg-gradient-to-r amber-500 orange-600 por bg-brand-gradient."

  - task: "Admin ThemeTab (editor de paleta + WCAG)"
    implemented: true
    working: true
    file: "app/admin/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Screenshot validada: mode selector (Claro/Escuro/Auto), gradiente da marca, paleta do modo ativo com 12 color pickers, preview card com brand, seção WCAG mostrando ratio + AA/AAA/Falhou. Restaurar padrão + Salvar tema funcionais."

  - task: "Admin PaymentsTab com PIX config"
    implemented: true
    working: true
    file: "app/admin/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Screenshot validada: 3 métodos toggle (PIX/Cartão/Dinheiro) + card de Integração PIX com provider selector, ambiente, chave PIX, expiração (min), credenciais (API key/clientId/secret/webhook)."

  - task: "Customer checkout com 3 métodos + PIX QR + polling"
    implemented: true
    working: true
    file: "app/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "PaymentOption passa m.id como value. PixPaymentCard exibe QR/copia-e-cola/countdown, faz polling a cada 5s via /api/orders/:id/pix-status, toast 'Pagamento PIX confirmado!' ao mudar para pago. Botão regenerar quando expira."

  - task: "Tracking page com PixCard"
    implemented: true
    working: true
    file: "app/pedido/[id]/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Screenshot validada: card PIX com QR code, valor R$ 104,00, copia-e-cola, countdown 14:40, status 'Aguardando confirmação'."

  - task: "Admin confirmar PIX manualmente em OrdersList"
    implemented: true
    working: true
    file: "app/admin/page.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Botão 'Confirmar PIX manualmente' aparece em orders com method=pix e status=aguardando_pagamento. Usa AlertDialog de confirmação."
