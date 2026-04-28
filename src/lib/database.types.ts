export type UserRole = 'super_admin' | 'admin' | 'player'
export type UserStatus = 'active' | 'blocked'
export type TournamentStatus = 'active' | 'finished' | 'archived'

export interface Profile {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  created_at: string
  updated_at: string
}

export interface Tournament {
  id: string
  owner_id: string
  name: string
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
  owner_id: string
  created_at: string
}
