# KAIRÓS — Local Development Setup Guide

Complete guide to running the MER church platform locally in VS Code.

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | 18.x or later | https://nodejs.org |
| **npm** | 9.x or later (bundled with Node) | — |
| **VS Code** | Any recent version | https://code.visualstudio.com |

---

## 1. Download the Project

In the OnSpace editor, click **Download** (top-right toolbar) to export the complete source code as a ZIP. Extract it to your local workspace.

---

## 2. Environment Variables

The project requires a `.env` file in the root directory. **Two options:**

### Option A — Copy from the downloaded ZIP (recommended)
The downloaded ZIP already includes a `.env` file with the correct OnSpace Cloud credentials. No action needed — skip to step 3.

### Option B — Set up manually
```bash
cp .env.example .env
```

Then fill in the values from your OnSpace Cloud dashboard:
- **Cloud → Settings → API** → copy **Project URL** → `VITE_SUPABASE_URL`
- **Cloud → Settings → API** → copy **Anon Key** → `VITE_SUPABASE_ANON_KEY`

Your `.env` should look like:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxx.backend.onspace.ai
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Install Dependencies

```bash
npm install
```

This will install all packages listed in `package.json`, including:

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `@supabase/supabase-js` | Backend client (auth, database, storage, functions) |
| `zustand` | Global state management |
| `recharts` | Dashboard charts |
| `sonner` | Toast notifications |
| `lucide-react` | Icon set |
| `clsx` + `tailwind-merge` | Class name utilities |
| `tailwindcss` + `postcss` + `autoprefixer` | Styling |
| `tailwindcss-animate` | Tailwind animation plugin |
| `vite` + `@vitejs/plugin-react-swc` | Build tool |
| `typescript` | Type checking |

---

## 4. Start the Dev Server

```bash
npm run dev
```

The app will be available at **http://localhost:8080**

---

## 5. VS Code Extensions (Recommended)

Install these for the best development experience:

```
Name: ESLint
ID: dbaeumer.vscode-eslint

Name: Tailwind CSS IntelliSense
ID: bradlc.vscode-tailwindcss

Name: TypeScript Vue Plugin (Volar) — not needed, just TS native support
ID: (built-in)

Name: Pretty TypeScript Errors
ID: yoavbls.pretty-ts-errors
```

---

## 6. Project Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 8080) |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint checks |

---

## 7. Project Structure

```
src/
├── App.tsx              # Root router with all routes
├── main.tsx             # React entry point
├── index.css            # Global styles + Tailwind directives
├── pages/               # 22 feature pages (one per route)
├── components/
│   ├── ui/              # Base UI components (Button, Card, Dialog, etc.)
│   ├── layout/          # Header, Footer, Layout, NotificationBell
│   ├── sections/        # Landing page sections
│   ├── admin/           # Admin-only editors
│   └── shared/          # Reusable display components
├── hooks/               # useAuth, useRealTime, useTranslation
├── stores/              # Zustand state (authStore, appStore)
├── lib/                 # supabase client, utilities, formatters
├── types/               # TypeScript interfaces
└── i18n/                # Translations (pt, en, fr, es)

supabase/
├── functions/           # Edge Functions (logos-ai, multicaixa-payment, send-email)
└── migrations/          # 6 SQL migration files
```

---

## 8. Architecture Notes

- **Authentication**: Email OTP + password flow via Supabase Auth
- **Database**: PostgreSQL with Row Level Security — admin vs member access
- **Real-time**: Polling-based updates (no Supabase Realtime websockets)
- **AI**: `logos-ai` Edge Function (requires `ONSPACE_AI_API_KEY` in backend secrets)
- **Payments**: `multicaixa-payment` Edge Function (requires `MULTICAIXA_API_KEY` in backend secrets)
- **i18n**: 4 languages supported — Portuguese (default), English, French, Spanish
- **Theme**: Light/Dark with system preference detection

---

## 9. Connecting to the Backend

The app uses **OnSpace Cloud** (Supabase-compatible) hosted backend. All database tables, auth, and storage are managed there. Local code changes connect to the **same live backend** — there is no local database.

To inspect data:
- Use the OnSpace Cloud dashboard (Data tab)
- Or use the Supabase client directly in browser dev tools

---

## 10. Common Issues

### Port already in use
```bash
# Change port temporarily
npm run dev -- --port 3000
```

### TypeScript errors
The project uses `"strict": false` — most TS errors are warnings only. Build will still succeed.

### Tailwind classes not applying
Make sure you're using **Tailwind v3 syntax** (not v4). All classes in this project are v3-compatible.

### Auth not working
Double-check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your `.env` match the values in the OnSpace Cloud dashboard.

---

## 11. Deploying

The project is configured for **Vercel** (`vercel.json` included). To deploy:

```bash
npm run build
# Then push to GitHub and connect to Vercel
# OR use: npx vercel --prod
```

All client-side routes are handled by the `vercel.json` rewrite rule.

---

*Built with React 18 + Vite 5 + Tailwind CSS 3 + Supabase · MER Church Platform*
