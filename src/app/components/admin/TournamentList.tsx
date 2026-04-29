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
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from('tournaments')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error('Erro ao carregar torneios.')
        setTournaments((data as Tournament[]) ?? [])
        setLoading(false)
      })
  }, [user, refreshKey])

  if (loading) return <p className="text-muted-foreground text-sm">Carregando...</p>

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold">Meus Torneios</h2>
        <Button size="sm" onClick={onNew}>Novo Torneio</Button>
      </div>
      {tournaments.length === 0 ? (
        <p className="text-muted-foreground text-center py-8 text-sm">
          Nenhum torneio criado ainda. Crie o primeiro!
        </p>
      ) : (
        tournaments.map((t) => (
          <div
            key={t.id}
            onClick={() => onSelect(t)}
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
          >
            <div>
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(t.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Ativo
            </Badge>
          </div>
        ))
      )}
    </div>
  )
}
