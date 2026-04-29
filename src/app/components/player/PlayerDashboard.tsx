import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/auth'
import { Tournament, TournamentMatch, TournamentPlayer } from '../../../lib/database.types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Badge } from '../ui/badge'

export function PlayerDashboard() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selected, setSelected] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [players, setPlayers] = useState<TournamentPlayer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.email) return
    supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTournaments((data as Tournament[]) ?? [])
        setLoading(false)
      })
  }, [user])

  async function selectTournament(t: Tournament) {
    setSelected(t)
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from('tournament_matches').select('*').eq('tournament_id', t.id).order('match_index'),
      supabase.from('tournament_players').select('*').eq('tournament_id', t.id),
    ])
    setMatches((m as TournamentMatch[]) ?? [])
    setPlayers((p as TournamentPlayer[]) ?? [])
  }

  function playerName(id: string) {
    return players.find((p) => p.id === id)?.name ?? '?'
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
      const played = matches.filter(
        (m) =>
          m.score1 !== null &&
          (m.team1_player1_id === player.id ||
            m.team1_player2_id === player.id ||
            m.team2_player1_id === player.id ||
            m.team2_player2_id === player.id)
      ).length
      return { player, pts, played }
    })
    .sort((a, b) => b.pts - a.pts || b.played - a.played)

  if (loading) return <p className="text-muted-foreground text-sm">Carregando...</p>

  if (!selected) {
    return (
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Torneios disponíveis</h2>
        {tournaments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">Nenhum torneio disponível.</p>
        ) : (
          tournaments.map((t) => (
            <div
              key={t.id}
              onClick={() => selectTournament(t)}
              className="p-4 bg-card border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(t.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setSelected(null)}
        className="text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
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
          {ranking.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">Sem jogadores ainda.</p>
          ) : (
            ranking.map((r, idx) => {
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div
                  key={r.player.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${
                    idx === 0 ? 'bg-accent/10 border-accent/30' : 'bg-card border-border'
                  }`}
                >
                  <div className="text-xl font-bold text-muted-foreground w-8 text-center">
                    {idx < 3 ? medals[idx] : `${idx + 1}º`}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{r.player.name}</div>
                    <div className="text-xs text-muted-foreground">{r.played} partida(s)</div>
                  </div>
                  <div className="text-2xl font-bold text-primary">{r.pts}</div>
                </div>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-3 mt-6">
          {matches.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">Sem partidas ainda.</p>
          ) : (
            matches.map((m, idx) => {
              const done = m.score1 !== null && m.score2 !== null
              const win1 = done && m.score1! > m.score2!
              const win2 = done && m.score2! > m.score1!
              return (
                <div key={m.id} className="p-4 bg-card border border-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-muted-foreground">
                      JOGO {idx + 1}
                    </span>
                    <Badge
                      variant={done ? 'default' : 'secondary'}
                      className={done ? 'bg-primary/10 text-primary border-primary/20' : ''}
                    >
                      {done ? 'Concluído' : 'Aguardando'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm">
                    <div className={`text-center font-semibold ${win1 ? 'text-primary' : ''}`}>
                      {playerName(m.team1_player1_id)} & {playerName(m.team1_player2_id)}
                    </div>
                    <div className="text-center font-bold text-lg px-2">
                      {done ? `${m.score1} — ${m.score2}` : 'vs'}
                    </div>
                    <div className={`text-center font-semibold ${win2 ? 'text-primary' : ''}`}>
                      {playerName(m.team2_player1_id)} & {playerName(m.team2_player2_id)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
