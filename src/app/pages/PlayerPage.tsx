import { useAuth } from '../../lib/auth'
import { PlayerDashboard } from '../components/player/PlayerDashboard'
import { Button } from '../components/ui/button'

export default function PlayerPage() {
  const { signOut, user } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">
            Torneio de <span className="text-primary">Beach Tennis</span>
          </h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Sair
        </Button>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <PlayerDashboard />
      </main>
    </div>
  )
}
