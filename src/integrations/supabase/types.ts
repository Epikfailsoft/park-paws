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
      badges: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      breeds: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      care_documents: {
        Row: {
          document_type: string
          dog_id: string
          file_name: string
          file_url: string
          id: string
          uploaded_at: string | null
        }
        Insert: {
          document_type: string
          dog_id: string
          file_name: string
          file_url: string
          id?: string
          uploaded_at?: string | null
        }
        Update: {
          document_type?: string
          dog_id?: string
          file_name?: string
          file_url?: string
          id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_documents_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_wave_limits: {
        Row: {
          date: string
          user_id: string
          wave_count: number | null
        }
        Insert: {
          date?: string
          user_id: string
          wave_count?: number | null
        }
        Update: {
          date?: string
          user_id?: string
          wave_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_wave_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_badges: {
        Row: {
          badge_id: string
          dog_id: string
          earned_at: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          badge_id: string
          dog_id: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          badge_id?: string
          dog_id?: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dog_badges_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_care: {
        Row: {
          dog_id: string
          last_vet_visit: string | null
          notes: string | null
          parasite_protection_date: string | null
          parasite_protection_next_date: string | null
          updated_at: string
          vaccination_date: string | null
          vaccination_next_date: string | null
          vaccination_status: string
        }
        Insert: {
          dog_id: string
          last_vet_visit?: string | null
          notes?: string | null
          parasite_protection_date?: string | null
          parasite_protection_next_date?: string | null
          updated_at?: string
          vaccination_date?: string | null
          vaccination_next_date?: string | null
          vaccination_status?: string
        }
        Update: {
          dog_id?: string
          last_vet_visit?: string | null
          notes?: string | null
          parasite_protection_date?: string | null
          parasite_protection_next_date?: string | null
          updated_at?: string
          vaccination_date?: string | null
          vaccination_next_date?: string | null
          vaccination_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_care_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: true
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_lost_profile: {
        Row: {
          created_at: string | null
          dog_id: string
          emergency_phone: string
          last_seen_park_id: string | null
          lost_ends_at: string | null
          lost_started_at: string | null
        }
        Insert: {
          created_at?: string | null
          dog_id: string
          emergency_phone: string
          last_seen_park_id?: string | null
          lost_ends_at?: string | null
          lost_started_at?: string | null
        }
        Update: {
          created_at?: string | null
          dog_id?: string
          emergency_phone?: string
          last_seen_park_id?: string | null
          lost_ends_at?: string | null
          lost_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_lost_profile_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: true
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dog_lost_profile_last_seen_park_id_fkey"
            columns: ["last_seen_park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_private: {
        Row: {
          created_at: string | null
          dog_id: string
          emergency_phone: string
          microchip_id: string | null
          vaccination_expiry: string | null
        }
        Insert: {
          created_at?: string | null
          dog_id: string
          emergency_phone: string
          microchip_id?: string | null
          vaccination_expiry?: string | null
        }
        Update: {
          created_at?: string | null
          dog_id?: string
          emergency_phone?: string
          microchip_id?: string | null
          vaccination_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_private_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: true
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dogs: {
        Row: {
          approximate_age: string
          bio: string | null
          breed_custom_text: string | null
          breed_id: string
          created_at: string | null
          current_park_id: string | null
          daily_energy: number | null
          deleted_at: string | null
          dislikes: string[] | null
          energy_level: number
          gender: string | null
          id: string
          is_lost: boolean | null
          likes: string[] | null
          location: unknown
          location_updated_at: string | null
          name: string
          neutered: boolean
          owner_id: string
          owner_name_stub: string | null
          owner_photo_stub: string | null
          park_checkin_active: boolean | null
          park_checkin_expires_at: string | null
          park_checkin_started_at: string | null
          photo_url: string
          playdate_expires_at: string | null
          playdate_on: boolean | null
          playdate_started_at: string | null
          social_style: Database["public"]["Enums"]["social_style_type"] | null
          triggers: string[] | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          approximate_age: string
          bio?: string | null
          breed_custom_text?: string | null
          breed_id: string
          created_at?: string | null
          current_park_id?: string | null
          daily_energy?: number | null
          deleted_at?: string | null
          dislikes?: string[] | null
          energy_level: number
          gender?: string | null
          id?: string
          is_lost?: boolean | null
          likes?: string[] | null
          location?: unknown
          location_updated_at?: string | null
          name: string
          neutered: boolean
          owner_id: string
          owner_name_stub?: string | null
          owner_photo_stub?: string | null
          park_checkin_active?: boolean | null
          park_checkin_expires_at?: string | null
          park_checkin_started_at?: string | null
          photo_url: string
          playdate_expires_at?: string | null
          playdate_on?: boolean | null
          playdate_started_at?: string | null
          social_style?: Database["public"]["Enums"]["social_style_type"] | null
          triggers?: string[] | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          approximate_age?: string
          bio?: string | null
          breed_custom_text?: string | null
          breed_id?: string
          created_at?: string | null
          current_park_id?: string | null
          daily_energy?: number | null
          deleted_at?: string | null
          dislikes?: string[] | null
          energy_level?: number
          gender?: string | null
          id?: string
          is_lost?: boolean | null
          likes?: string[] | null
          location?: unknown
          location_updated_at?: string | null
          name?: string
          neutered?: boolean
          owner_id?: string
          owner_name_stub?: string | null
          owner_photo_stub?: string | null
          park_checkin_active?: boolean | null
          park_checkin_expires_at?: string | null
          park_checkin_started_at?: string | null
          photo_url?: string
          playdate_expires_at?: string | null
          playdate_on?: boolean | null
          playdate_started_at?: string | null
          social_style?: Database["public"]["Enums"]["social_style_type"] | null
          triggers?: string[] | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dogs_breed_id_fkey"
            columns: ["breed_id"]
            isOneToOne: false
            referencedRelation: "breeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dogs_current_park_id_fkey"
            columns: ["current_park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dogs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      harmonies: {
        Row: {
          created_at: string | null
          dog_a_id: string
          dog_b_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          dog_a_id: string
          dog_b_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          dog_a_id?: string
          dog_b_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "harmonies_dog_a_id_fkey"
            columns: ["dog_a_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harmonies_dog_b_id_fkey"
            columns: ["dog_b_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          harmony_id: string
          id: string
          message_type: Database["public"]["Enums"]["message_type"]
          sender_id: string
          template_id: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          harmony_id: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          sender_id: string
          template_id?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          harmony_id?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          sender_id?: string
          template_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_harmony_id_fkey"
            columns: ["harmony_id"]
            isOneToOne: false
            referencedRelation: "harmonies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          park_id: string | null
          payload: Json
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          park_id?: string | null
          payload: Json
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          park_id?: string | null
          payload?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      park_announcements: {
        Row: {
          announcement_type: string
          author_id: string | null
          body: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          park_id: string
          pinned: boolean | null
          title: string
        }
        Insert: {
          announcement_type?: string
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          park_id: string
          pinned?: boolean | null
          title: string
        }
        Update: {
          announcement_type?: string
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          park_id?: string
          pinned?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "park_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "park_announcements_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      park_approvals: {
        Row: {
          created_at: string | null
          id: string
          park_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          park_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      park_mode_sessions: {
        Row: {
          dog_id: string
          ended_at: string | null
          id: string
          park_id: string
          started_at: string | null
        }
        Insert: {
          dog_id: string
          ended_at?: string | null
          id?: string
          park_id: string
          started_at?: string | null
        }
        Update: {
          dog_id?: string
          ended_at?: string | null
          id?: string
          park_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "park_mode_sessions_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "park_mode_sessions_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      park_requests: {
        Row: {
          created_at: string | null
          id: string
          park_id: string
          requester_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          park_id: string
          requester_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          park_id?: string
          requester_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "park_requests_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "park_requests_requester_id_fkey"
            columns: ["requester_id"]
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
          created_at: string | null
          id: string
          is_beta: boolean | null
          location: Json | null
          name: string
          requested_at: string | null
          requested_by: string | null
          required_approvals: number | null
          status: Database["public"]["Enums"]["park_status"] | null
        }
        Insert: {
          activated_at?: string | null
          approval_count?: number | null
          created_at?: string | null
          id?: string
          is_beta?: boolean | null
          location?: Json | null
          name: string
          requested_at?: string | null
          requested_by?: string | null
          required_approvals?: number | null
          status?: Database["public"]["Enums"]["park_status"] | null
        }
        Update: {
          activated_at?: string | null
          approval_count?: number | null
          created_at?: string | null
          id?: string
          is_beta?: boolean | null
          location?: Json | null
          name?: string
          requested_at?: string | null
          requested_by?: string | null
          required_approvals?: number | null
          status?: Database["public"]["Enums"]["park_status"] | null
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
      playdate_history: {
        Row: {
          created_at: string | null
          dog_id: string
          id: string
          notes: string | null
          park_id: string | null
          partner_dog_id: string
          playdate_date: string
        }
        Insert: {
          created_at?: string | null
          dog_id: string
          id?: string
          notes?: string | null
          park_id?: string | null
          partner_dog_id: string
          playdate_date?: string
        }
        Update: {
          created_at?: string | null
          dog_id?: string
          id?: string
          notes?: string | null
          park_id?: string | null
          partner_dog_id?: string
          playdate_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "playdate_history_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playdate_history_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playdate_history_partner_dog_id_fkey"
            columns: ["partner_dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_pings: {
        Row: {
          approx_distance_m: number | null
          created_at: string | null
          dog_id: string
          id: string
          park_id: string
          session_id: string | null
        }
        Insert: {
          approx_distance_m?: number | null
          created_at?: string | null
          dog_id: string
          id?: string
          park_id: string
          session_id?: string | null
        }
        Update: {
          approx_distance_m?: number | null
          created_at?: string | null
          dog_id?: string
          id?: string
          park_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presence_pings_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_pings_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_pings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "park_mode_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          display_name: string
          id: string
          last_name: string | null
          photo_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          last_name?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          last_name?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      template_sequence: {
        Row: {
          harmony_id: string
          sent_templates: number[] | null
          user_id: string
        }
        Insert: {
          harmony_id: string
          sent_templates?: number[] | null
          user_id: string
        }
        Update: {
          harmony_id?: string
          sent_templates?: number[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_sequence_harmony_id_fkey"
            columns: ["harmony_id"]
            isOneToOne: false
            referencedRelation: "harmonies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_sequence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_parks: {
        Row: {
          park_id: string
          selected_at: string | null
          user_id: string
        }
        Insert: {
          park_id: string
          selected_at?: string | null
          user_id: string
        }
        Update: {
          park_id?: string
          selected_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_parks_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_parks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      waves: {
        Row: {
          created_at: string | null
          from_dog_id: string
          id: string
          to_dog_id: string
          wave_date: string | null
        }
        Insert: {
          created_at?: string | null
          from_dog_id: string
          id?: string
          to_dog_id: string
          wave_date?: string | null
        }
        Update: {
          created_at?: string | null
          from_dog_id?: string
          id?: string
          to_dog_id?: string
          wave_date?: string | null
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
      get_discover_dogs: {
        Args: {
          p_limit?: number
          p_max_distance_km?: number
          p_offset?: number
          p_user_lat?: number
          p_user_lng?: number
        }
        Returns: {
          already_waved: boolean
          approximate_age: string
          bio: string
          breed_name: string
          current_park_id: string
          current_park_name: string
          daily_energy: number
          distance_km: number
          dog_id: string
          dog_name: string
          energy_level: number
          gender: string
          is_lost: boolean
          is_neutered: boolean
          owner_name_stub: string
          owner_photo_stub: string
          park_checkin_active: boolean
          photo_url: string
          playdate_expires_at: string
          playdate_on: boolean
          social_style: string
          triggers: string[]
          weight_kg: number
        }[]
      }
      get_last_active: { Args: { p_dog_id: string }; Returns: string }
      get_park_dogs: {
        Args: { p_limit?: number; p_park_id: string }
        Returns: {
          approximate_age: string
          bio: string
          breed_name: string
          daily_energy: number
          dog_id: string
          dog_name: string
          emergency_phone: string
          energy_level: number
          gender: string
          is_lost: boolean
          is_neutered: boolean
          owner_id: string
          owner_name_stub: string
          owner_photo_stub: string
          park_checkin_expires_at: string
          photo_url: string
          social_style: string
          triggers: string[]
        }[]
      }
      get_remaining_waves: { Args: { p_user_id: string }; Returns: number }
      increment_daily_wave: { Args: { p_user_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      ping_presence: {
        Args: { p_distance_m?: number; p_dog_id: string; p_park_id: string }
        Returns: Json
      }
      send_message: {
        Args: { p_content: string; p_harmony_id: string }
        Returns: Json
      }
      send_template: {
        Args: { p_harmony_id: string; p_template_id: number }
        Returns: Json
      }
      send_wave: {
        Args: { p_sender_dog_id: string; p_target_dog_id: string }
        Returns: Json
      }
      toggle_lost_mode: {
        Args: {
          p_dog_id: string
          p_emergency_phone?: string
          p_enable: boolean
          p_last_seen_park_id?: string
        }
        Returns: Json
      }
      toggle_park_checkin: {
        Args: { p_activate: boolean; p_dog_id: string; p_park_id: string }
        Returns: Json
      }
      toggle_playdate: {
        Args: { p_activate: boolean; p_dog_id: string }
        Returns: Json
      }
      update_dog_location: {
        Args: { p_dog_id: string; p_lat: number; p_lng: number }
        Returns: Json
      }
    }
    Enums: {
      message_type: "template" | "reply"
      park_status: "CLOSED" | "REQUESTED" | "ACTIVE"
      social_style_type: "FRIENDLY" | "NEUTRAL" | "SELECTIVE"
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
    Enums: {
      message_type: ["template", "reply"],
      park_status: ["CLOSED", "REQUESTED", "ACTIVE"],
      social_style_type: ["FRIENDLY", "NEUTRAL", "SELECTIVE"],
    },
  },
} as const
