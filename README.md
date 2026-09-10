# KAIRÓS — Plataforma Digital da Missão Evangélica da Reconciliação

> **Uma plataforma full-stack moderna para gestão integrada de comunidades cristãs, ministérios, educação e vida espiritual em tempo real.**

![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=flat-square&logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-2.51-3ECF8E?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss)

---

## 📋 Visão Geral

**KAIRÓS** é uma plataforma digital abrangente que une a comunidade evangélica em torno de:

- 🙏 **Vida Espiritual** — Orações, testemunhos, aconselhamento pastoral
- 📚 **Educação Cristã** — Academia com cursos, trilhas de aprendizado, gamificação
- 🎵 **Ministérios** — Louvor, intercessão, discipulado, departamentos
- 📖 **Conteúdo** — Sermões, devocionais, recursos bíblicos
- 🤖 **IA Integrada** — Logos by KAIRÓS (assistente teológico baseado em Escrituras)
- 💰 **Gestão Administrativa** — Tesouraria, doações, eventos
- 🔴 **Transmissão ao Vivo** — Serviços e eventos em tempo real

---

## 🏗️ Arquitetura

### Stack Tecnológico

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **UI/UX** | Tailwind CSS + Shadcn Components + Framer Motion |
| **Estado Global** | Zustand + TanStack Query |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| **Real-time** | Polling inteligente com versioning |
| **Autenticação** | Supabase Auth + Magic Link/2FA |
| **Pagamentos** | Multicaixa API (processamento de doações) |
| **IA** | API OnSpace + Prompt Engineering teológico |

### Estrutura de Pastas

```
MERChurch/
├── src/
│   ├── pages/              # 22 páginas de features (rotas principais)
│   │   ├── HomePage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── MinistriesPage.tsx
│   │   ├── AcademyPage.tsx
│   │   ├── MerAIPage.tsx          # Logos by KAIRÓS
│   │   ├── LivePage.tsx
│   │   ├── SermonsPage.tsx
│   │   └── ...
│   ├── components/
│   │   ├── ui/             # Componentes base (Button, Card, Dialog...)
│   │   ├── layout/         # Header, Footer, Layout wrapper
│   │   ├── sections/       # Seções da landing page
│   │   ├── admin/          # Editores admin-only
│   │   ├── shared/         # Componentes reutilizáveis
│   │   └── ministries/     # Componentes específicos de ministérios
│   ├── hooks/              # useAuth, useRealTime, useTranslation
│   ├── stores/             # Estado global (Zustand)
│   ├── lib/
│   │   ├── supabase.ts     # Cliente Supabase configurado
│   │   ├── authService.ts  # Lógica de autenticação
│   │   ├── aiRouter.ts     # Roteamento de requests de IA
│   │   └── utils.ts        # Utilitários e formatadores
│   ├── types/              # Interfaces TypeScript
│   └── i18n/               # Traduções (pt, en, fr, es)
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   │   ├── logos-ai/       # Assistente teológico
│   │   ├── send-email/     # Email transacional
│   │   └── multicaixa-payment/  # Processamento de pagamentos
│   └── migrations/         # Migrações SQL
├── .github/workflows/      # CI/CD automatizado
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md (este arquivo)
```

---

## 🚀 Começar Rapidamente

### Pré-requisitos

- **Node.js 18+** (recomendado: 20 LTS)
- **npm** ou **yarn**
- **Conta Supabase** (gratuita em [supabase.com](https://supabase.com))
- **Git**

### Instalação Local

```bash
# 1. Clonar repositório
git clone https://github.com/Yanglutango/MERChurch.git
cd MERChurch

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
# Copiar arquivo de exemplo e preencher com suas credenciais
cp .env.example .env.local

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em: **http://localhost:8080**

---

## 📖 Documentação

- **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** — Guia completo de desenvolvimento local com extensões VS Code e troubleshooting
- **[LMS_IMPLEMENTATION_GUIDE.md](./LMS_IMPLEMENTATION_GUIDE.md)** — Documentação da Academia e gamificação
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Diretrizes para contribuidores

---

## 🔑 Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OnSpace AI (Logos)
VITE_ONSPACE_AI_API_KEY=sk-...
VITE_ONSPACE_AI_BASE_URL=https://api.onspace.ai

# Multicaixa (Pagamentos)
VITE_MULTICAIXA_API_KEY=...

# Modo de Ambiente
VITE_APP_ENV=development
```

> ⚠️ **Nunca commite `.env.local`** — está em `.gitignore`

---

## 📝 Scripts NPM

```bash
npm run dev          # Inicia servidor de desenvolvimento (hot reload)
npm run build        # Build otimizado para produção
npm run build:dev    # Build com modo desenvolvimento
npm run lint         # Executa ESLint
npm run preview      # Visualiza build localmente
```

---

## 🧪 Autenticação

### Fluxos Suportados

1. **Magic Link** — Email único por meio de link seguro
2. **2FA** — Autenticação de dois fatores com código OTP
3. **Roles** — guest, member, admin com permissões granulares

### Testando Localmente

Use credenciais Supabase de desenvolvimento:

```
Email: test@example.com
Senha: password123 (qualquer senha funciona em dev)
```

---

## 🎨 Design & UI

### Princípios

- **Acessibilidade** — WCAG 2.1 (onde aplicável)
- **Performance** — Código-splitting automático por rota
- **Responsividade** — Mobile-first, testes em múltiplos dispositivos
- **Dark Mode** — Suporte nativo via Tailwind + context
- **Temas Customizáveis** — Por usuário (light/dark/system)

### Componentes

Usamos **Shadcn UI** primitivos customizados com **Tailwind CSS** para máxima flexibilidade e marca consistente.

---

## 📊 Recursos Principais

### 🙏 Centro Espiritual
- Oração em tempo real com notificações
- Testemunhos com moderação
- Aconselhamento pastoral agendado
- Devocionais diários

### 📚 Academia (LMS)
- Cursos estruturados em trilhas
- Gamificação com pontos e badges
- Progresso visual com rastreamento
- Certificados digitais

### 🎵 Ministérios
- Criação e gerenciamento de ministérios
- Limite inteligente de participações (max 3)
- Feed de atividades em tempo real
- Membros com roles (coordenador, membro)

### 🤖 Logos by KAIRÓS
- IA teológica treinada em Escrituras Sagradas
- 25+ categorias temáticas
- Histórico de conversas persistente
- Limite de uso justo (50 requisições/mês)

### 📖 Conteúdo Bíblico
- Sermões com transcrições
- Recursos e PDFs
- Série de eventos e agenda
- Índice de anúncios

### 💰 Gestão Administrativa
- Dashboard com métricas
- Tesouraria com relatórios
- Doações (única/recorrente/projetos)
- Exportação para Excel

---

## 🔐 Segurança

- **CORS Configurado** — Apenas origins autorizados
- **Rate Limiting** — Via Supabase e Edge Functions
- **Row Level Security (RLS)** — Todas as tabelas protegidas
- **Proteção CSRF** — Tokens em formulários sensíveis
- **Validação de Entrada** — Zod + Supabase types
- **Secrets Seguros** — `.env.local` nunca é commitado

---

## 🚢 Deployment

### Opção 1: Vercel (Recomendado)

```bash
npm install -g vercel
vercel
```

### Opção 2: Netlify

```bash
npm run build
# Fazer upload da pasta dist/
```

### Opção 3: Supabase Hosting

Veja [supabase.com/hosting](https://supabase.com/docs/guides/hosting)

---

## 🤝 Contribuir

Contribuições são bem-vindas! Por favor, leia [CONTRIBUTING.md](./CONTRIBUTING.md) antes de submeter PRs.

```bash
# Fluxo típico
git checkout -b feature/minha-feature
# Fazer mudanças
npm run lint  # Verificar eslint
git commit -m "feat: descrição breve"
git push origin feature/minha-feature
# Abrir PR no GitHub
```

---

## 📞 Suporte

- 📧 **Email:** dev@missionariosautodenominados.com
- 🐛 **Issues:** [GitHub Issues](https://github.com/Yanglutango/MERChurch/issues)
- 💬 **Discussões:** [GitHub Discussions](https://github.com/Yanglutango/MERChurch/discussions)

---

## 📄 Licença

ISC — Veja [LICENSE](./LICENSE) para detalhes completos.

---

## 🙏 Agradecimentos

Desenvolvido com ❤️ para a comunidade evangélica.

> **Sola Scriptura** — Somente a Escritura é nossa autoridade.
