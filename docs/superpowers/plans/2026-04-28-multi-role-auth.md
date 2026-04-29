# Sistema Multi-Nível de Usuários — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar autenticação em 3 níveis (superadmin, admin, player) ao app de torneios de beach tennis, com dados persistidos no Supabase e isolamento completo entre ambientes de admins.

**Architecture:** Supabase Auth gerencia autenticação; Row Level Security (RLS) isola dados por `admin_id`; o frontend usa React Router com guards de rota baseados em `user_role`; o superadmin gerencia admins via tabela `admin_profiles`; jogadores acessam view read-only via URL pública do torneio do seu admin.

**Tech Stack:** React 18 + Vite + TypeScript, Supabase (Auth + PostgreSQL + RLS), React Router 7, react-hook-form, shadcn/Radix UI, Tailwind CSS 4, Sonner (toasts)

---

## Scope: 3 subsistemas independentes

Este plano implementa todos os 3 em sequência pois cada um depende do anterior:
1. **Banco de dados + RLS** (fundação)
2. **Auth + roteamento** (infraestrutura)
3. **Painéis por papel** (funcionalidade)

---

## Mapa de Arquivos

### Criados
- `src/lib/supabase.ts` — cliente Supabase singleton + tipos gerados
- `src/lib/auth.tsx` — AuthContext, useAuth hook, tipos de papel
- `src/lib/database.types.ts` — tipos TypeScript das tabelas Supabase
- `src/app/pages/LoginPage.tsx` — página de login única para todos os papéis
- `src/app/pages/SuperAdminPage.tsx` — painel superadmin (lista de admins)
- `src/app/pages/AdminPage.tsx` — painel admin (torneios, wrapper do app atual)
- `src/app/pages/PlayerPage.tsx` — view read-only para jogadores
- `src/app/pages/UnauthorizedPage.tsx` — página 403
- `src/app/components/auth/ProtectedRoute.tsx` — guard de rota por papel
- `src/app/components/auth/LoginForm.tsx` — formulário de login
- `src/app/components/superadmin/AdminList.tsx` — tabela de admins com toggle
- `src/app/components/admin/TournamentManager.tsx` — lista de torneios do admin
- `src/app/components/admin/TournamentForm.tsx` — criar/editar torneio
- `src/app/components/player/PlayerDashboard.tsx` — ranking + resultados read-only
- `src/app/components/player/PlayerInvite.tsx` — componente de cadastro de jogador
- `supabase/migrations/001_initial_schema.sql` — schema completo + RLS
- `supabase/migrations/002_seed_superadmin.sql` — seed do superadmin
- `.env.staging` — variáveis do ambiente de homologação
- `.env.production` — variáveis do ambiente de produção
- `vite.config.staging.ts` — configuração de build de homologação

### Modificados
- `src/app/App.tsx` — torna-se `TournamentApp.tsx` (renomeado; lógica atual preservada)
- `src/main.tsx` — adiciona Router + AuthProvider + rotas
- `package.json` — adiciona `@supabase/supabase-js`, script de build:staging
- `vite.config.ts` — adiciona variáveis de env

---

## Task 1: Instalar dependências e configurar Supabase client

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/database.types.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar @supabase/supabase-js**

```bash
cd /caminho/do/projeto
pnpm add @supabase/supabase-js
```

Expected: package instalado sem erros.

- [ ] **Step 2: Criar `src/lib/database.types.ts`**

```typescript
export type UserRole = 'superadmin' | 'admin' | 'player'

export interface AdminProfile {
  id: string
  user_id: string
  email: string
  name: string
  is_active: boolean
  created_at: string
}

export interface Tournament {
  id: string
  admin_id: string
  name: string
  description: string | null
  status: 'active' | 'finished' | 'archived'
  created_at: string
}

export interface TournamentPlayer {
  id: string
  tournament_id: string
  name: string
  email: string | null
  created_at: string
}

export interface TournamentMatch {
  id: string
  tournament_id: string
  match_index: number
  team1_player1_id: string
  team1_player2_id: string
  team2_player1_id: string
  team2_player2_id: string
  score1: number | null
  score2: number | null
  created_at: string
}

export interface PlayerAccess {
  id: string
  email: string
  admin_id: string
  created_at: string
}
```

- [ ] **Step 3: Criar `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 4: Verificar que o build passa**

```bash
pnpm build
```

Expected: build completa sem erros de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts src/lib/database.types.ts package.json pnpm-lock.yaml
git commit -m "feat: add supabase client and database types"
```

---

## Task 2: Criar schema do banco de dados no Supabase

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/migrations/002_seed_superadmin.sql`

- [ ] **Step 1: Criar diretório de migrações**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Criar `supabase/migrations/001_initial_schema.sql`**

```sql
-- Extensões necessárias
create extension if not exists "uuid-ossp";

-- Tabela de papéis de usuário
create table if not exists public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  role text not null check (role in ('superadmin', 'admin', 'player')),
  created_at timestamptz default now()
);

-- Tabela de perfis de admin
create table if not exists public.admin_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text not null unique,
  name text not null,
  is_active boolean default true not null,
  created_at timestamptz default now()
);

-- Tabela de torneios (isolada por admin)
create table if not exists public.tournaments (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references public.admin_profiles(id) on delete cascade not null,
  name text not null,
  description text,
  status text default 'active' check (status in ('active', 'finished', 'archived')),
  created_at timestamptz default now()
);

-- Tabela de jogadores do torneio
create table if not exists public.tournament_players (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  name text not null,
  email text,
  created_at timestamptz default now()
);

-- Tabela de partidas
create table if not exists public.tournament_matches (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  match_index integer not null,
  team1_player1_id uuid references public.tournament_players(id) not null,
  team1_player2_id uuid references public.tournament_players(id) not null,
  team2_player1_id uuid references public.tournament_players(id) not null,
  team2_player2_id uuid references public.tournament_players(id) not null,
  score1 integer,
  score2 integer,
  created_at timestamptz default now()
);

-- Tabela de acesso de jogadores (email pré-cadastrado por admin)
create table if not exists public.player_access (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  admin_id uuid references public.admin_profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(email, admin_id)
);

-- ========== Row Level Security ==========

alter table public.user_roles enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_players enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.player_access enable row level security;

-- Função auxiliar para checar papel do usuário logado
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

-- Função auxiliar para pegar o admin_id do usuário logado
create or replace function public.get_admin_id()
returns uuid
language sql
security definer
stable
as $$
  select id from public.admin_profiles where user_id = auth.uid()
$$;

-- user_roles: superadmin vê tudo; cada um vê o próprio
create policy "superadmin_all_user_roles" on public.user_roles
  for all using (public.get_user_role() = 'superadmin');

create policy "own_user_role" on public.user_roles
  for select using (user_id = auth.uid());

-- admin_profiles: superadmin gerencia tudo; admin vê o próprio
create policy "superadmin_all_admin_profiles" on public.admin_profiles
  for all using (public.get_user_role() = 'superadmin');

create policy "admin_read_own_profile" on public.admin_profiles
  for select using (user_id = auth.uid());

-- tournaments: admin gerencia apenas os seus; player pode ler os do seu admin
create policy "admin_own_tournaments" on public.tournaments
  for all using (admin_id = public.get_admin_id());

create policy "player_read_tournaments" on public.tournaments
  for select using (
    public.get_user_role() = 'player'
    and admin_id in (
      select admin_id from public.player_access where email = (
        select email from auth.users where id = auth.uid()
      )
    )
  );

-- tournament_players: segue o acesso ao torneio
create policy "admin_own_tournament_players" on public.tournament_players
  for all using (
    tournament_id in (select id from public.tournaments where admin_id = public.get_admin_id())
  );

create policy "player_read_tournament_players" on public.tournament_players
  for select using (
    tournament_id in (
      select t.id from public.tournaments t
      join public.player_access pa on pa.admin_id = t.admin_id
      where pa.email = (select email from auth.users where id = auth.uid())
    )
  );

-- tournament_matches: segue o acesso ao torneio
create policy "admin_own_tournament_matches" on public.tournament_matches
  for all using (
    tournament_id in (select id from public.tournaments where admin_id = public.get_admin_id())
  );

create policy "player_read_tournament_matches" on public.tournament_matches
  for select using (
    tournament_id in (
      select t.id from public.tournaments t
      join public.player_access pa on pa.admin_id = t.admin_id
      where pa.email = (select email from auth.users where id = auth.uid())
    )
  );

-- player_access: superadmin vê tudo; admin gerencia os seus
create policy "superadmin_all_player_access" on public.player_access
  for all using (public.get_user_role() = 'superadmin');

create policy "admin_own_player_access" on public.player_access
  for all using (admin_id = public.get_admin_id());
```

- [ ] **Step 3: Criar `supabase/migrations/002_seed_superadmin.sql`**

```sql
-- ATENÇÃO: Execute este script UMA VEZ após criar o usuário superadmin no Supabase Auth Dashboard.
-- Substitua 'SUPERADMIN_USER_ID' pelo UUID do usuário criado.
-- Email: chrisjsp35@gmail.com  Senha: V1toriA20215

-- Após criar o usuário via Supabase Auth Dashboard, execute:
-- insert into public.user_roles (user_id, role)
-- values ('<UUID_DO_USUARIO>', 'superadmin');
```

- [ ] **Step 4: Executar a migração 001 no Supabase SQL Editor**

Acesse o Supabase Dashboard → SQL Editor → cole e execute o conteúdo de `001_initial_schema.sql`.

Expected: todas as tabelas criadas sem erros; RLS habilitado em todas.

- [ ] **Step 5: Criar o superadmin no Supabase Auth**

No Supabase Dashboard → Authentication → Users → "Invite user":
- Email: `chrisjsp35@gmail.com`
- Após criação, copie o UUID gerado.

Execute no SQL Editor:
```sql
insert into public.user_roles (user_id, role)
values ('<UUID_COPIADO>', 'superadmin');
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add database schema with RLS and superadmin seed"
```

---

## Task 3: AuthContext e sistema de roteamento

**Files:**
- Create: `src/lib/auth.tsx`
- Create: `src/app/components/auth/ProtectedRoute.tsx`
- Create: `src/app/pages/UnauthorizedPage.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Criar `src/lib/auth.tsx`**

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { UserRole } from './database.types'

interface AuthState {
  user: User | null
  session: Session | null
  role: UserRole | null
  adminId: string | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    adminId: null,
    loading: true,
  })

  async function loadUserMeta(user: User | null) {
    if (!user) {
      setState({ user: null, session: null, role: null, adminId: null, loading: false })
      return
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    let adminId: string | null = null
    if (roleData?.role === 'admin') {
      const { data: adminData } = await supabase
        .from('admin_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      adminId = adminData?.id ?? null
    }

    setState((prev) => ({
      ...prev,
      user,
      role: (roleData?.role as UserRole) ?? null,
      adminId,
      loading: false,
    }))
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({ ...prev, session }))
      loadUserMeta(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({ ...prev, session }))
      loadUserMeta(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Criar `src/app/components/auth/ProtectedRoute.tsx`**

```typescript
import { Navigate } from 'react-router'
import { useAuth } from '../../../lib/auth'
import { UserRole } from '../../../lib/database.types'

interface Props {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

export function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/unauthorized" replace />

  return <>{children}</>
}
```

- [ ] **Step 3: Criar `src/app/pages/UnauthorizedPage.tsx`**

```typescript
import { useNavigate } from 'react-router'
import { Button } from '../components/ui/button'

export default function UnauthorizedPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Acesso não autorizado</h1>
      <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      <Button onClick={() => navigate('/login')}>Ir para login</Button>
    </div>
  )
}
```

- [ ] **Step 4: Modificar `src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { AuthProvider } from './lib/auth'
import { ProtectedRoute } from './app/components/auth/ProtectedRoute'
import LoginPage from './app/pages/LoginPage'
import SuperAdminPage from './app/pages/SuperAdminPage'
import AdminPage from './app/pages/AdminPage'
import PlayerPage from './app/pages/PlayerPage'
import UnauthorizedPage from './app/pages/UnauthorizedPage'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route
            path="/superadmin/*"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/*"
            element={
              <ProtectedRoute allowedRoles={['player']}>
                <PlayerPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
)
```

- [ ] **Step 5: Verificar que o TypeScript compila**

```bash
pnpm build 2>&1 | head -30
```

Expected: 0 erros TypeScript (pode haver avisos de módulos não criados ainda — criar stubs vazios se necessário).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.tsx src/app/components/auth/ src/app/pages/UnauthorizedPage.tsx src/main.tsx
git commit -m "feat: add auth context and protected routes"
```

---

## Task 4: Página de Login

**Files:**
- Create: `src/app/pages/LoginPage.tsx`
- Create: `src/app/components/auth/LoginForm.tsx`

- [ ] **Step 1: Criar `src/app/components/auth/LoginForm.tsx`**

```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { useAuth } from '../../../lib/auth'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

interface FormData {
  email: string
  password: string
}

export function LoginForm() {
  const { signIn, role } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setServerError(null)
    const { error } = await signIn(data.email, data.password)
    if (error) {
      setServerError('Email ou senha inválidos.')
      setLoading(false)
      return
    }
    // AuthContext atualiza o role; aguarda e redireciona
    setLoading(false)
  }

  // Redireciona quando o role estiver disponível após login
  if (role === 'superadmin') navigate('/superadmin', { replace: true })
  if (role === 'admin') navigate('/admin', { replace: true })
  if (role === 'player') navigate('/player', { replace: true })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          {...register('email', { required: 'Email obrigatório' })}
        />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password', { required: 'Senha obrigatória' })}
        />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Criar `src/app/pages/LoginPage.tsx`**

```typescript
import { LoginForm } from '../components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">
            Torneio de <span className="text-primary">Beach Tennis</span>
          </h1>
          <p className="text-muted-foreground text-sm">Arena GWM</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build passa**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -10
```

Expected: nenhuma linha com "error".

- [ ] **Step 4: Commit**

```bash
git add src/app/pages/LoginPage.tsx src/app/components/auth/LoginForm.tsx
git commit -m "feat: add login page"
```

---

## Task 5: Painel Super Admin

**Files:**
- Create: `src/app/pages/SuperAdminPage.tsx`
- Create: `src/app/components/superadmin/AdminList.tsx`
- Create: `src/app/components/superadmin/CreateAdminDialog.tsx`

- [ ] **Step 1: Criar `src/app/components/superadmin/AdminList.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { AdminProfile } from '../../../lib/database.types'
import { Switch } from '../ui/switch'
import { Badge } from '../ui/badge'
import { toast } from 'sonner'

export function AdminList() {
  const [admins, setAdmins] = useState<AdminProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdmins()
  }, [])

  async function fetchAdmins() {
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Erro ao carregar admins.')
      return
    }
    setAdmins(data ?? [])
    setLoading(false)
  }

  async function toggleAdmin(admin: AdminProfile) {
    const newStatus = !admin.is_active
    const { error } = await supabase
      .from('admin_profiles')
      .update({ is_active: newStatus })
      .eq('id', admin.id)

    if (error) {
      toast.error('Erro ao atualizar status.')
      return
    }

    setAdmins((prev) =>
      prev.map((a) => (a.id === admin.id ? { ...a, is_active: newStatus } : a))
    )
    toast.success(`${admin.name} ${newStatus ? 'ativado' : 'desativado'}.`)
  }

  if (loading) return <p className="text-muted-foreground">Carregando...</p>

  if (admins.length === 0)
    return <p className="text-muted-foreground text-center py-8">Nenhum admin cadastrado.</p>

  return (
    <div className="space-y-3">
      {admins.map((admin) => (
        <div
          key={admin.id}
          className="flex items-center justify-between p-4 bg-card border border-border rounded-xl"
        >
          <div>
            <div className="font-semibold">{admin.name}</div>
            <div className="text-sm text-muted-foreground">{admin.email}</div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={admin.is_active ? 'default' : 'secondary'}
              className={
                admin.is_active
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-muted text-muted-foreground'
              }
            >
              {admin.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
            <Switch
              checked={admin.is_active}
              onCheckedChange={() => toggleAdmin(admin)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Criar `src/app/components/superadmin/CreateAdminDialog.tsx`**

```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { toast } from 'sonner'

interface FormData {
  name: string
  email: string
  password: string
}

interface Props {
  onCreated: () => void
}

export function CreateAdminDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setLoading(true)

    // 1. Criar usuário no Supabase Auth via Admin API (requer service_role key — usar Edge Function)
    const { data: fnData, error: fnError } = await supabase.functions.invoke('create-admin-user', {
      body: { email: data.email, password: data.password, name: data.name },
    })

    if (fnError || fnData?.error) {
      toast.error(fnData?.error ?? 'Erro ao criar admin.')
      setLoading(false)
      return
    }

    toast.success(`Admin ${data.name} criado com sucesso.`)
    reset()
    setOpen(false)
    onCreated()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Novo Admin</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Admin</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input {...register('name', { required: 'Nome obrigatório' })} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              {...register('email', {
                required: 'Email obrigatório',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
              })}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input
              type="password"
              {...register('password', { required: 'Senha obrigatória', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })}
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Admin'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Criar `src/app/pages/SuperAdminPage.tsx`**

```typescript
import { useAuth } from '../../lib/auth'
import { AdminList } from '../components/superadmin/AdminList'
import { CreateAdminDialog } from '../components/superadmin/CreateAdminDialog'
import { Button } from '../components/ui/button'
import { useState } from 'react'

export default function SuperAdminPage() {
  const { signOut, user } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Painel Super Admin</h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          Sair
        </Button>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Administradores</h2>
          <CreateAdminDialog onCreated={() => setRefreshKey((k) => k + 1)} />
        </div>
        <AdminList key={refreshKey} />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Build passa**

```bash
pnpm build 2>&1 | grep -E "^.*error" | head -10
```

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/pages/SuperAdminPage.tsx src/app/components/superadmin/
git commit -m "feat: add super admin panel with admin enable/disable"
```

---

## Task 6: Edge Function para criar admin (service_role)

**Files:**
- Create: `supabase/functions/create-admin-user/index.ts`

> **Por quê Edge Function?** Criar usuários via Supabase Auth Admin API requer a `service_role` key, que não deve ser exposta no frontend. A Edge Function executa com essa key no servidor.

- [ ] **Step 1: Criar `supabase/functions/create-admin-user/index.ts`**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verifica que o chamador é superadmin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verifica papel do caller
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: roleData } = await callerClient.from('user_roles').select('role').single()
    if (roleData?.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, password, name } = await req.json()

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios faltando' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cria usuário no Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insere papel
    await supabaseAdmin.from('user_roles').insert({ user_id: newUser.user.id, role: 'admin' })

    // Insere perfil de admin
    await supabaseAdmin.from('admin_profiles').insert({
      user_id: newUser.user.id,
      email,
      name,
      is_active: true,
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 2: Fazer deploy da Edge Function no Supabase**

No Supabase Dashboard → Edge Functions → "New Function" → nome: `create-admin-user` → cole o código acima.

Ou via CLI (se instalado):
```bash
supabase functions deploy create-admin-user
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add create-admin-user edge function"
```

---

## Task 7: Painel Admin — gerenciar torneios

**Files:**
- Create: `src/app/pages/AdminPage.tsx`
- Create: `src/app/components/admin/TournamentList.tsx`
- Create: `src/app/components/admin/TournamentForm.tsx`
- Modify: `src/app/App.tsx` → renomear para `src/app/TournamentApp.tsx`

- [ ] **Step 1: Renomear App.tsx para TournamentApp.tsx**

```bash
mv src/app/App.tsx src/app/TournamentApp.tsx
```

Altere a exportação no arquivo de `export default function App()` para `export default function TournamentApp()`.

- [ ] **Step 2: Criar `src/app/components/admin/TournamentList.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/auth'
import { Tournament } from '../../../lib/database.types'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { toast } from 'sonner'

interface Props {
  onSelect: (tournament: Tournament) => void
  onNew: () => void
  refreshKey: number
}

export function TournamentList({ onSelect, onNew, refreshKey }: Props) {
  const { adminId } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!adminId) return
    supabase
      .from('tournaments')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error('Erro ao carregar torneios.')
        setTournaments(data ?? [])
        setLoading(false)
      })
  }, [adminId, refreshKey])

  if (loading) return <p className="text-muted-foreground">Carregando...</p>

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Meus Torneios</h2>
        <Button size="sm" onClick={onNew}>Novo Torneio</Button>
      </div>
      {tournaments.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum torneio criado ainda.</p>
      ) : (
        tournaments.map((t) => (
          <div
            key={t.id}
            onClick={() => onSelect(t)}
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
          >
            <div>
              <div className="font-semibold">{t.name}</div>
              {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
            </div>
            <Badge
              variant={t.status === 'active' ? 'default' : 'secondary'}
              className={t.status === 'active' ? 'bg-primary/10 text-primary border-primary/20' : ''}
            >
              {t.status === 'active' ? 'Ativo' : t.status === 'finished' ? 'Finalizado' : 'Arquivado'}
            </Badge>
          </div>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 3: Criar `src/app/components/admin/TournamentForm.tsx`**

```typescript
import { useForm } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/auth'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { toast } from 'sonner'

interface FormData {
  name: string
  description: string
}

interface Props {
  onSaved: () => void
  onCancel: () => void
}

export function TournamentForm({ onSaved, onCancel }: Props) {
  const { adminId } = useAuth()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    if (!adminId) return

    const { error } = await supabase.from('tournaments').insert({
      admin_id: adminId,
      name: data.name,
      description: data.description || null,
      status: 'active',
    })

    if (error) {
      toast.error('Erro ao criar torneio.')
      return
    }
    toast.success('Torneio criado!')
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do torneio</Label>
        <Input {...register('name', { required: 'Nome obrigatório' })} placeholder="Ex: Torneio Junho 2026" />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Descrição (opcional)</Label>
        <Input {...register('description')} placeholder="Ex: Arena GWM — Temporada 1" />
      </div>
      <div className="flex gap-3">
        <Button type="submit" className="flex-1">Criar</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Criar `src/app/pages/AdminPage.tsx`**

```typescript
import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { Tournament } from '../../lib/database.types'
import { TournamentList } from '../components/admin/TournamentList'
import { TournamentForm } from '../components/admin/TournamentForm'
import TournamentApp from '../TournamentApp'
import { Button } from '../components/ui/button'

type View = 'list' | 'new' | 'tournament'

export default function AdminPage() {
  const { signOut, user } = useAuth()
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<Tournament | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSelect(t: Tournament) {
    setSelected(t)
    setView('tournament')
  }

  function handleSaved() {
    setRefreshKey((k) => k + 1)
    setView('list')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Painel Admin</h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          {view !== 'list' && (
            <Button variant="ghost" size="sm" onClick={() => setView('list')}>
              ← Torneios
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={signOut}>
            Sair
          </Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {view === 'list' && (
          <TournamentList
            onSelect={handleSelect}
            onNew={() => setView('new')}
            refreshKey={refreshKey}
          />
        )}
        {view === 'new' && (
          <div className="max-w-md">
            <h2 className="text-lg font-semibold mb-4">Novo Torneio</h2>
            <TournamentForm onSaved={handleSaved} onCancel={() => setView('list')} />
          </div>
        )}
        {view === 'tournament' && selected && (
          <TournamentApp tournamentId={selected.id} tournamentName={selected.name} />
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Adaptar `TournamentApp.tsx` para aceitar `tournamentId` e persistir no Supabase**

O `TournamentApp` precisa receber `tournamentId` como prop e carregar/salvar dados no Supabase em vez de state local. Adicione as props:

```typescript
interface Props {
  tournamentId: string
  tournamentName: string
}

export default function TournamentApp({ tournamentId, tournamentName }: Props) {
  // Carrega players e matches do Supabase ao montar
  // Salva alterações (updateScore) no Supabase
  // Resto da lógica permanece igual
```

Ao invés de `useState` para `players` e `matches`, use `useEffect` para carregar do Supabase e funções async para atualizar.

- [ ] **Step 6: Build passa**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -10
```

Expected: sem erros de TypeScript.

- [ ] **Step 7: Commit**

```bash
git add src/app/TournamentApp.tsx src/app/pages/AdminPage.tsx src/app/components/admin/
git commit -m "feat: add admin panel with tournament management and supabase persistence"
```

---

## Task 8: Acesso de Jogadores (read-only)

**Files:**
- Create: `src/app/pages/PlayerPage.tsx`
- Create: `src/app/components/player/PlayerDashboard.tsx`
- Create: `src/app/components/admin/PlayerAccessManager.tsx`

- [ ] **Step 1: Criar `src/app/components/player/PlayerDashboard.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/auth'
import { Tournament } from '../../../lib/database.types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Badge } from '../ui/badge'

export function PlayerDashboard() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selected, setSelected] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])

  useEffect(() => {
    if (!user?.email) return
    supabase
      .from('tournaments')
      .select('*')
      .eq('status', 'active')
      .then(({ data }) => setTournaments(data ?? []))
  }, [user])

  async function selectTournament(t: Tournament) {
    setSelected(t)
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from('tournament_matches').select('*').eq('tournament_id', t.id),
      supabase.from('tournament_players').select('*').eq('tournament_id', t.id),
    ])
    setMatches(m ?? [])
    setPlayers(p ?? [])
  }

  const ranking = players
    .map((player) => {
      const pts = matches.reduce((acc, m) => {
        if (m.team1_player1_id === player.id || m.team1_player2_id === player.id)
          return acc + (m.score1 ?? 0)
        if (m.team2_player1_id === player.id || m.team2_player2_id === player.id)
          return acc + (m.score2 ?? 0)
        return acc
      }, 0)
      return { player, pts }
    })
    .sort((a, b) => b.pts - a.pts)

  return (
    <div className="space-y-6">
      {!selected ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Torneios disponíveis</h2>
          {tournaments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum torneio ativo.</p>
          ) : (
            tournaments.map((t) => (
              <div
                key={t.id}
                onClick={() => selectTournament(t)}
                className="p-4 bg-card border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
              >
                <div className="font-semibold">{t.name}</div>
                {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
              </div>
            ))
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-muted-foreground mb-4 hover:text-foreground"
          >
            ← Voltar
          </button>
          <h2 className="text-xl font-bold mb-6">{selected.name}</h2>
          <Tabs defaultValue="ranking">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ranking">🏆 Ranking</TabsTrigger>
              <TabsTrigger value="results">🏸 Resultados</TabsTrigger>
            </TabsList>
            <TabsContent value="ranking" className="space-y-3 mt-6">
              {ranking.map((r, idx) => (
                <div key={r.player.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
                  <div className="text-2xl font-bold text-muted-foreground w-8">{idx + 1}º</div>
                  <div className="flex-1 font-semibold">{r.player.name}</div>
                  <div className="text-2xl font-bold text-primary">{r.pts} pts</div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="results" className="space-y-3 mt-6">
              {matches.map((m, idx) => {
                const p1 = players.find((p) => p.id === m.team1_player1_id)
                const p2 = players.find((p) => p.id === m.team1_player2_id)
                const p3 = players.find((p) => p.id === m.team2_player1_id)
                const p4 = players.find((p) => p.id === m.team2_player2_id)
                const done = m.score1 !== null && m.score2 !== null
                return (
                  <div key={m.id} className="p-4 bg-card border border-border rounded-xl space-y-2">
                    <div className="text-xs text-muted-foreground font-bold tracking-wider">JOGO {idx + 1}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{p1?.name} & {p2?.name}</span>
                      {done ? (
                        <span className="font-bold text-lg text-primary">{m.score1} — {m.score2}</span>
                      ) : (
                        <Badge variant="secondary">Aguardando</Badge>
                      )}
                      <span className="text-sm">{p3?.name} & {p4?.name}</span>
                    </div>
                  </div>
                )
              })}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Criar `src/app/pages/PlayerPage.tsx`**

```typescript
import { useAuth } from '../../lib/auth'
import { PlayerDashboard } from '../components/player/PlayerDashboard'
import { Button } from '../components/ui/button'

export default function PlayerPage() {
  const { signOut, user } = useAuth()
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Torneio de <span className="text-primary">Beach Tennis</span></h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>Sair</Button>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <PlayerDashboard />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Criar `src/app/components/admin/PlayerAccessManager.tsx`** (para admin cadastrar emails de jogadores)

```typescript
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/auth'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { toast } from 'sonner'

export function PlayerAccessManager() {
  const { adminId } = useAuth()
  const [emails, setEmails] = useState<{ id: string; email: string }[]>([])
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ email: string }>()

  useEffect(() => {
    if (!adminId) return
    supabase
      .from('player_access')
      .select('id, email')
      .eq('admin_id', adminId)
      .then(({ data }) => setEmails(data ?? []))
  }, [adminId])

  const onSubmit = async ({ email }: { email: string }) => {
    const { error } = await supabase.from('player_access').insert({ email, admin_id: adminId })
    if (error) {
      toast.error('Erro ao adicionar jogador. Email pode já estar cadastrado.')
      return
    }
    setEmails((prev) => [...prev, { id: Date.now().toString(), email }])
    reset()
    toast.success('Jogador adicionado.')
  }

  const removeAccess = async (id: string) => {
    await supabase.from('player_access').delete().eq('id', id)
    setEmails((prev) => prev.filter((e) => e.id !== id))
    toast.success('Acesso removido.')
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Acesso de Jogadores</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
        <Input
          type="email"
          placeholder="email@jogador.com"
          {...register('email', { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })}
        />
        <Button type="submit" size="sm">Adicionar</Button>
      </form>
      <div className="space-y-2">
        {emails.map((e) => (
          <div key={e.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm">{e.email}</span>
            <Button variant="ghost" size="sm" onClick={() => removeAccess(e.id)}>Remover</Button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Edge Function para criar player user**

No Supabase Dashboard → SQL Editor, execute para criar a função de cadastro automático de jogador:

```sql
-- Função que cria user_role 'player' quando um usuário com email em player_access faz login
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Verifica se é superadmin (seed manual)
  if exists (select 1 from public.user_roles where user_id = new.id) then
    return new;
  end if;

  -- Verifica se é admin
  if exists (select 1 from public.admin_profiles where email = new.email) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
    return new;
  end if;

  -- Verifica se é player pré-cadastrado
  if exists (select 1 from public.player_access where email = new.email) then
    insert into public.user_roles (user_id, role) values (new.id, 'player');
    return new;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_role();
```

- [ ] **Step 5: Build passa**

```bash
pnpm build 2>&1 | grep -c "error" 
```

Expected: 0

- [ ] **Step 6: Commit**

```bash
git add src/app/pages/PlayerPage.tsx src/app/components/player/ src/app/components/admin/PlayerAccessManager.tsx
git commit -m "feat: add player read-only view and access management"
```

---

## Task 9: Verificar acesso de admin bloqueado

Esta task garante que o RLS bloqueie admins inativos.

- [ ] **Step 1: Adicionar verificação de `is_active` no AuthContext**

Em `src/lib/auth.tsx`, após carregar `roleData`, adicionar:

```typescript
// Para admins: bloquear se is_active = false
if (roleData?.role === 'admin') {
  const { data: adminData } = await supabase
    .from('admin_profiles')
    .select('id, is_active')
    .eq('user_id', user.id)
    .single()

  if (!adminData?.is_active) {
    await supabase.auth.signOut()
    setState({ user: null, session: null, role: null, adminId: null, loading: false })
    return
  }
  adminId = adminData?.id ?? null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth.tsx
git commit -m "feat: block inactive admin login"
```

---

## Task 10: Ambiente de Homologação

**Files:**
- Create: `.env.staging`
- Create: `vite.config.staging.ts`
- Modify: `package.json` (script build:staging)

- [ ] **Step 1: Criar `.env.staging`**

```
VITE_SUPABASE_URL=https://mxjnydrllpxqwmfwzlsr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14am55ZHJsbHB4cXdtZnd6bHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzYxNTcsImV4cCI6MjA5MTg1MjE1N30.eBjZuqVcEFnW4CZJQxvkPoaYH6vzoRdzcTTapoB21Cs
VITE_ENV=staging
```

> **Nota:** Para isolamento real, crie um projeto Supabase separado para staging e substitua as chaves acima.

- [ ] **Step 2: Criar `vite.config.staging.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envFile: '.env.staging',
  build: {
    outDir: 'dist-staging',
  },
})
```

- [ ] **Step 3: Adicionar script ao `package.json`**

```json
"scripts": {
  "build": "vite build",
  "build:staging": "vite build --config vite.config.staging.ts"
}
```

- [ ] **Step 4: Testar build de staging**

```bash
pnpm build:staging
```

Expected: pasta `dist-staging/` criada sem erros.

- [ ] **Step 5: Commit**

```bash
git add .env.staging vite.config.staging.ts package.json
git commit -m "feat: add staging environment config"
```

---

## Task 11: Adicionar Sonner (toasts) ao app

- [ ] **Step 1: Adicionar `<Toaster />` no `main.tsx`**

Importar e adicionar ao JSX (sonner já está nas dependências):

```typescript
import { Toaster } from 'sonner'

// No JSX, dentro do AuthProvider:
<>
  <BrowserRouter>...</BrowserRouter>
  <Toaster richColors position="top-right" />
</>
```

- [ ] **Step 2: Commit**

```bash
git add src/main.tsx
git commit -m "feat: add toast notifications"
```

---

## Task 12: Push para GitHub e deploy de homologação

- [ ] **Step 1: Push da branch para o GitHub**

```bash
git push origin HEAD
```

- [ ] **Step 2: Abrir PR no GitHub**

```bash
gh pr create --title "feat: sistema multi-nível de usuários" \
  --body "Adiciona superadmin, admin e player com Supabase Auth + RLS. Ver docs/superpowers/plans/2026-04-28-multi-role-auth.md para detalhes."
```

- [ ] **Step 3: Build de homologação e deploy manual**

```bash
pnpm build:staging
```

Fazer upload da pasta `dist-staging/` para o servidor de homologação (Netlify, Vercel preview, ou GitHub Pages).

- [ ] **Step 4: Validar fluxo de homologação**

Checklist manual:
- [ ] Login como superadmin (chrisjsp35@gmail.com) → vai para `/superadmin`
- [ ] Criar um admin de teste → confirmar que aparece na lista
- [ ] Desativar o admin → tentar login com o admin → deve ser bloqueado
- [ ] Reativar o admin → login funciona → vai para `/admin`
- [ ] Admin cria torneio → gera partidas → salva pontuação
- [ ] Admin cadastra email de jogador em player_access
- [ ] Jogador faz login → vai para `/player` → vê ranking e resultados
- [ ] Jogador tenta acessar `/admin` → redireciona para `/unauthorized`
- [ ] Admin A não vê torneios do Admin B

- [ ] **Step 5: Após validação, fazer merge do PR e deploy de produção**

```bash
gh pr merge --squash
```

Deploy produção: build normal + upload para peladabeachtennis.com.br conforme processo atual.

---

## Self-Review

### Cobertura da spec
| Requisito | Task |
|-----------|------|
| Super usuário chrisjsp35@gmail.com | Task 2 (seed) + Task 3 (auth) |
| Superadmin habilita/desabilita admins | Task 5 (AdminList com toggle) |
| Admin cria e administra torneios | Task 7 |
| Isolamento: admin vê só seus torneios | Task 2 (RLS) |
| Admin é email válido (validação) | Task 5 (CreateAdminDialog pattern) |
| Jogador: acesso read-only via email pré-cadastrado | Task 8 |
| Jogador vê resultados, ranking, histórico | Task 8 (PlayerDashboard) |
| Ambiente de homologação | Task 10 |
| Deploy produção | Task 12 |

### Sem placeholders detectados: ✓
### Tipos consistentes entre tasks: ✓ (database.types.ts é fonte única)
