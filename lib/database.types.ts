export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          created_at: string
          ended_at: string | null
          status: 'active' | 'completed'
          deleted_at: string | null
          self_destructed: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          ended_at?: string | null
          status?: 'active' | 'completed'
          deleted_at?: string | null
          self_destructed?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          ended_at?: string | null
          status?: 'active' | 'completed'
          deleted_at?: string | null
          self_destructed?: boolean
        }
      }
      players: {
        Row: {
          id: string
          session_id: string
          name: string
          initial_buy_in: number
          total_buy_in: number
          final_chips: number | null
          net_amount: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          name: string
          initial_buy_in?: number
          total_buy_in?: number
          final_chips?: number | null
          net_amount?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          name?: string
          initial_buy_in?: number
          total_buy_in?: number
          final_chips?: number | null
          net_amount?: number | null
          created_at?: string
        }
      }
      settlements: {
        Row: {
          id: string
          session_id: string
          from_player_id: string
          to_player_id: string
          amount: number
          settled: boolean
          settled_at: string | null
          settled_by_goons: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          from_player_id: string
          to_player_id: string
          amount: number
          settled?: boolean
          settled_at?: string | null
          settled_by_goons?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          from_player_id?: string
          to_player_id?: string
          amount?: number
          settled?: boolean
          settled_at?: string | null
          settled_by_goons?: boolean
          created_at?: string
        }
      }
      rummy_sessions: {
        Row: {
          id: string
          created_at: string
          ended_at: string | null
          status: 'active' | 'completed'
          deleted_at: string | null
          self_destructed: boolean
          game_type: 'pool_101' | 'pool_201'
          player_count: number
          entry_fee: number
          current_round: number
          prize_split: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          ended_at?: string | null
          status?: 'active' | 'completed'
          deleted_at?: string | null
          self_destructed?: boolean
          game_type?: 'pool_101' | 'pool_201'
          player_count: number
          entry_fee: number
          current_round?: number
          prize_split?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          ended_at?: string | null
          status?: 'active' | 'completed'
          deleted_at?: string | null
          self_destructed?: boolean
          game_type?: 'pool_101' | 'pool_201'
          player_count?: number
          entry_fee?: number
          current_round?: number
          prize_split?: boolean
        }
      }
      rummy_players: {
        Row: {
          id: string
          session_id: string
          name: string
          score: number
          is_eliminated: boolean
          is_winner: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          name: string
          score?: number
          is_eliminated?: boolean
          is_winner?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          name?: string
          score?: number
          is_eliminated?: boolean
          is_winner?: boolean
          created_at?: string
        }
      }
      rummy_round_scores: {
        Row: {
          id: string
          session_id: string
          player_id: string
          round: number
          score: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          player_id: string
          round: number
          score: number
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          player_id?: string
          round?: number
          score?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      session_status: 'active' | 'completed'
    }
  }
}