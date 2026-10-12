# 📋 Microsoft To Do & Trello Kanban (Full-Stack)

Um aplicativo moderno e completo de gerenciamento de tarefas que combina o melhor do **Microsoft To Do** (listas organizadas, Meu Dia, conclusão focada) com o **Trello** (Quadro Kanban com colunas customizáveis e Drag & Drop), projetado com arquitetura limpa e 100% elegível para hospedagem gratuita (**Vercel**, **Render** e **Supabase**).

---

## 🚀 1. Stack Tecnológico

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite + TypeScript | Alternador entre **Modo Lista (Microsoft To Do)** e **Modo Quadro Kanban (Trello)** com drag-and-drop nativo |
| **Estilização** | Tailwind CSS | Design refinado com paleta harmoniosa, badges e micro-animações |
| **Backend** | Node.js + Express + TypeScript | API RESTful com arquitetura limpa em controllers, rotas e serviços |
| **Banco de Dados** | PostgreSQL via Supabase | Banco relacional escalável com suporte a connection pooling |
| **ORM** | Prisma ORM | Modelagem tipada de `Task` e `Column`, migrations e suporte a self-relations |

---

## 🗂️ 2. Quadro Kanban estilo Trello & Gestão de Colunas

O aplicativo permite trabalhar tanto no **Modo Lista** quanto no **Modo Quadro Kanban**:
1. **Arrastar e Soltar (Drag & Drop):** Mova cards livremente entre as colunas (ex: do *Backlog* para *Em Progresso* ou *Meu Dia*). O card tem atualização otimista imediata na interface e sincronização automática com a API.
2. **Criação de Novas Colunas:** Crie colunas adicionais personalizadas (ex: "Em Andamento", "Revisão", "Ideias", "Bloqueado") escolhendo o nome e a cor do marcador.
3. **Edição e Exclusão de Colunas:** Edite o nome ou a cor de qualquer coluna a qualquer momento. Ao excluir uma coluna, seus cartões são automaticamente preservados e transferidos para o Backlog.

---

## ⚙️ 3. Motor de Recorrência Avançado (Core)

Além das repetições diárias e semanais, o sistema suporta **recorrência mensal avançada** seguindo os padrões do Microsoft To Do / Outlook:

### Modalidades Mensais Suportadas:
1. **Dia Fixo do Mês:**
   - Exemplo: *Todo dia 15 do mês*.
   - Payload: `{"type": "monthly", "monthly_mode": "day_of_month", "day_of_month": 15}`
2. **Semana Específica e Dia da Semana (Ordinal):**
   - Exemplo: *Toda 2ª quarta-feira do mês*, *Primeira segunda-feira do mês*, ou *Última sexta-feira do mês*.
   - Payload: `{"type": "monthly", "monthly_mode": "nth_weekday", "week_number": 2, "weekday": 3}`
     - `week_number`: `1` (1ª), `2` (2ª), `3` (3ª), `4` (4ª) ou `-1` (última semana do mês).
     - `weekday`: `0` (Domingo) a `6` (Sábado).

Ao concluir a tarefa (`PATCH /tasks/:id/complete`), o backend calcula a data matematicamente precisa e insere a nova instância vinculada à tarefa mestre (`parent_task_id`).

---

## ✉️ 4. Webhook de Integração para E-mail (Make.com & Zapier)

Endpoint público para captura automática de e-mails:

- **Rota:** `POST /webhooks/incoming-email`
- **Mapeamento:**
  - `subject` -> `title`
  - `text` / `body` -> `description` (anexa remetente)
  - `list_type` -> `'backlog'`
  - `due_date` -> `null`

### Teste Rápido via PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/webhooks/incoming-email" -Method Post -ContentType "application/json" -Body '{"subject":"Proposta Comercial","text":"Segue em anexo para avaliacao","from":"cliente@empresa.com"}'
```

---

## 🔐 5. Autenticação Fechada & Provisionamento via Banco

O sistema utiliza arquitetura de **acesso restrito corporativo** (sem cadastro público / sem botão "Criar Conta"):
- **Isolamento de Dados:** Cada usuário possui seu próprio `user_id`. Ninguém visualiza ou altera dados de outro usuário.
- **Criptografia:** Senhas com salt dinâmico via `bcryptjs` e sessões assinadas com `JWT`.

### Como Criar Usuários no Banco (Supabase):

#### Método 1: Via Script CLI (Recomendado)
Na pasta `backend` ou na raiz do projeto:
```bash
npm --prefix backend run create-user "Nome Completo" "email@empresa.com" "senhaSegura123"
```
O script criptografa a senha com bcrypt e salva o usuário no banco de dados.

#### Método 2: Direto no SQL Editor do Supabase
```sql
INSERT INTO users (id, name, email, password, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Seu Nome',
  'seu-email@dominio.com',
  '$2b$10$RIYsoSqxZP5AXw5iajF74OwUkOwipZEzAr5sgGi8oO635fYuRtOkG', -- Hash bcrypt
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password, name = EXCLUDED.name, updated_at = NOW();
```

---

## 🧪 6. Bateria de Testes Automatizados

O projeto conta com testes automatizados cobrindo motor de recorrência, CRUD, isolamento de colunas, webhook e autenticação:

```powershell
npm test
```

---

## 🌐 7. Guia de Hospedagem 100% Gratuita

### Supabase (Banco de Dados PostgreSQL)
1. Crie um projeto no [Supabase](https://supabase.com).
2. Em **Database Settings**, obtenha a URL de pooling (porta 6543) e a direta (porta 5432).
3. Execute `npx prisma db push` na pasta `backend`.

### Render (Backend Node.js API)
1. Conecte o repositório no [Render](https://render.com) usando o arquivo [render.yaml](file:///d:/ProjetoTodo/render.yaml).
2. Configure as variáveis de ambiente `DATABASE_URL` e `DIRECT_URL`.

### Vercel (Frontend React)
1. Importe a pasta `frontend` no [Vercel](https://vercel.com).
2. Configure `VITE_API_URL` com a URL do Render.

---

## 🛠️ 8. Executando Localmente

```bash
# Na raiz:
npm run dev:backend   # Porta 4000
npm run dev:frontend  # Porta 5173
```
Acesse: [http://localhost:5173](http://localhost:5173).
