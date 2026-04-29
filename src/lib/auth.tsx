import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { UserRole, UserStatus } from './database.types'

interface AuthState {
  user: User | null
  session: Session | null
  role: UserRole | null
  status: UserStatus | null
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
    status: null,
    loading: true,
  })

  async function loadUserMeta(user: User | null) {
    if (!user) {
      setState({ user: null, session: null, role: null, status: null, loading: false })
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    setState((prev) => ({
      ...prev,
      user,
      role: (data?.role as UserRole) ?? null,
      status: (data?.status as UserStatus) ?? null,
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
