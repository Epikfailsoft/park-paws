export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      daily_template_counts: {
        Row: {
          count: number | null
          date: string
          dog_id: string
          id: string
        }
        Insert: {
          count?: number | null
          date?: string
          dog_id: string
          id?: string
        }
        Update: {
          count?: number | null
          date?: string
          dog_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_template_counts_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_wave_counts: {
        Row: {
          count: number | null
          date: string
          dog_id: string
          id: string
        }
        Insert: {
          count?: number | null
          date?: string
          dog_id: string
          id?: string
        }
        Update: {
          count?: number | null
          date?: string
          dog_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_wave_counts_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dogs: {
        Row: {
          active_times: string[] | null
          allergies_notes: string | null
          approximate_age: string
          avg_park_duration: string | null
          behavior: string | null
          created_at: string
          current_park_id: string | null
          dislikes: string | null
          energy_level: number
          favorite_game: string | null
          id: string
          is_active_in_park: boolean | null
          is_neutered: boolean | null
          last_active_at: string | null
          name: string
          owner_id: string
          park_mode_started_at: string | null
          photo_url: string
          sensitivities: string[] | null
          updated_at: string
          vaccination_notes: string | null
          weekly_frequency: string | null
          zodiac_sign: string | null
        }
        Insert: {
          active_times?: string[] | null
          allergies_notes?: string | null
          approximate_age: string
          avg_park_duration?: string | null
          behavior?: string | null
          created_at?: string
          current_park_id?: string | null
          dislikes?: string | null
          energy_level: number
          favorite_game?: string | null
          id?: string
          is_active_in_park?: boolean | null
          is_neutered?: boolean | null
          last_active_at?: string | null
          name: string
          owner_id: string
          park_mode_started_at?: string | null
          photo_url: string
          sensitivities?: string[] | null
          updated_at?: string
          vaccination_notes?: string | null
          weekly_frequency?: string | null
          zodiac_sign?: string | null
        }
        Update: {
          active_times?: string[] | null
          allergies_notes?: string | null
          approximate_age?: string
          avg_park_duration?: string | null
          behavior?: string | null
          created_at?: string
          current_park_id?: string | null
          dislikes?: string | null
          energy_level?: number
          favorite_game?: string | null
          id?: string
          is_active_in_park?: boolean | null
          is_neutered?: boolean | null
          last_active_at?: string | null
          name?: string
          owner_id?: string
          park_mode_started_at?: string | null
          photo_url?: string
          sensitivities?: string[] | null
          updated_at?: string
          vaccination_notes?: string | null
          weekly_frequency?: string | null
          zodiac_sign?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dogs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      harmonies: {
        Row: {
          created_at: string
          dog_1_id: string
          dog_2_id: string
          id: string
        }
        Insert: {
          created_at?: string
          dog_1_id: string
          dog_2_id: string
          id?: string
        }
        Update: {
          created_at?: string
          dog_1_id?: string
          dog_2_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "harmonies_dog_1_id_fkey"
            columns: ["dog_1_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harmonies_dog_2_id_fkey"
            columns: ["dog_2_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          from_dog_id: string
          harmony_id: string
          id: string
          template_number: number
          template_response: string | null
        }
        Insert: {
          created_at?: string
          from_dog_id: string
          harmony_id: string
          id?: string
          template_number: number
          template_response?: string | null
        }
        Update: {
          created_at?: string
          from_dog_id?: string
          harmony_id?: string
          id?: string
          template_number?: number
          template_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_from_dog_id_fkey"
            columns: ["from_dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_harmony_id_fkey"
            columns: ["harmony_id"]
            isOneToOne: false
            referencedRelation: "harmonies"
            referencedColumns: ["id"]
          },
        ]
      }
      park_approvals: {
        Row: {
          created_at: string
          id: string
          park_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          park_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          park_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "park_approvals_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "park_approvals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parks: {
        Row: {
          activated_at: string | null
          approval_count: number | null
          created_at: string
          id: string
          is_beta: boolean | null
          location: string | null
          name: string
          requested_at: string | null
          requested_by: string | null
          status: string
        }
        Insert: {
          activated_at?: string | null
          approval_count?: number | null
          created_at?: string
          id?: string
          is_beta?: boolean | null
          location?: string | null
          name: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string
        }
        Update: {
          activated_at?: string | null
          approval_count?: number | null
          created_at?: string
          id?: string
          is_beta?: boolean | null
          location?: string | null
          name?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "parks_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string
          id: string
          last_name_initial: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name_initial?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name_initial?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waves: {
        Row: {
          created_at: string
          from_dog_id: string
          id: string
          to_dog_id: string
        }
        Insert: {
          created_at?: string
          from_dog_id: string
          id?: string
          to_dog_id: string
        }
        Update: {
          created_at?: string
          from_dog_id?: string
          id?: string
          to_dog_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waves_from_dog_id_fkey"
            columns: ["from_dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waves_to_dog_id_fkey"
            columns: ["to_dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
