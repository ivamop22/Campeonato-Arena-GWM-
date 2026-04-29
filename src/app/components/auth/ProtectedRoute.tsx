import { Navigate } from 'react-router'
import { useAuth } from '../../../lib/auth'
import { UserRole } from '../../../lib/database.types'

interface Props {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

export function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, role, status, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm tracking-wide">Carregando...</div>
      </div>
    )
  }

  if (!user || !role) return <Navigate to="/login" replace />
  if (status === 'blocked') return <Navigate to="/unauthorized" replace />
  if (!allowedRoles.includes(role)) return <Navigate to="/unauthorized" replace />

  return <>{children}</>
}
