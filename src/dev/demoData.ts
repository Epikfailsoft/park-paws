import type { User } from '@supabase/supabase-js';
import type { DiscoverDog, Dog, ParkDog, Profile } from '@/types/dogspace';

// Everything demo mode shows that doesn't come from the database: the signed-in owner with
// two dogs, and sample dogs for the RPCs that refuse anonymous callers. IDs are valid UUIDs
// that match no real rows. Sample rows keep the exact shape the RPCs return, so filters that
// rely on missing columns misbehave here just as they do in production.

const now = new Date().toISOString();
const inHours = (hours: number) => new Date(Date.now() + hours * 3600000).toISOString();
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Self-contained placeholder photos (no network, no licensing): a soft gradient and an emoji.
function photo(emoji: string, hue: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 70% 84%)"/><stop offset="1" stop-color="hsl(${hue} 55% 62%)"/>
    </linearGradient></defs>
    <rect width="600" height="800" fill="url(#g)"/>
    <text x="300" y="420" font-size="260" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const demoUser = {
  id: uuid(1),
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: { full_name: 'Demo Kullanıcı' },
  created_at: now,
} as User;

export const demoProfile: Profile = {
  id: uuid(2),
  user_id: demoUser.id,
  display_name: 'Demo',
  last_name: 'Kullanıcı',
  created_at: now,
  updated_at: now,
};

export const demoDogs: Dog[] = [
  {
    id: uuid(3),
    owner_id: demoProfile.id,
    name: 'Pamuk',
    photo_url: photo('🦮', 45),
    approximate_age: '2 yaş',
    energy_level: 2,
    breed_id: uuid(4),
    breed: { id: uuid(4), name: 'Golden Retriever', code: 'golden_retriever', created_at: now },
    neutered: true,
    gender: 'female',
    social_style: 'FRIENDLY',
    likes: ['#top', '#yüzmek'],
    dislikes: ['#gürültü'],
    bio: 'Parkın neşesi, top görünce dayanamaz.',
    playdate_on: false,
    park_checkin_active: false,
    is_lost: false,
    created_at: now,
  },
  {
    id: uuid(5),
    owner_id: demoProfile.id,
    name: 'Fındık',
    photo_url: photo('🐶', 25),
    approximate_age: '3 yaş',
    energy_level: 3,
    breed_id: uuid(6),
    breed: { id: uuid(6), name: 'Jack Russell Terrier', code: 'jack_russell_terrier', created_at: now },
    neutered: false,
    gender: 'male',
    social_style: 'NEUTRAL',
    likes: ['#koşmak'],
    dislikes: ['#banyo'],
    bio: 'Minik gövdede koca bir enerji.',
    playdate_on: false,
    park_checkin_active: false,
    is_lost: false,
    created_at: now,
  },
];

function discoverDog(dog: Pick<DiscoverDog, 'dog_id' | 'dog_name' | 'photo_url'> & Partial<DiscoverDog>): DiscoverDog {
  return {
    breed_name: null,
    approximate_age: '2 yaş',
    energy_level: 2,
    daily_energy: null,
    is_neutered: true,
    bio: null,
    gender: null,
    weight_kg: null,
    social_style: 'FRIENDLY',
    triggers: null,
    distance_km: null,
    park_checkin_active: false,
    current_park_id: null,
    current_park_name: null,
    playdate_on: false,
    playdate_expires_at: null,
    owner_name_stub: null,
    owner_photo_stub: null,
    already_waved: false,
    is_lost: false,
    ...dog,
  };
}

export const demoDiscoverDogs: DiscoverDog[] = [
  discoverDog({
    dog_id: uuid(101), dog_name: 'Zeytin', photo_url: photo('🐕', 80), breed_name: 'Labrador Retriever',
    approximate_age: '3 yaş', energy_level: 3, gender: 'female', weight_kg: 28, distance_km: 0.8,
    bio: 'Top peşinde koşmaya her zaman hazır.', owner_name_stub: 'Elif Y.',
    playdate_on: true, playdate_expires_at: inHours(20), park_checkin_active: true, current_park_name: 'Akyaka Küçük',
  }),
  discoverDog({
    dog_id: uuid(102), dog_name: 'Karabaş', photo_url: photo('🐕‍🦺', 30), breed_name: 'Kangal',
    approximate_age: '4 yaş', energy_level: 2, gender: 'male', weight_kg: 45, distance_km: 1.6,
    social_style: 'NEUTRAL', bio: 'Sakin ama oyuna davet edilirse hayır demez.', owner_name_stub: 'Mert A.',
  }),
  discoverDog({
    dog_id: uuid(103), dog_name: 'Luna', photo_url: photo('🐶', 220), breed_name: 'Border Collie',
    approximate_age: '1 yaş', energy_level: 3, gender: 'female', weight_kg: 17, distance_km: 2.3,
    bio: 'Frizbi ustası, yeni arkadaşlara bayılır.', triggers: ['#gürültü'], owner_name_stub: 'Zeynep K.',
    playdate_on: true, playdate_expires_at: inHours(8),
  }),
  discoverDog({
    dog_id: uuid(104), dog_name: 'Boncuk', photo_url: photo('🐩', 330), breed_name: 'Pomeranian',
    approximate_age: '6 aylık', energy_level: 3, gender: 'female', weight_kg: 3, distance_km: 3.1,
    is_neutered: false, social_style: 'SELECTIVE', bio: 'Küçük ama cesur; önce koklaşmayı sever.', owner_name_stub: 'Can D.',
  }),
  discoverDog({
    dog_id: uuid(105), dog_name: 'Paşa', photo_url: photo('🦮', 35), breed_name: 'Beagle',
    approximate_age: '5 yaş', energy_level: 2, gender: 'male', weight_kg: 12, distance_km: 4.4,
    bio: 'Burnunun peşinden gider, ödüle hayır demez.', owner_name_stub: 'Selin T.',
  }),
  discoverDog({
    dog_id: uuid(106), dog_name: 'Köpük', photo_url: photo('🐕', 200), breed_name: 'Samoyed',
    approximate_age: '2 yaş', energy_level: 2, gender: 'male', weight_kg: 22, distance_km: 6.2,
    social_style: 'NEUTRAL', bio: 'Kar beyazı, sabah yürüyüşlerinin müdavimi.', owner_name_stub: 'Deniz Ö.',
    is_lost: true,
  }),
];

// The same dogs checked in at whichever park is selected, including the lost one.
export const demoParkDogs: ParkDog[] = demoDiscoverDogs.map((dog, i) => ({
  dog_id: dog.dog_id,
  dog_name: dog.dog_name,
  breed_name: dog.breed_name,
  approximate_age: dog.approximate_age,
  energy_level: dog.energy_level,
  daily_energy: dog.daily_energy,
  is_neutered: dog.is_neutered,
  photo_url: dog.photo_url,
  bio: dog.bio,
  gender: dog.gender,
  social_style: dog.social_style,
  triggers: dog.triggers,
  owner_name_stub: dog.owner_name_stub,
  owner_photo_stub: dog.owner_photo_stub,
  owner_id: uuid(200 + i),
  park_checkin_expires_at: inHours(1 + i),
  is_lost: dog.is_lost,
  emergency_phone: dog.is_lost ? '0555 000 00 00' : null,
}));
