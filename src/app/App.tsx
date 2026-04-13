import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, Zap, Award, RotateCcw, Play, Check, BarChart3, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Alert, AlertDescription } from './components/ui/alert';

type Player = {
  id: number;
  name: string;
};

type Match = {
  id: number;
  team1: [number, number];
  team2: [number, number];
  score1: number | null;
  score2: number | null;
};

export default function App() {
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

  const handlePlayerCountSelect = (count: number) => {
    setPlayerCount(count);
    const defaultNames = ['Ivan', 'Lucas', 'Rafa', 'Caio', 'Bruno', 'Léo', 'Mateus', 'Gui', 'Pedro', 'Enzo'];
    setPlayers(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        name: defaultNames[i] || `Jogador ${i + 1}`,
      }))
    );
  };

  const updatePlayerName = (id: number, name: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  // Algorithm to generate balanced matches
  const buildSchedule = (n: number): { t1: [number, number]; t2: [number, number] }[] | null => {
    const PLAYS = 4;

    // Generate all possible pairs
    const allPairs: [number, number][] = [];
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        allPairs.push([a, b]);
      }
    }

    // Generate all possible games (4 different players)
    const allGames: { t1: [number, number]; t2: [number, number] }[] = [];
    for (let i = 0; i < allPairs.length; i++) {
      for (let j = i + 1; j < allPairs.length; j++) {
        const [p1, p2] = [allPairs[i], allPairs[j]];
        if (new Set([...p1, ...p2]).size === 4) {
          allGames.push({ t1: p1, t2: p2 });
        }
      }
    }

    // Scoring function
    const scoreGame = (
      g: { t1: [number, number]; t2: [number, number] },
      playCount: number[],
      lastPlayers: Set<number>,
      usedOpponents: Set<string>
    ) => {
      const ps = [...g.t1, ...g.t2];
      let score = ps.reduce((a, p) => a + (PLAYS - playCount[p]), 0) * 10;
      score -= ps.filter((p) => lastPlayers.has(p)).length * 5;
      g.t1.forEach((a) =>
        g.t2.forEach((b) => {
          const key = [Math.min(a, b), Math.max(a, b)].join('-');
          if (!usedOpponents.has(key)) score += 2;
        })
      );
      return score;
    };

    // Backtracking
    const backtrack = (
      chosen: { t1: [number, number]; t2: [number, number] }[],
      playCount: number[],
      usedPairs: Set<string>,
      partnerMap: Set<number>[],
      usedOpponents: Set<string>,
      lastPlayers: Set<number>
    ): { t1: [number, number]; t2: [number, number] }[] | null => {
      if (chosen.length === n) {
        return playCount.every((c) => c === PLAYS) ? [...chosen] : null;
      }

      const candidates = allGames.filter((g) => {
        if (chosen.includes(g)) return false;
        if (usedPairs.has(g.t1.join(',')) || usedPairs.has(g.t2.join(','))) return false;
        if ([...g.t1, ...g.t2].some((p) => playCount[p] >= PLAYS)) return false;
        if (partnerMap[g.t1[0]].has(g.t1[1]) || partnerMap[g.t2[0]].has(g.t2[1])) return false;
        return true;
      });

      candidates.sort((a, b) => scoreGame(b, playCount, lastPlayers, usedOpponents) - scoreGame(a, playCount, lastPlayers, usedOpponents));

      for (const g of candidates) {
        const ps = [...g.t1, ...g.t2];
        const newPlayCount = [...playCount];
        ps.forEach((p) => newPlayCount[p]++);

        const newUsedPairs = new Set(usedPairs);
        newUsedPairs.add(g.t1.join(','));
        newUsedPairs.add(g.t2.join(','));

        const newPartnerMap = partnerMap.map((s) => new Set(s));
        newPartnerMap[g.t1[0]].add(g.t1[1]);
        newPartnerMap[g.t1[1]].add(g.t1[0]);
        newPartnerMap[g.t2[0]].add(g.t2[1]);
        newPartnerMap[g.t2[1]].add(g.t2[0]);

        const newUsedOpponents = new Set(usedOpponents);
        g.t1.forEach((a) =>
          g.t2.forEach((b) => {
            const key = [Math.min(a, b), Math.max(a, b)].join('-');
            newUsedOpponents.add(key);
          })
        );

        const result = backtrack(
          [...chosen, g],
          newPlayCount,
          newUsedPairs,
          newPartnerMap,
          newUsedOpponents,
          new Set(ps)
        );

        if (result) return result;
      }

      return null;
    };

    return backtrack(
      [],
      new Array(n).fill(0),
      new Set(),
      Array.from({ length: n }, () => new Set()),
      new Set(),
      new Set()
    );
  };

  const generateMatches = () => {
    if (!playerCount || players.length < 6) return;

    const schedule = buildSchedule(playerCount);
    if (!schedule) {
      alert('Não foi possível gerar torneio válido.');
      return;
    }

    const generatedMatches: Match[] = schedule.map((g, idx) => ({
      id: idx,
      team1: g.t1,
      team2: g.t2,
      score1: null,
      score2: null,
    }));

    setMatches(generatedMatches);
    setGameStarted(true);
  };

  const updateScore = (matchId: number, team: 1 | 2, delta: number) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        if (team === 1) {
          const current = m.score1 ?? 0;
          return { ...m, score1: Math.max(0, Math.min(4, current + delta)) };
        } else {
          const current = m.score2 ?? 0;
          return { ...m, score2: Math.max(0, Math.min(4, current + delta)) };
        }
      })
    );
  };

  const resetTournament = () => {
    setPlayerCount(null);
    setPlayers([]);
    setMatches([]);
    setGameStarted(false);
  };

  // Calculate total points per player
  const playerTotals = useMemo(() => {
    const totals = new Array(players.length).fill(0);
    matches.forEach((m) => {
      if (m.score1 !== null && m.score2 !== null) {
        m.team1.forEach((p) => (totals[p] += m.score1!));
        m.team2.forEach((p) => (totals[p] += m.score2!));
      }
    });
    return totals;
  }, [matches, players.length]);

  // Calculate games played per player
  const gamesPlayed = useMemo(() => {
    const played = new Array(players.length).fill(0);
    matches.forEach((m) => {
      if (m.score1 !== null && m.score2 !== null) {
        [...m.team1, ...m.team2].forEach((p) => played[p]++);
      }
    });
    return played;
  }, [matches, players.length]);

  // Get partners for each player
  const partnerMap = useMemo(() => {
    const pm: Set<number>[] = Array.from({ length: players.length }, () => new Set());
    matches.forEach((m) => {
      pm[m.team1[0]].add(m.team1[1]);
      pm[m.team1[1]].add(m.team1[0]);
      pm[m.team2[0]].add(m.team2[1]);
      pm[m.team2[1]].add(m.team2[0]);
    });
    return pm;
  }, [matches, players.length]);

  // Validation checks
  const playCount = useMemo(() => {
    const count = new Array(players.length).fill(0);
    matches.forEach((m) => {
      [...m.team1, ...m.team2].forEach((p) => count[p]++);
    });
    return count;
  }, [matches, players.length]);

  const validation = useMemo(() => {
    const usedPairs = new Set<string>();
    let duplicatePair = false;

    matches.forEach((m) => {
      const k1 = m.team1.join(',');
      const k2 = m.team2.join(',');
      if (usedPairs.has(k1) || usedPairs.has(k2)) duplicatePair = true;
      usedPairs.add(k1);
      usedPairs.add(k2);
    });

    const duplicatePlayer = matches.some((m) => new Set([...m.team1, ...m.team2]).size < 4);

    return {
      allPlay4: playCount.every((c) => c === 4),
      noDuplicatePairs: !duplicatePair,
      all4Partners: partnerMap.every((s) => s.size === 4),
      noDuplicatePlayer: !duplicatePlayer,
    };
  }, [playCount, partnerMap, matches]);

  const ranking = useMemo(() => {
    return players
      .map((player) => ({
        player,
        points: playerTotals[player.id],
        played: gamesPlayed[player.id],
      }))
      .sort((a, b) => b.points - a.points || b.played - a.played);
  }, [players, playerTotals, gamesPlayed]);

  const totalMatches = matches.length;
  const playedMatches = matches.filter((m) => m.score1 !== null && m.score2 !== null).length;
  const progress = totalMatches > 0 ? (playedMatches / totalMatches) * 100 : 0;

  const uniquePairs = useMemo(() => {
    const pairs = new Set<string>();
    matches.forEach((m) => {
      pairs.add(m.team1.join(','));
      pairs.add(m.team2.join(','));
    });
    return pairs.size;
  }, [matches]);

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
          {/* Beach Tennis Player Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            className="absolute -top-4 -right-2 md:top-0 md:right-4 w-32 h-32 md:w-40 md:h-40"
          >
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
              {/* Player body */}
              <circle cx="100" cy="50" r="20" fill="#00D46C" opacity="0.9" />
              {/* Head */}
              <circle cx="100" cy="50" r="15" fill="#F5C842" />
              {/* Body */}
              <rect x="92" y="65" width="16" height="40" fill="#00D46C" rx="8" />
              {/* Arms */}
              <rect x="70" y="70" width="35" height="10" fill="#00D46C" rx="5" transform="rotate(-30 87 75)" />
              <rect x="95" y="70" width="35" height="10" fill="#00D46C" rx="5" transform="rotate(45 113 75)" />
              {/* Legs */}
              <rect x="85" y="100" width="12" height="35" fill="#00D46C" rx="6" transform="rotate(10 91 117)" />
              <rect x="103" y="100" width="12" height="35" fill="#00D46C" rx="6" transform="rotate(-15 109 117)" />
              {/* Racket */}
              <ellipse cx="135" cy="45" rx="18" ry="22" fill="none" stroke="#F5C842" strokeWidth="4" transform="rotate(25 135 45)" />
              <rect x="125" y="65" width="6" height="30" fill="#8BA898" rx="3" transform="rotate(25 128 80)" />
              {/* Ball */}
              <circle cx="160" cy="25" r="8" fill="#FF6C2F">
                <animate attributeName="cy" values="25;20;25" dur="1s" repeatCount="indefinite" />
              </circle>
              {/* Motion lines */}
              <line x1="145" y1="35" x2="155" y2="30" stroke="#00D46C" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
              <line x1="143" y1="42" x2="153" y2="37" stroke="#00D46C" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
            </svg>
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-2">
            Torneio de <span className="text-primary">Beach Tennis</span>
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
                        <div className="flex flex-col items-center gap-1">
                          <span>{count}</span>
                          <span className="text-[9px] font-semibold tracking-wider uppercase opacity-65">
                            jogadores
                          </span>
                        </div>
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

              {/* Info Note */}
              {playerCount && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4"
                >
                  <p className="text-sm text-blue-400 leading-relaxed">
                    {playerCount} jogadores → {playerCount} partidas · cada jogador joga 4 vezes · {playerCount * 2} duplas únicas
                  </p>
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
                    GERAR CHAVEAMENTO
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
              {/* Banner */}
              {validation.allPlay4 && validation.noDuplicatePairs && validation.all4Partners && validation.noDuplicatePlayer ? (
                <Alert className="bg-primary/10 border-primary/30 text-primary">
                  <Trophy className="w-5 h-5" />
                  <AlertDescription>
                    {playerCount} jogadores · {totalMatches} partidas · torneio válido e equilibrado!
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
                  <XCircle className="w-5 h-5" />
                  <AlertDescription>Atenção: conflitos no chaveamento.</AlertDescription>
                </Alert>
              )}

              {/* Progress Bar */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-muted-foreground tracking-wide">Progresso do torneio</span>
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
                {[
                  { label: 'Jogadores', value: playerCount },
                  { label: 'Partidas', value: totalMatches },
                  { label: 'Duplas', value: uniquePairs },
                  { label: 'Concluídas', value: playedMatches },
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className="bg-muted border border-border rounded-xl p-4 text-center"
                  >
                    <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                    <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="matches" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/50">
                  <TabsTrigger value="matches" className="font-semibold text-xs md:text-sm">
                    🏸 Partidas
                  </TabsTrigger>
                  <TabsTrigger value="ranking" className="font-semibold text-xs md:text-sm">
                    🏆 Ranking
                  </TabsTrigger>
                  <TabsTrigger value="stats" className="font-semibold text-xs md:text-sm">
                    📊 Estatísticas
                  </TabsTrigger>
                  <TabsTrigger value="validation" className="font-semibold text-xs md:text-sm">
                    ✅ Validação
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="matches" className="space-y-4 mt-6">
                  {matches.map((match, idx) => {
                    const done = match.score1 !== null && match.score2 !== null;
                    const win1 = done && match.score1! > match.score2!;
                    const win2 = done && match.score2! > match.score1!;

                    return (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-muted border border-border rounded-2xl p-5 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold tracking-wider text-muted-foreground text-sm">
                            JOGO {idx + 1}
                          </div>
                          <Badge
                            variant={done ? 'default' : 'secondary'}
                            className={
                              done
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                            }
                          >
                            {done ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Concluído
                              </>
                            ) : (
                              'Aguardando'
                            )}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                            <Badge
                              variant="outline"
                              className={
                                win1
                                  ? 'bg-primary/10 text-primary border-primary/30'
                                  : 'bg-card text-foreground border-border'
                              }
                            >
                              {players[match.team1[0]].name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">&</span>
                            <Badge
                              variant="outline"
                              className={
                                win1
                                  ? 'bg-primary/10 text-primary border-primary/30'
                                  : 'bg-card text-foreground border-border'
                              }
                            >
                              {players[match.team1[1]].name}
                            </Badge>
                          </div>

                          <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/25 font-bold tracking-wider">
                            VS
                          </Badge>

                          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                            <Badge
                              variant="outline"
                              className={
                                win2
                                  ? 'bg-primary/10 text-primary border-primary/30'
                                  : 'bg-card text-foreground border-border'
                              }
                            >
                              {players[match.team2[0]].name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">&</span>
                            <Badge
                              variant="outline"
                              className={
                                win2
                                  ? 'bg-primary/10 text-primary border-primary/30'
                                  : 'bg-card text-foreground border-border'
                              }
                            >
                              {players[match.team2[1]].name}
                            </Badge>
                          </div>
                        </div>

                        <div className="h-px bg-border" />

                        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground text-center">
                              {players[match.team1[0]].name} & {players[match.team1[1]].name}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateScore(match.id, 1, -1)}
                                className="w-8 h-8 p-0 border-border hover:border-primary hover:text-primary hover:bg-primary/10"
                              >
                                −
                              </Button>
                              <div
                                className={`text-4xl font-bold min-w-[48px] text-center ${
                                  win1 ? 'text-primary' : 'text-foreground'
                                }`}
                              >
                                {match.score1 ?? '—'}
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
                            <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                              Pontos dupla: <span className="text-accent">{done ? match.score1 : '—'}</span>
                            </div>
                          </div>

                          <div className="text-2xl font-bold text-muted-foreground">:</div>

                          <div className="flex flex-col items-center gap-3">
                            <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground text-center">
                              {players[match.team2[0]].name} & {players[match.team2[1]].name}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateScore(match.id, 2, -1)}
                                className="w-8 h-8 p-0 border-border hover:border-primary hover:text-primary hover:bg-primary/10"
                              >
                                −
                              </Button>
                              <div
                                className={`text-4xl font-bold min-w-[48px] text-center ${
                                  win2 ? 'text-primary' : 'text-foreground'
                                }`}
                              >
                                {match.score2 ?? '—'}
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
                            <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                              Pontos dupla: <span className="text-accent">{done ? match.score2 : '—'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Individual Points */}
                        <div className="bg-card border border-border rounded-xl p-3 flex justify-between text-[11px] text-muted-foreground">
                          <span>
                            {players[match.team1[0]].name}: <b className="text-accent">{playerTotals[match.team1[0]]} pts</b> &nbsp;
                            {players[match.team1[1]].name}: <b className="text-accent">{playerTotals[match.team1[1]]} pts</b>
                          </span>
                          <span>
                            {players[match.team2[0]].name}: <b className="text-accent">{playerTotals[match.team2[0]]} pts</b> &nbsp;
                            {players[match.team2[1]].name}: <b className="text-accent">{playerTotals[match.team2[1]]} pts</b>
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="ranking" className="space-y-4 mt-6">
                  {ranking.every((r) => r.played === 0) ? (
                    <p className="text-muted-foreground text-center py-8">
                      Registre os resultados para ver o ranking.
                    </p>
                  ) : (
                    ranking.map((r, idx) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      return (
                        <motion.div
                          key={r.player.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`flex items-center gap-4 p-5 rounded-2xl border ${
                            idx === 0
                              ? 'bg-accent/10 border-accent/30'
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
                              {idx + 1}º
                            </div>
                            {idx < 3 && <div className="text-2xl">{medals[idx]}</div>}
                          </div>

                          <div className="flex-1">
                            <div className="font-bold text-lg mb-1">{r.player.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {r.played} partida(s) disputada(s)
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-3xl font-bold text-primary leading-none">
                              {r.points}
                            </div>
                            <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mt-1">
                              pontos
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </TabsContent>

                <TabsContent value="stats" className="mt-6">
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted border-b border-border">
                            <th className="text-left p-3 text-xs font-bold tracking-wider uppercase text-muted-foreground">
                              Jogador
                            </th>
                            <th className="text-left p-3 text-xs font-bold tracking-wider uppercase text-muted-foreground">
                              Jogos
                            </th>
                            <th className="text-left p-3 text-xs font-bold tracking-wider uppercase text-muted-foreground">
                              Pts
                            </th>
                            <th className="text-left p-3 text-xs font-bold tracking-wider uppercase text-muted-foreground">
                              Parceiros
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {players.map((player, idx) => (
                            <tr key={player.id} className="border-b border-border hover:bg-muted/50">
                              <td className="p-3 font-bold">{player.name}</td>
                              <td className="p-3">{playCount[player.id]}</td>
                              <td className="p-3 font-bold text-primary">{playerTotals[player.id]}</td>
                              <td className="p-3 text-xs text-muted-foreground">
                                {Array.from(partnerMap[player.id])
                                  .map((p) => players[p].name)
                                  .join(', ') || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="validation" className="space-y-6 mt-6">
                  <div className="space-y-3">
                    {[
                      { ok: validation.allPlay4, msg: validation.allPlay4 ? 'Todos têm exatamente 4 partidas' : 'Partidas desbalanceadas' },
                      { ok: validation.noDuplicatePairs, msg: validation.noDuplicatePairs ? 'Nenhuma dupla se repete' : 'Duplas repetidas!' },
                      { ok: validation.all4Partners, msg: validation.all4Partners ? '4 parceiros distintos por jogador' : 'Parceiros insuficientes' },
                      { ok: validation.noDuplicatePlayer, msg: validation.noDuplicatePlayer ? 'Nenhum jogo com jogador repetido' : 'Jogador duplicado em jogo!' },
                    ].map((check, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`flex items-start gap-3 p-4 rounded-xl border ${
                          check.ok
                            ? 'bg-primary/10 border-primary/20 text-primary'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            check.ok ? 'bg-primary text-background' : 'bg-red-500 text-white'
                          }`}
                        >
                          {check.ok ? '✓' : '✗'}
                        </div>
                        <span className="font-semibold">{check.msg}</span>
                      </motion.div>
                    ))}
                  </div>

                  <div>
                    <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-4">
                      Parceiros por jogador
                    </div>
                    <div className="space-y-3">
                      {players.map((player) => (
                        <div
                          key={player.id}
                          className="bg-muted border border-border rounded-xl p-4"
                        >
                          <div className="font-bold mb-2">{player.name}</div>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(partnerMap[player.id]).map((p) => (
                              <Badge key={p} variant="secondary" className="text-xs">
                                {players[p].name}
                              </Badge>
                            )) || <span className="text-muted-foreground">—</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
                  Novo Torneio
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
        Torneio de Beach Tennis Arena GWM · 2026 · VenkoIT
      </motion.footer>
    </div>
  );
}
