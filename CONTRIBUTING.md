# Contribuindo para KAIRÓS

Obrigado por considerar contribuir para o KAIRÓS! Este documento fornece diretrizes e instruções para contribuidores.

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Começar](#como-começar)
- [Processo de Contribuição](#processo-de-contribuição)
- [Padrões de Código](#padrões-de-código)
- [Mensagens de Commit](#mensagens-de-commit)
- [Pull Requests](#pull-requests)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Features](#sugerir-features)

---

## 🤝 Código de Conduta

Este projeto segue um Código de Conduta baseado em respeito, inclusão e profissionalismo:

- **Respeito** — Trate todos com dignidade e respeito
- **Inclusão** — Bem-vindo independente de origem, experiência ou perspectiva
- **Profissionalismo** — Discussões técnicas, sem ataques pessoais
- **Paciência** — Entenda que pessoas têm diferentes ritmos de aprendizado

Violações podem resultar em remoção de contribuições ou bloqueio de conta.

---

## 🚀 Como Começar

### 1. Fork o Repositório

```bash
# Visite: https://github.com/Yanglutango/MERChurch
# Clique em "Fork" (canto superior direito)
```

### 2. Clone seu Fork

```bash
git clone https://github.com/SEU_USERNAME/MERChurch.git
cd MERChurch
git remote add upstream https://github.com/Yanglutango/MERChurch.git
```

### 3. Configure o Ambiente

```bash
# Instalar dependências
npm install

# Configurar .env.local com credenciais de teste
cp .env.example .env.local
# Editar .env.local com suas chaves Supabase
```

### 4. Criar Branch

```bash
# Sincronize com upstream
git fetch upstream
git checkout upstream/main

# Crie um branch para sua feature/fix
git checkout -b feat/minha-feature
# ou para bugs:
git checkout -b fix/bug-description
```

---

## 📝 Processo de Contribuição

### Passo 1: Faça suas Mudanças

```bash
# Edite arquivos normalmente
npm run dev  # Teste localmente enquanto desenvolve
```

### Passo 2: Verifique o Código

```bash
# Executar linter
npm run lint

# (Futuro) Executar testes
npm run test
```

### Passo 3: Commit com Mensagem Semântica

```bash
# Exemplos de commits bem formatados:
git commit -m "feat: add prayer request notifications"
git commit -m "fix: resolve ministry member count bug"
git commit -m "docs: update Academy LMS setup guide"
git commit -m "refactor: simplify AI router logic"
git commit -m "style: format AuthPage component"
git commit -m "test: add unit tests for authService"
```

### Passo 4: Push para seu Fork

```bash
git push origin feat/minha-feature
```

### Passo 5: Abrir Pull Request

- Vá para seu fork no GitHub
- Clique em "Compare & pull request"
- Preencha o template de PR (veja abaixo)
- Descreva suas mudanças claramente
- Aguarde review da equipe

---

## 🎨 Padrões de Código

### TypeScript

- **Tipagem Explícita** — Evite `any`, use tipos específicos
- **Interfaces sobre Types** — Prefira `interface` para objetos
- **Strict Mode** — Siga ESLint rules

```typescript
// ✅ BOM
interface PrayerRequest {
  id: string
  title: string
  category: 'saude' | 'trabalho' | 'familia'
  createdAt: Date
}

const createRequest = (data: PrayerRequest): Promise<void> => {
  // ...
}

// ❌ EVITAR
const createRequest = (data: any): any => {
  // ...
}
```

### React Components

- **Componentes Funcionais** — Não use class components
- **Hooks no topo** — `useState`, `useEffect` antes de lógica
- **Memoização** — Use `React.memo()` para componentes caros
- **Props Typing** — Sempre tipifique props

```typescript
// ✅ BOM
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export const CustomButton: React.FC<ButtonProps> = React.memo(({ label, onClick, variant = 'primary', disabled = false }) => {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  )
})
```

### Tailwind CSS

- **Classes Semanticamente Organizadas** — layout → sizing → spacing → typography → colors
- **Sem CSS Customizado Desnecessário** — Use Tailwind primeiro
- **Breakpoints Padrão** — `sm:`, `md:`, `lg:`, `xl:`
- **Dark Mode Aware** — `dark:` para estilos em modo escuro

```tsx
// ✅ BOM
<div className="flex flex-col gap-4 md:flex-row md:gap-6 p-4 bg-white dark:bg-slate-900">
  <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
    Título
  </h1>
</div>

// ❌ EVITAR
<div style={{ display: 'flex', gap: '1rem' }}>
  <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Título</h1>
</div>
```

---

## 💬 Mensagens de Commit

Use o padrão **Conventional Commits**:

```
<tipo>(<escopo>): <assunto>

<corpo>

<rodapé>
```

### Tipos

- `feat` — Nova feature
- `fix` — Correção de bug
- `docs` — Mudanças em documentação
- `style` — Formatação (sem lógica)
- `refactor` — Refatoração de código
- `test` — Testes
- `chore` — Tarefas (deps, CI, etc)

### Exemplos

```bash
git commit -m "feat(academy): add course progress tracking"
git commit -m "fix(auth): prevent double login on slow networks"
git commit -m "docs(README): update setup instructions"
git commit -m "refactor(ministries): extract member list to component"
```

---

## 🔀 Pull Requests

Ao abrir um PR, descreva claramente:
- O que foi alterado
- Por que foi alterado
- Como testar as mudanças

---

## 🐛 Reportar Bugs

Antes de reportar:
- Verifique se o bug já foi reportado
- Teste em versão mais recente do `main`
- Limpe cache: `npm cache clean --force`

---

## 💡 Sugerir Features

Ant de sugerir:
- Verifique se não existe discussão similar
- Considere o escopo do projeto

---

**Obrigado por contribuir para KAIRÓS! 🙏**