import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, Zap, TrendingUp, Award, RotateCcw, Play, Check } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

type Player = {
  id: number;
  name: string;
};

type Match = {
  id: number;
  team1: [Player, Player];
  team2: [Player, Player];
  score1: number;
  score2: number;
  played: boolean;
};

type PlayerStats = {
  player: Player;
  wins: number;
  losses: number;
  points: number;
  matchesPlayed: number;
};

export default function App() {
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

  const handlePlayerCountSelect = (count: number) => {
    setPlayerCount(count);
    setPlayers(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        name: `Jogador ${i + 1}`,
      }))
    );
  };

  const updatePlayerName = (id: number, name: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const generateMatches = () => {
    if (!playerCount || players.length < 6) return;

    const allPairs: [Player, Player][] = [];
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        allPairs.push([players[i], players[j]]);
      }
    }

    const generatedMatches: Match[] = [];
    const usedPairs = new Set<string>();

    let matchId = 0;
    for (let i = 0; i < allPairs.length; i++) {
      for (let j = i + 1; j < allPairs.length; j++) {
        const team1 = allPairs[i];
        const team2 = allPairs[j];

        const hasCommonPlayer =
          team1[0].id === team2[0].id ||
          team1[0].id === team2[1].id ||
          team1[1].id === team2[0].id ||
          team1[1].id === team2[1].id;

        if (hasCommonPlayer) continue;

        const pairKey1 = [team1[0].id, team1[1].id].sort().join('-');
        const pairKey2 = [team2[0].id, team2[1].id].sort().join('-');

        if (!usedPairs.has(pairKey1) || !usedPairs.has(pairKey2)) {
          generatedMatches.push({
            id: matchId++,
            team1,
            team2,
            score1: 0,
            score2: 0,
            played: false,
          });
          usedPairs.add(pairKey1);
          usedPairs.add(pairKey2);
        }
      }
    }

    setMatches(generatedMatches);
    setGameStarted(true);
  };

  const updateScore = (matchId: number, team: 1 | 2, delta: number) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const newScore1 = team === 1 ? Math.max(0, Math.min(4, m.score1 + delta)) : m.score1;
        const newScore2 = team === 2 ? Math.max(0, Math.min(4, m.score2 + delta)) : m.score2;
        return {
          ...m,
          score1: newScore1,
          score2: newScore2,
          played: newScore1 > 0 || newScore2 > 0,
        };
      })
    );
  };

  const resetTournament = () => {
    setPlayerCount(null);
    setPlayers([]);
    setMatches([]);
    setGameStarted(false);
  };

  const playerStats: PlayerStats[] = useMemo(() => {
    const stats = new Map<number, PlayerStats>();

    players.forEach((player) => {
      stats.set(player.id, {
        player,
        wins: 0,
        losses: 0,
        points: 0,
        matchesPlayed: 0,
      });
    });

    matches.forEach((match) => {
      if (!match.played) return;

      const winner = match.score1 > match.score2 ? match.team1 : match.team2;
      const loser = match.score1 > match.score2 ? match.team2 : match.team1;

      winner.forEach((player) => {
        const stat = stats.get(player.id)!;
        stat.wins++;
        stat.points += 3;
        stat.matchesPlayed++;
      });

      loser.forEach((player) => {
        const stat = stats.get(player.id)!;
        stat.losses++;
        stat.matchesPlayed++;
      });
    });

    return Array.from(stats.values()).sort((a, b) => b.points - a.points);
  }, [players, matches]);

  const totalMatches = matches.length;
  const playedMatches = matches.filter((m) => m.played).length;
  const progress = totalMatches > 0 ? (playedMatches / totalMatches) * 100 : 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 212, 108, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0, 212, 108, 0.1) 1px, transparent 1px)`,
            backgroundSize: '44px 44px',
          }}
        />
      </div>

      {/* Radial Gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0, 212, 108, 0.08) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 md:mb-16 relative"
        >
          {/* Beach Tennis Player Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute top-0 right-4 md:right-8 w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg shadow-primary/10"
          >
            <img
              src="https://images.unsplash.com/photo-1744959475879-2a8d5a9fe418?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400"
              alt="Beach Tennis Player"
              className="w-full h-full object-cover"
            />
          </motion.div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-primary/80">
              Torneio Americano de Duplas
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-2">
            Pelada <span className="text-primary">Beach Tennis</span>
          </h1>
          <div className="text-xl md:text-2xl font-bold tracking-wider text-accent">
            Arena GWM
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Zap className="w-4 h-4" />
            <span className="tracking-wide">Sistema de Chaveamento Inteligente</span>
          </div>
        </motion.header>

        {!gameStarted ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {/* Player Count Selection */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold">Quantidade de jogadores</div>
                      <div className="text-xs text-muted-foreground tracking-wide">
                        Selecione de 6 a 10 participantes
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-5 gap-2">
                    {[6, 7, 8, 9, 10].map((count) => (
                      <motion.button
                        key={count}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePlayerCountSelect(count)}
                        className={`py-4 rounded-xl border-2 transition-all font-bold text-2xl ${
                          playerCount === count
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                        }`}
                      >
                        {count}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Player Names */}
              {playerCount && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-2xl overflow-hidden"
                >
                  <div className="p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-bold">Nome dos jogadores</div>
                        <div className="text-xs text-muted-foreground tracking-wide">
                          Personalize os participantes
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {players.map((player, idx) => (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="space-y-2"
                        >
                          <label className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-muted-foreground">
                            <div className="w-6 h-6 rounded-full bg-primary text-background flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            Jogador {idx + 1}
                          </label>
                          <Input
                            value={player.name}
                            onChange={(e) => updatePlayerName(player.id, e.target.value)}
                            className="bg-muted border-border/50 focus:border-primary"
                            placeholder={`Nome do jogador ${idx + 1}`}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Generate Button */}
              {playerCount && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Button
                    onClick={generateMatches}
                    size="lg"
                    className="w-full h-14 text-lg font-bold tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Gerar Chaveamento
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key="tournament"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Progress Bar */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-muted-foreground tracking-wide">Progresso do Torneio</span>
                  <span className="text-primary">
                    {playedMatches} / {totalMatches} partidas
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                  />
                </div>
              </motion.div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-muted border border-border rounded-xl p-4 text-center"
                >
                  <div className="text-3xl font-bold text-primary mb-1">{totalMatches}</div>
                  <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Partidas
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-muted border border-border rounded-xl p-4 text-center"
                >
                  <div className="text-3xl font-bold text-primary mb-1">{playedMatches}</div>
                  <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Jogadas
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-muted border border-border rounded-xl p-4 text-center"
                >
                  <div className="text-3xl font-bold text-primary mb-1">{playerCount}</div>
                  <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Jogadores
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-muted border border-border rounded-xl p-4 text-center"
                >
                  <div className="text-3xl font-bold text-primary mb-1">
                    {Math.round(progress)}%
                  </div>
                  <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Completo
                  </div>
                </motion.div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="matches" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50">
                  <TabsTrigger value="matches" className="font-semibold">
                    Partidas
                  </TabsTrigger>
                  <TabsTrigger value="ranking" className="font-semibold">
                    Ranking
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="matches" className="space-y-4 mt-6">
                  {matches.map((match, idx) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-muted border border-border rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold tracking-wider text-muted-foreground text-sm">
                          PARTIDA #{idx + 1}
                        </div>
                        <Badge
                          variant={match.played ? 'default' : 'secondary'}
                          className={
                            match.played
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                          }
                        >
                          {match.played ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Finalizada
                            </>
                          ) : (
                            'Pendente'
                          )}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                          <Badge
                            variant="outline"
                            className={
                              match.played && match.score1 > match.score2
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-card text-foreground border-border'
                            }
                          >
                            {match.team1[0].name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">&</span>
                          <Badge
                            variant="outline"
                            className={
                              match.played && match.score1 > match.score2
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-card text-foreground border-border'
                            }
                          >
                            {match.team1[1].name}
                          </Badge>
                        </div>

                        <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/25 font-bold tracking-wider">
                          VS
                        </Badge>

                        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                          <Badge
                            variant="outline"
                            className={
                              match.played && match.score2 > match.score1
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-card text-foreground border-border'
                            }
                          >
                            {match.team2[0].name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">&</span>
                          <Badge
                            variant="outline"
                            className={
                              match.played && match.score2 > match.score1
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-card text-foreground border-border'
                            }
                          >
                            {match.team2[1].name}
                          </Badge>
                        </div>
                      </div>

                      <div className="h-px bg-border" />

                      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground text-center max-w-[140px] truncate">
                            {match.team1[0].name} & {match.team1[1].name}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateScore(match.id, 1, -1)}
                              className="w-8 h-8 p-0 border-border hover:border-primary hover:text-primary hover:bg-primary/10"
                            >
                              -
                            </Button>
                            <div
                              className={`text-4xl font-bold min-w-[48px] text-center ${
                                match.played && match.score1 > match.score2
                                  ? 'text-primary'
                                  : 'text-foreground'
                              }`}
                            >
                              {match.score1}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateScore(match.id, 1, 1)}
                              className="w-8 h-8 p-0 border-border hover:border-primary hover:text-primary hover:bg-primary/10"
                            >
                              +
                            </Button>
                          </div>
                        </div>

                        <div className="text-2xl font-bold text-muted-foreground">:</div>

                        <div className="flex flex-col items-center gap-3">
                          <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground text-center max-w-[140px] truncate">
                            {match.team2[0].name} & {match.team2[1].name}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateScore(match.id, 2, -1)}
                              className="w-8 h-8 p-0 border-border hover:border-primary hover:text-primary hover:bg-primary/10"
                            >
                              -
                            </Button>
                            <div
                              className={`text-4xl font-bold min-w-[48px] text-center ${
                                match.played && match.score2 > match.score1
                                  ? 'text-primary'
                                  : 'text-foreground'
                              }`}
                            >
                              {match.score2}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateScore(match.id, 2, 1)}
                              className="w-8 h-8 p-0 border-border hover:border-primary hover:text-primary hover:bg-primary/10"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>

                      {match.played && (
                        <div className="text-center text-xs font-bold tracking-wider uppercase text-muted-foreground">
                          Total: <span className="text-accent">{match.score1 + match.score2}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </TabsContent>

                <TabsContent value="ranking" className="space-y-4 mt-6">
                  {playerStats.map((stat, idx) => (
                    <motion.div
                      key={stat.player.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex items-center gap-4 p-5 rounded-2xl border ${
                        idx === 0
                          ? 'bg-accent/10 border-accent/30'
                          : idx === 1
                            ? 'bg-muted border-border'
                            : idx === 2
                              ? 'bg-muted border-border'
                              : 'bg-muted border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`text-2xl font-bold min-w-[32px] text-center ${
                            idx === 0
                              ? 'text-accent'
                              : idx === 1
                                ? 'text-gray-400'
                                : idx === 2
                                  ? 'text-orange-600'
                                  : 'text-muted-foreground'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        {idx < 3 && (
                          <div className="text-2xl">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="font-bold text-lg mb-1">{stat.player.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {stat.wins}V - {stat.losses}D · {stat.matchesPlayed} jogos
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-3xl font-bold text-primary leading-none">
                          {stat.points}
                        </div>
                        <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mt-1">
                          pontos
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>
              </Tabs>

              {/* Reset Button */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Button
                  onClick={resetTournament}
                  variant="outline"
                  size="lg"
                  className="w-full h-12 border-border hover:border-orange-500/50 hover:text-orange-500 hover:bg-orange-500/10"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reiniciar Torneio
                </Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 text-center py-8 text-xs text-muted-foreground tracking-wider"
      >
        © 2026 Arena GWM · Sistema de Chaveamento Inteligente
      </motion.footer>
    </div>
  );
}
