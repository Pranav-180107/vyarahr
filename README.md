# Vyara HR - Architecture & Workspace Guide

Vyara HR is organized into separate `frontend` and `backend` packages using an npm workspaces monorepo structure.

---

## 📁 Project Structure

```text
Vyara HR/
├── frontend/                     # Client-side React 19 + Vite application
│   ├── public/                   # Static assets (logos, icons, favicons)
│   ├── src/                      # UI components, pages, context, hooks, services
│   ├── index.html                # Vite HTML entry point
│   ├── vite.config.ts            # Vite bundler & proxy configuration
│   ├── tsconfig.json             # TypeScript configuration
│   ├── eslint.config.js          # Linter configuration
│   ├── package.json              # Frontend dependencies (React, Lucide, Recharts, etc.)
│   └── .env                      # Frontend environment variables (VITE_*)
│
├── backend/                      # Backend database & serverless infrastructure
│   ├── prisma/                   # Prisma ORM models & schema
│   │   └── schema.prisma
│   ├── supabase/                 # Supabase configuration, migrations & edge functions
│   │   ├── config.toml           # Supabase CLI settings
│   │   ├── functions/            # Supabase Edge Functions (create-employee, send-email)
│   │   └── migrations/           # PostgreSQL migrations & RLS policies
│   ├── package.json              # Backend dependencies (Prisma CLI & scripts)
│   └── .env                      # Backend database credentials (DATABASE_URL, DIRECT_URL)
│
├── docs/                         # Reference scripts, documentation, and SQL utilities
│   └── fix_trigger.sql           # Reference database trigger script
│
├── package.json                  # Root monorepo workspace configuration
├── vercel.json                   # Vercel deployment configuration
└── .gitignore                    # Git ignore rules for monorepo
```

---

## 🚀 Quick Start Commands

You can run all commands directly from the **project root**:

### Frontend
- **Start Development Server**:
  ```bash
  npm run dev
  ```
- **Build for Production**:
  ```bash
  npm run build
  ```
- **Preview Production Build**:
  ```bash
  npm run preview
  ```
- **Lint Code**:
  ```bash
  npm run lint
  ```

### Backend & Database (Prisma & Supabase)
- **Generate Prisma Client**:
  ```bash
  npm run prisma:generate
  ```
- **Pull Database Schema**:
  ```bash
  npm run prisma:pull
  ```
- **Open Prisma Studio UI**:
  ```bash
  npm run prisma:studio
  ```

---

## 🔐 Environment Variables

- **Frontend Variables**: Located in `frontend/.env` (safe client-side variables prefixed with `VITE_`).
- **Backend Variables**: Located in `backend/.env` (contains direct PostgreSQL connection URLs and pooler credentials).
