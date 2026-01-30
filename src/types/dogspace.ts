// DOGSPACE Core Types

export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name_initial?: string;
  avatar_url?: string;
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
  // Optional behavior
  behavior?: 'social' | 'selective' | 'shy' | 'dominant';
  sensitivities?: string[];
  // Optional rhythm
  active_times?: ('morning' | 'noon' | 'evening')[];
  avg_park_duration?: string;
  weekly_frequency?: string;
  // Optional health
  is_neutered?: boolean;
  vaccination_notes?: string;
  allergies_notes?: string;
  // Optional fun
  zodiac_sign?: string;
  favorite_game?: string;
  dislikes?: string;
  // Presence
  is_active_in_park: boolean;
  park_mode_started_at?: string;
  current_park_id?: string;
  last_active_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  owner?: Profile;
}

export interface Park {
  id: string;
  name: string;
  location?: string;
  status: 'closed' | 'requested' | 'active';
  requested_by?: string;
  requested_at?: string;
  activated_at?: string;
  approval_count: number;
  is_beta: boolean;
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
  created_at: string;
}

export interface Harmony {
  id: string;
  dog_1_id: string;
  dog_2_id: string;
  created_at: string;
  // Joined data
  dog_1?: Dog;
  dog_2?: Dog;
}

export interface Message {
  id: string;
  harmony_id: string;
  from_dog_id: string;
  template_number: 1 | 2 | 3;
  template_response?: string;
  created_at: string;
}

export interface DailyWaveCount {
  id: string;
  dog_id: string;
  date: string;
  count: number;
}

export interface DailyTemplateCount {
  id: string;
  dog_id: string;
  date: string;
  count: number;
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

// Behavior options (Turkish)
export const BEHAVIOR_OPTIONS = [
  { value: 'social', label: 'Sosyal' },
  { value: 'selective', label: 'Seçici' },
  { value: 'shy', label: 'Çekingen' },
  { value: 'dominant', label: 'Dominant' },
] as const;

// Active times options (Turkish)
export const ACTIVE_TIME_OPTIONS = [
  { value: 'morning', label: 'Sabah' },
  { value: 'noon', label: 'Öğle' },
  { value: 'evening', label: 'Akşam' },
] as const;

// Sensitivity options (Turkish)
export const SENSITIVITY_OPTIONS = [
  { value: 'toy', label: 'Oyuncak' },
  { value: 'food', label: 'Yemek' },
  { value: 'space', label: 'Alan' },
] as const;

// Zodiac signs (Turkish)
export const ZODIAC_OPTIONS = [
  { value: 'aries', label: 'Koç' },
  { value: 'taurus', label: 'Boğa' },
  { value: 'gemini', label: 'İkizler' },
  { value: 'cancer', label: 'Yengeç' },
  { value: 'leo', label: 'Aslan' },
  { value: 'virgo', label: 'Başak' },
  { value: 'libra', label: 'Terazi' },
  { value: 'scorpio', label: 'Akrep' },
  { value: 'sagittarius', label: 'Yay' },
  { value: 'capricorn', label: 'Oğlak' },
  { value: 'aquarius', label: 'Kova' },
  { value: 'pisces', label: 'Balık' },
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
