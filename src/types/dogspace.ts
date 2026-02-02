// DOGSPACE V1.2 Core Types

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  last_name?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Breed {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Dog {
  id: string;
  owner_id: string;
  name: string;
  photo_url: string;
  breed_id: string;
  breed_custom_text?: string;
  approximate_age: string;
  energy_level: 1 | 2 | 3 | 4 | 5;
  neutered: boolean;
  social_style?: 'FRIENDLY' | 'NEUTRAL' | 'SELECTIVE';
  triggers?: string[];
  is_lost: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  owner?: Profile;
  breed?: Breed;
}

export interface Park {
  id: string;
  name: string;
  status: 'CLOSED' | 'REQUESTED' | 'ACTIVE';
  location?: { lat: number; lng: number };
  required_approvals: number;
  approval_count: number;
  requested_by?: string;
  requested_at?: string;
  activated_at?: string;
  is_beta: boolean;
  created_at: string;
}

export interface UserPark {
  user_id: string;
  park_id: string;
  selected_at: string;
}

export interface ParkModeSession {
  id: string;
  dog_id: string;
  park_id: string;
  started_at: string;
  ended_at?: string;
}

export interface DogLostProfile {
  dog_id: string;
  emergency_phone: string;
  last_seen_park_id?: string;
  lost_started_at?: string;
  lost_ends_at?: string;
  created_at: string;
}

export interface ParkApproval {
  id: string;
  park_id: string;
  user_id: string;
  created_at: string;
}

export interface Wave {
  id: string;
  from_dog_id: string;
  to_dog_id: string;
  wave_date: string;
  created_at: string;
}

export interface DailyWaveLimit {
  user_id: string;
  date: string;
  wave_count: number;
}

export interface Harmony {
  id: string;
  dog_a_id: string;
  dog_b_id: string;
  created_at: string;
  // Joined data
  dog_a?: Dog;
  dog_b?: Dog;
}

export interface Message {
  id: string;
  harmony_id: string;
  sender_id: string;
  message_type: 'template' | 'reply';
  template_id?: number;
  content: string;
  created_at: string;
}

export interface TemplateSequence {
  harmony_id: string;
  user_id: string;
  sent_templates: number[];
}

export interface Notification {
  id: string;
  park_id?: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// Template messages (Turkish)
export const TEMPLATES = {
  1: {
    text: "Köpekler için kısa bir playdate yapalım mı?",
    replies: ["Evet", "Başka zaman", "Bugün olmaz"]
  },
  2: {
    text: "Hangi park size daha uygun?",
    replies: ["Arnavutköy", "Maçka (başvuruda)", "Başka park"]
  },
  3: {
    text: "Hangi zaman aralığı daha iyi olur?",
    replies: ["Sabah", "Öğle", "Akşam", "Hafta sonu"]
  }
} as const;

// Social style options (Turkish)
export const SOCIAL_STYLE_OPTIONS = [
  { value: 'FRIENDLY', label: '😊 Sevecen', description: 'Herkesle iyi geçinir' },
  { value: 'NEUTRAL', label: '😐 Nötr', description: 'Sakin, mesafeli' },
  { value: 'SELECTIVE', label: '🤔 Seçici', description: 'Bazı köpeklerle iyi geçinir' },
] as const;

// Trigger options (Turkish)
export const TRIGGER_OPTIONS = [
  { value: 'food', label: '🍖 Yemek', description: 'Yemek yanında hassas' },
  { value: 'toy', label: '🎾 Oyuncak', description: 'Oyuncak paylaşmaz' },
  { value: 'leash', label: '🦴 Tasma', description: 'Tasmalıyken farklı davranır' },
  { value: 'fast_dogs', label: '⚡ Hızlı köpekler', description: 'Hızlı köpeklerden rahatsız' },
] as const;

// Rate limits
export const RATE_LIMITS = {
  DAILY_WAVES: 10,
  DAILY_TEMPLATES: 5,
  PARK_MODE_AUTO_OFF_HOURS: 4,
  PARK_MODE_MIN_DURATION_MINUTES: 10,
  PARK_APPROVAL_THRESHOLD: 5,
  ACCOUNT_AGE_HOURS_FOR_PARK_REQUEST: 24,
} as const;

// Helper to format owner name
export function formatOwnerName(displayName: string, lastName?: string): string {
  if (lastName) {
    return `${displayName} ${lastName.charAt(0).toUpperCase()}.`;
  }
  return displayName;
}

// Check if park mode session is active
export function isParkModeActive(session?: ParkModeSession): boolean {
  if (!session || session.ended_at) return false;
  const startedAt = new Date(session.started_at);
  const expiresAt = new Date(startedAt.getTime() + RATE_LIMITS.PARK_MODE_AUTO_OFF_HOURS * 60 * 60 * 1000);
  return expiresAt > new Date();
}
