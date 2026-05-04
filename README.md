# automation-jockey

Backend para automação de gestão de leads via WhatsApp. Ao receber uma mensagem pelo webhook da UAZAPI, o sistema cria ou identifica o lead pelo número de telefone, atribui automaticamente um consultor pelo algoritmo de round-robin e envia uma mensagem de boas-vindas personalizada.

## Tecnologias

- **Node.js** + **TypeScript** (ESM)
- **Fastify 5** — servidor HTTP
- **Prisma 7** + **PostgreSQL 16** — banco de dados e ORM
- **Zod** — validação de variáveis de ambiente e payloads
- **UAZAPI** — integração com WhatsApp
- **Docker** — banco de dados em contêiner

## Pré-requisitos

- [Node.js](https://nodejs.org) >= 20
- [pnpm](https://pnpm.io) >= 9
- [Docker](https://www.docker.com) com Docker Compose

## Configuração do ambiente

Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp .env.example .env
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Connection string PostgreSQL (ex: `postgresql://app:app@localhost:5432/jockey`) |
| `UAZAPI_BASE_URL` | Sim | URL base da API UAZAPI |
| `WEBHOOK_SECRET` | Sim | Segredo para autenticar requisições do webhook |
| `PORT` | Não | Porta do servidor (padrão: `3000`) |

## Instalação

```bash
pnpm install
```

## Subir o banco de dados

```bash
docker compose up -d
```

## Migrations e seed

Aplique as migrations e popule o banco com dados iniciais (template de mensagem e estado do round-robin):

```bash
pnpm db:deploy
pnpm db:seed
```

## Rodar o servidor

**Desenvolvimento** (hot reload):

```bash
pnpm dev
```

**Produção:**

```bash
pnpm build
pnpm start
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT`).

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/webhooks/uazapi` | Recebe mensagens da UAZAPI |
| `GET` | `/consultants` | Lista todos os consultores |
| `POST` | `/consultants` | Cria um consultor |
| `PATCH` | `/consultants/:id` | Atualiza um consultor |
| `DELETE` | `/consultants/:id` | Remove um consultor |
| `GET` | `/templates/:key` | Busca um template de mensagem |
| `PUT` | `/templates/:key` | Cria ou atualiza um template |

### Autenticação do webhook

Envie o segredo via header `x-webhook-secret` ou query param `secret`.

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `pnpm dev` | Servidor com hot reload |
| `pnpm build` | Compila TypeScript para `dist/` |
| `pnpm start` | Inicia o servidor compilado |
| `pnpm db:migrate` | Cria e aplica nova migration |
| `pnpm db:deploy` | Aplica migrations pendentes |
| `pnpm db:generate` | Regenera o Prisma Client |
| `pnpm db:seed` | Executa o script de seed |
| `pnpm db:studio` | Abre o Prisma Studio |

## Estrutura de pastas

```
automation-jockey/
├── prisma/
│   ├── schema.prisma        # Modelos do banco de dados
│   └── seed.ts              # Script de seed
├── src/
│   ├── server.ts            # Ponto de entrada da aplicação
│   ├── env.ts               # Validação de variáveis de ambiente
│   ├── db.ts                # Instância do Prisma Client
│   ├── routes/
│   │   ├── webhook.ts       # POST /webhooks/uazapi
│   │   ├── consultants.ts   # CRUD de consultores
│   │   └── templates.ts     # Gestão de templates
│   ├── services/
│   │   ├── leads.ts         # Processamento de leads
│   │   ├── round-robin.ts   # Algoritmo de atribuição
│   │   └── template.ts      # Renderização de templates
│   └── http/
│       └── uazapi.ts        # Cliente HTTP da UAZAPI
├── docker-compose.yml
├── .env.example
└── package.json
```

## Schema do banco

| Modelo | Descrição |
|---|---|
| `Consultant` | Consultores disponíveis para atendimento |
| `Lead` | Contatos/clientes identificados pelo telefone |
| `Interaction` | Histórico de mensagens enviadas e recebidas |
| `MessageTemplate` | Templates com variáveis `{{leadName}}`, `{{consultantName}}`, etc. |
| `RoundRobinState` | Estado singleton para controle da fila de atribuição |
