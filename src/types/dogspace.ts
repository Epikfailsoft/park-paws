// DOGSPACE V1.22 Types - Dual State System

// RPC return types
export interface DiscoverDog {
  dog_id: string;
  dog_name: string;
  breed_name: string | null;
  approximate_age: string;
  energy_level: number;
  daily_energy: number | null;
  is_neutered: boolean;
  photo_url: string;
  bio: string | null;
  gender: string | null;
  weight_kg: number | null;
  social_style: string | null;
  triggers: string[] | null;
  distance_km: number | null;
  park_checkin_active: boolean;
  current_park_id: string | null;
  current_park_name: string | null;
  playdate_on: boolean;
  playdate_expires_at: string | null;
  owner_name_stub: string | null;
  owner_photo_stub: string | null;
  already_waved: boolean;
  is_lost: boolean;
}

export interface ParkDog {
  dog_id: string;
  dog_name: string;
  breed_name: string | null;
  approximate_age: string;
  energy_level: number;
  daily_energy: number | null;
  is_neutered: boolean;
  photo_url: string;
  bio: string | null;
  gender: string | null;
  social_style: string | null;
  triggers: string[] | null;
  owner_name_stub: string | null;
  owner_photo_stub: string | null;
  owner_id: string;
  park_checkin_expires_at: string | null;
  is_lost: boolean;
  emergency_phone: string | null;
}

export interface Breed {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  last_name?: string;
  photo_url?: string;
  bio?: string; // max 50 chars
  created_at: string;
  updated_at: string;
}

export interface Dog {
  id: string;
  owner_id: string;
  name: string;
  photo_url: string;
  approximate_age: string;
  energy_level: 1 | 2 | 3 | 4 | 5;
  daily_energy?: 1 | 2 | 3 | 4 | 5;
  breed_id: string;
  breed_custom_text?: string;
  breed?: Breed;
  neutered: boolean;
  social_style?: 'FRIENDLY' | 'NEUTRAL' | 'SELECTIVE';
  triggers?: string[];
  bio?: string; // max 150 chars
  gender?: 'male' | 'female';
  weight_kg?: number;
  // STATE B - Playdate ON/OFF (Discover visibility)
  playdate_on: boolean;
  playdate_started_at?: string;
  playdate_expires_at?: string;
  // STATE A - Park Check-in (Physical presence)
  park_checkin_active: boolean;
  park_checkin_started_at?: string;
  park_checkin_expires_at?: string;
  current_park_id?: string;
  // Emergency
  is_lost: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface DogPrivate {
  dog_id: string;
  emergency_phone: string;
  vaccination_expiry?: string;
  microchip_id?: string;
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

export interface Park {
  id: string;
  name: string;
  status: 'CLOSED' | 'REQUESTED' | 'ACTIVE';
  location?: { lat: number; lng: number };
  required_approvals: number;
  approval_count: number;
  is_beta?: boolean;
  activated_at?: string;
  requested_at?: string;
  requested_by?: string;
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

export interface Wave {
  id: string;
  from_dog_id: string;
  to_dog_id: string;
  wave_date: string;
  created_at: string;
}

export interface Harmony {
  id: string;
  dog_a_id: string;
  dog_b_id: string;
  created_at: string;
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

export interface CareDocument {
  id: string;
  dog_id: string;
  document_type: 'vaccine' | 'vet' | 'other';
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

export interface PlaydateHistory {
  id: string;
  dog_id: string;
  partner_dog_id: string;
  park_id?: string;
  playdate_date: string;
  notes?: string;
  created_at: string;
}

// V1.22 Rate Limits
export const RATE_LIMITS = {
  DAILY_WAVES: 10,
  PARK_CHECKIN_HOURS: 4,
  PLAYDATE_ON_HOURS: 24,
  DISCOVER_ACTIVE_HOURS: 24,
  DISCOVER_MAX_DOGS: 15,
  PARK_MODE_WARNING_MINUTES: 15,
  CARE_VAULT_MAX_DOCS: 3,
} as const;

// Social style options
export const SOCIAL_STYLE_OPTIONS = [
  { value: 'FRIENDLY', label: 'Çok Sosyal', icon: '😊' },
  { value: 'NEUTRAL', label: 'Seçici', icon: '🤔' },
  { value: 'SELECTIVE', label: 'Mesafeli', icon: '😐' },
] as const;

// Trigger options
export const TRIGGER_OPTIONS = [
  { value: 'food', label: 'Yemek', icon: '🍖' },
  { value: 'toy', label: 'Oyuncak', icon: '🎾' },
  { value: 'leash', label: 'Tasma', icon: '🦴' },
  { value: 'high_motion', label: 'Hızlı hareketler', icon: '⚡' },
  { value: 'large_dogs', label: 'Büyük köpekler', icon: '🐕‍🦺' },
] as const;

// Quick actions for messaging
export const QUICK_ACTIONS = [
  { id: 'suggest_park', label: 'Park Öner', icon: '🏞️' },
  { id: 'suggest_time', label: 'Zaman Öner', icon: '⏰' },
] as const;

// Helper: Format owner display name (FirstName + LastInitial.)
export function formatOwnerName(displayName: string, lastName?: string): string {
  if (lastName && lastName.trim()) {
    return `${displayName} ${lastName.charAt(0).toUpperCase()}.`;
  }
  return displayName;
}

// Helper: Get time context for Turkish UI
export function getTimeContext(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'Bu sabah';
  if (hour >= 12 && hour < 18) return 'Bugün';
  return 'Bu akşam';
}

// Helper: Check if park check-in is active
export function isParkCheckinActive(dog: Dog): boolean {
  if (!dog.park_checkin_active) return false;
  if (!dog.park_checkin_expires_at) return false;
  return new Date(dog.park_checkin_expires_at) > new Date();
}

// Helper: Get remaining minutes for park check-in
export function getParkCheckinRemainingMinutes(dog: Dog): number {
  if (!dog.park_checkin_expires_at) return 0;
  const expiresAt = new Date(dog.park_checkin_expires_at);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60)));
}

// Helper: Check if playdate is active
export function isPlaydateActive(dog: Dog): boolean {
  if (!dog.playdate_on) return false;
  if (!dog.playdate_expires_at) return dog.playdate_on; // Legacy support
  return new Date(dog.playdate_expires_at) > new Date();
}

// Helper: Get remaining hours for playdate
export function getPlaydateRemainingHours(dog: Dog): number {
  if (!dog.playdate_expires_at) return 0;
  const expiresAt = new Date(dog.playdate_expires_at);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
}

// Helper: Format time remaining (for display)
export function formatTimeRemaining(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}s ${mins}dk` : `${hours}s`;
  }
  return `${minutes}dk`;
}

// Legacy helpers for park_mode_sessions (backward compatibility)
export function isParkModeActive(session: ParkModeSession): boolean {
  if (session.ended_at) return false;
  const startedAt = new Date(session.started_at);
  const expiresAt = new Date(startedAt.getTime() + RATE_LIMITS.PARK_CHECKIN_HOURS * 60 * 60 * 1000);
  return expiresAt > new Date();
}

export function getParkModeRemainingMinutes(session: ParkModeSession): number {
  const startedAt = new Date(session.started_at);
  const expiresAt = new Date(startedAt.getTime() + RATE_LIMITS.PARK_CHECKIN_HOURS * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60)));
}
