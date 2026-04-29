import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { AdminList } from '../components/superadmin/AdminList'
import { CreateAdminDialog } from '../components/superadmin/CreateAdminDialog'
import { Button } from '../components/ui/button'

export default function SuperAdminPage() {
  const { signOut, user } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Painel Super Admin</h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Sair
        </Button>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Administradores</h2>
          <CreateAdminDialog onCreated={() => setRefreshKey((k) => k + 1)} />
        </div>
        <AdminList refreshKey={refreshKey} />
      </main>
    </div>
  )
}
