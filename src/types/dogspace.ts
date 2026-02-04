// DOGSPACE V1.2 FINAL Core Types

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
  daily_energy?: 1 | 2 | 3 | 4 | 5 | null;
  neutered: boolean;
  social_style?: 'FRIENDLY' | 'NEUTRAL' | 'SELECTIVE';
  triggers?: string[];
  playdate_on: boolean;
  is_lost: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  owner?: Profile;
  breed?: Breed;
}

export interface DogPrivate {
  dog_id: string;
  emergency_phone: string;
  vaccination_expiry?: string;
  microchip_id?: string;
  created_at: string;
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

export interface PresencePing {
  id: string;
  dog_id: string;
  park_id: string;
  session_id: string;
  approx_distance_m?: number;
  created_at: string;
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

export interface ParkRequest {
  id: string;
  park_id: string;
  requester_id: string;
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

export interface AppEvent {
  id: string;
  user_id?: string;
  event_name: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// Template messages (Turkish) - V1.2 Ordered Lock
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

// Social style options (Turkish) - V1.2
export const SOCIAL_STYLE_OPTIONS = [
  { value: 'FRIENDLY', label: '😊 Çok Sosyal', description: 'Herkesle iyi geçinir' },
  { value: 'NEUTRAL', label: '🐕 Seçici', description: 'Bazı köpeklerle iyi geçinir' },
  { value: 'SELECTIVE', label: '🐾 Mesafeli', description: 'Mesafe sever' },
] as const;

// Trigger options (Turkish) - V1.2
export const TRIGGER_OPTIONS = [
  { value: 'food', label: '🍖 Yemek', description: 'Yemek yanında hassas' },
  { value: 'toy', label: '🎾 Oyuncak', description: 'Oyuncak paylaşmaz' },
  { value: 'leash', label: '🦴 Tasma', description: 'Tasmalıyken farklı davranır' },
  { value: 'fast_dogs', label: '⚡ Hızlı köpekler', description: 'Hızlı köpeklerden rahatsız' },
  { value: 'large_dogs', label: '🐕‍🦺 Büyük köpekler', description: 'Büyük köpeklerden çekiniyor' },
] as const;

// Rate limits - V1.2
export const RATE_LIMITS = {
  DAILY_WAVES: 10,
  DAILY_TEMPLATES: 5,
  PARK_MODE_AUTO_OFF_HOURS: 4,
  PARK_MODE_MIN_DURATION_MINUTES: 10,
  PARK_MODE_WARNING_MINUTES: 15,
  PARK_APPROVAL_THRESHOLD: 5,
  ACCOUNT_AGE_HOURS_FOR_PARK_REQUEST: 24,
  DISCOVER_MAX_DOGS: 15,
  DISCOVER_ACTIVE_HOURS: 24,
} as const;

// Helper to format owner name - Client-side derived
// If last_name exists → "Buğra A."
// Else → "Buğra"
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

// Get remaining time for park mode in minutes
export function getParkModeRemainingMinutes(session?: ParkModeSession): number {
  if (!session || session.ended_at) return 0;
  const startedAt = new Date(session.started_at);
  const expiresAt = new Date(startedAt.getTime() + RATE_LIMITS.PARK_MODE_AUTO_OFF_HOURS * 60 * 60 * 1000);
  const remaining = (expiresAt.getTime() - Date.now()) / (1000 * 60);
  return Math.max(0, Math.floor(remaining));
}

// Format time remaining
export function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return '0 dk';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours} sa ${mins} dk`;
  }
  return `${mins} dk`;
}

// Get time context for Discover
export function getTimeContext(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'Bu sabah';
  if (hour >= 12 && hour < 18) return 'Bugün';
  if (hour >= 18 && hour < 22) return 'Bu akşam';
  return 'Gece';
}

// Check if a dog was active within the last N hours
export function wasActiveWithinHours(lastActive: string | Date | null, hours: number): boolean {
  if (!lastActive) return false;
  const lastActiveDate = typeof lastActive === 'string' ? new Date(lastActive) : lastActive;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return lastActiveDate >= cutoff;
}
