import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { Tournament } from '../../lib/database.types'
import { TournamentList } from '../components/admin/TournamentList'
import { TournamentForm } from '../components/admin/TournamentForm'
import { PlayerAccessManager } from '../components/admin/PlayerAccessManager'
import TournamentApp from '../TournamentApp'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

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
          <h1 className="text-lg font-bold">Painel Admin</h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          {view !== 'list' && (
            <Button variant="ghost" size="sm" onClick={() => setView('list')}>
              ← Torneios
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            Sair
          </Button>
        </div>
      </header>
      <main className={view === 'tournament' ? '' : 'max-w-2xl mx-auto px-4 py-8'}>
        {view === 'list' && (
          <Tabs defaultValue="tournaments">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="tournaments">🏆 Torneios</TabsTrigger>
              <TabsTrigger value="players">👥 Jogadores</TabsTrigger>
            </TabsList>
            <TabsContent value="tournaments">
              <TournamentList
                onSelect={handleSelect}
                onNew={() => setView('new')}
                refreshKey={refreshKey}
              />
            </TabsContent>
            <TabsContent value="players">
              <PlayerAccessManager />
            </TabsContent>
          </Tabs>
        )}
        {view === 'new' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Novo Torneio</h2>
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
