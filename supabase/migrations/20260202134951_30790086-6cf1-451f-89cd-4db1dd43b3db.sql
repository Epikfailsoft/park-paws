-- DOGSPACE V1.2 COMPLETE SCHEMA REBUILD
-- Drop existing tables (in correct order due to FK constraints)
DROP TABLE IF EXISTS daily_template_counts CASCADE;
DROP TABLE IF EXISTS daily_wave_counts CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS harmonies CASCADE;
DROP TABLE IF EXISTS waves CASCADE;
DROP TABLE IF EXISTS park_approvals CASCADE;
DROP TABLE IF EXISTS park_mode_sessions CASCADE;
DROP TABLE IF EXISTS dog_lost_profile CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS user_parks CASCADE;
DROP TABLE IF EXISTS template_sequence CASCADE;
DROP TABLE IF EXISTS daily_wave_limits CASCADE;
DROP TABLE IF EXISTS dogs CASCADE;
DROP TABLE IF EXISTS breeds CASCADE;
DROP TABLE IF EXISTS parks CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS park_status CASCADE;
DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS social_style_type CASCADE;

-- =====================
-- 1. BREEDS TABLE
-- =====================
CREATE TABLE public.breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed breeds (~50 most common + OTHER)
INSERT INTO public.breeds (name, code) VALUES
  ('Golden Retriever', 'GOLDEN_RETRIEVER'),
  ('Labrador Retriever', 'LABRADOR'),
  ('Alman Çoban Köpeği', 'GERMAN_SHEPHERD'),
  ('Husky', 'HUSKY'),
  ('Beagle', 'BEAGLE'),
  ('Poodle', 'POODLE'),
  ('Bulldog', 'BULLDOG'),
  ('Yorkshire Terrier', 'YORKSHIRE_TERRIER'),
  ('Boxer', 'BOXER'),
  ('Doberman', 'DOBERMAN'),
  ('Rottweiler', 'ROTTWEILER'),
  ('Kangal', 'KANGAL'),
  ('Akbaş', 'AKBAS'),
  ('Anadolu Çoban Köpeği', 'ANATOLIAN_SHEPHERD'),
  ('Chihuahua', 'CHIHUAHUA'),
  ('Pug', 'PUG'),
  ('Shih Tzu', 'SHIH_TZU'),
  ('Maltese Terrier', 'MALTESE'),
  ('Pomeranian', 'POMERANIAN'),
  ('Border Collie', 'BORDER_COLLIE'),
  ('Jack Russell Terrier', 'JACK_RUSSELL'),
  ('Cocker Spaniel', 'COCKER_SPANIEL'),
  ('Dachshund', 'DACHSHUND'),
  ('Bichon Frise', 'BICHON_FRISE'),
  ('Cavalier King Charles Spaniel', 'CAVALIER'),
  ('French Bulldog', 'FRENCH_BULLDOG'),
  ('Shiba Inu', 'SHIBA_INU'),
  ('Akita', 'AKITA'),
  ('Samoyed', 'SAMOYED'),
  ('Bernese Mountain Dog', 'BERNESE'),
  ('Great Dane', 'GREAT_DANE'),
  ('Dalmatian', 'DALMATIAN'),
  ('Weimaraner', 'WEIMARANER'),
  ('Vizsla', 'VIZSLA'),
  ('Belgian Malinois', 'BELGIAN_MALINOIS'),
  ('Australian Shepherd', 'AUSTRALIAN_SHEPHERD'),
  ('Corgi', 'CORGI'),
  ('Miniature Schnauzer', 'MINIATURE_SCHNAUZER'),
  ('Shar Pei', 'SHAR_PEI'),
  ('Chow Chow', 'CHOW_CHOW'),
  ('Basenji', 'BASENJI'),
  ('Whippet', 'WHIPPET'),
  ('Greyhound', 'GREYHOUND'),
  ('Italian Greyhound', 'ITALIAN_GREYHOUND'),
  ('Boston Terrier', 'BOSTON_TERRIER'),
  ('Bull Terrier', 'BULL_TERRIER'),
  ('Staffordshire Bull Terrier', 'STAFFORDSHIRE'),
  ('American Pit Bull Terrier', 'PITBULL'),
  ('Cane Corso', 'CANE_CORSO'),
  ('Diğer / Kırma', 'OTHER');

-- =====================
-- 2. PROFILES TABLE
-- =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  last_name TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- =====================
-- 3. PARKS TABLE
-- =====================
CREATE TYPE park_status AS ENUM ('CLOSED', 'REQUESTED', 'ACTIVE');

CREATE TABLE public.parks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status park_status DEFAULT 'CLOSED',
  location JSONB,
  required_approvals INT DEFAULT 5,
  approval_count INT DEFAULT 0,
  requested_by UUID REFERENCES public.profiles(id),
  requested_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  is_beta BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial parks
INSERT INTO public.parks (name, status, location, activated_at) VALUES
  ('Arnavutköy Parkı', 'ACTIVE', '{"lat": 41.0667, "lng": 28.9667}', NOW()),
  ('Maçka Parkı', 'REQUESTED', '{"lat": 41.0439, "lng": 28.9948}', NULL);

-- =====================
-- 4. DOGS TABLE
-- =====================
CREATE TYPE social_style_type AS ENUM ('FRIENDLY', 'NEUTRAL', 'SELECTIVE');

CREATE TABLE public.dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  breed_id UUID REFERENCES public.breeds(id) NOT NULL,
  breed_custom_text TEXT,
  approximate_age TEXT NOT NULL,
  energy_level INT CHECK (energy_level BETWEEN 1 AND 5) NOT NULL,
  neutered BOOLEAN NOT NULL,
  social_style social_style_type,
  triggers TEXT[],
  is_lost BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dogs_owner_id ON public.dogs(owner_id);
CREATE INDEX idx_dogs_breed_id ON public.dogs(breed_id);
CREATE INDEX idx_dogs_is_lost ON public.dogs(is_lost) WHERE is_lost = TRUE;
CREATE INDEX idx_dogs_deleted ON public.dogs(deleted_at) WHERE deleted_at IS NULL;

-- =====================
-- 5. USER_PARKS TABLE
-- =====================
CREATE TABLE public.user_parks (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  park_id UUID REFERENCES public.parks(id) ON DELETE CASCADE NOT NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 6. PARK_MODE_SESSIONS TABLE
-- =====================
CREATE TABLE public.park_mode_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  park_id UUID REFERENCES public.parks(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_park_sessions_dog ON public.park_mode_sessions(dog_id);
CREATE INDEX idx_park_sessions_park ON public.park_mode_sessions(park_id);
CREATE INDEX idx_park_sessions_active ON public.park_mode_sessions(started_at) WHERE ended_at IS NULL;

-- =====================
-- 7. DOG_LOST_PROFILE TABLE
-- =====================
CREATE TABLE public.dog_lost_profile (
  dog_id UUID PRIMARY KEY REFERENCES public.dogs(id) ON DELETE CASCADE,
  emergency_phone TEXT NOT NULL,
  last_seen_park_id UUID REFERENCES public.parks(id),
  lost_started_at TIMESTAMPTZ,
  lost_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 8. NOTIFICATIONS TABLE
-- =====================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID REFERENCES public.parks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_park ON public.notifications(park_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- =====================
-- 9. WAVES TABLE (fixed unique constraint)
-- =====================
CREATE TABLE public.waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  to_dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  wave_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_dog_id, to_dog_id, wave_date)
);

CREATE INDEX idx_waves_from ON public.waves(from_dog_id);
CREATE INDEX idx_waves_to ON public.waves(to_dog_id);

-- =====================
-- 10. DAILY_WAVE_LIMITS TABLE
-- =====================
CREATE TABLE public.daily_wave_limits (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  wave_count INT DEFAULT 0 CHECK (wave_count <= 10),
  PRIMARY KEY(user_id, date)
);

-- =====================
-- 11. HARMONIES TABLE
-- =====================
CREATE TABLE public.harmonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_a_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  dog_b_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dog_a_id, dog_b_id),
  CHECK (dog_a_id != dog_b_id)
);

CREATE INDEX idx_harmonies_dog_a ON public.harmonies(dog_a_id);
CREATE INDEX idx_harmonies_dog_b ON public.harmonies(dog_b_id);

-- =====================
-- 12. MESSAGES TABLE
-- =====================
CREATE TYPE message_type AS ENUM ('template', 'reply');

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  harmony_id UUID REFERENCES public.harmonies(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message_type message_type NOT NULL,
  template_id INT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_harmony ON public.messages(harmony_id);

-- =====================
-- 13. TEMPLATE_SEQUENCE TABLE
-- =====================
CREATE TABLE public.template_sequence (
  harmony_id UUID REFERENCES public.harmonies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_templates INT[] DEFAULT ARRAY[]::INT[],
  PRIMARY KEY(harmony_id, user_id)
);

-- =====================
-- 14. PARK_APPROVALS TABLE
-- =====================
CREATE TABLE public.park_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID REFERENCES public.parks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(park_id, user_id)
);

-- =====================
-- FUNCTIONS
-- =====================

-- Update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-create harmony on mutual wave
CREATE OR REPLACE FUNCTION public.check_and_create_harmony()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.waves 
    WHERE from_dog_id = NEW.to_dog_id AND to_dog_id = NEW.from_dog_id
  ) THEN
    INSERT INTO public.harmonies (dog_a_id, dog_b_id)
    SELECT LEAST(NEW.from_dog_id, NEW.to_dog_id), GREATEST(NEW.from_dog_id, NEW.to_dog_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.harmonies 
      WHERE dog_a_id = LEAST(NEW.from_dog_id, NEW.to_dog_id) 
        AND dog_b_id = GREATEST(NEW.from_dog_id, NEW.to_dog_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Increment daily wave count
CREATE OR REPLACE FUNCTION public.increment_daily_wave(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.daily_wave_limits (user_id, date, wave_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET wave_count = daily_wave_limits.wave_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get remaining waves for today
CREATE OR REPLACE FUNCTION public.get_remaining_waves(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  used_count INT;
BEGIN
  SELECT COALESCE(wave_count, 0) INTO used_count
  FROM public.daily_wave_limits
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  RETURN 10 - COALESCE(used_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- =====================
-- TRIGGERS
-- =====================
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dogs_updated_at
  BEFORE UPDATE ON public.dogs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_wave_check_harmony
  AFTER INSERT ON public.waves
  FOR EACH ROW EXECUTE FUNCTION public.check_and_create_harmony();

-- =====================
-- ROW LEVEL SECURITY
-- =====================
ALTER TABLE public.breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_parks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.park_mode_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dog_lost_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_wave_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harmonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.park_approvals ENABLE ROW LEVEL SECURITY;

-- BREEDS: Everyone can read
CREATE POLICY "Breeds viewable by all" ON public.breeds FOR SELECT USING (true);

-- PROFILES: Everyone can read, users can manage own
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- PARKS: Everyone can read, authenticated can request
CREATE POLICY "Parks viewable by all" ON public.parks FOR SELECT USING (true);
CREATE POLICY "Authenticated can request parks" ON public.parks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "System can update parks" ON public.parks FOR UPDATE USING (true);

-- DOGS: Everyone can read non-deleted, owners can manage own
CREATE POLICY "Dogs viewable by all" ON public.dogs FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Owners can insert dogs" ON public.dogs FOR INSERT 
  WITH CHECK (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Owners can update own dogs" ON public.dogs FOR UPDATE 
  USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Owners can delete own dogs" ON public.dogs FOR DELETE 
  USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- USER_PARKS: Users can manage own park selection
CREATE POLICY "Users can view own park" ON public.user_parks FOR SELECT 
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can select park" ON public.user_parks FOR INSERT 
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update park" ON public.user_parks FOR UPDATE 
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can remove park" ON public.user_parks FOR DELETE 
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- PARK_MODE_SESSIONS: View active sessions, manage own
CREATE POLICY "Active sessions viewable" ON public.park_mode_sessions FOR SELECT
  USING (ended_at IS NULL AND started_at + INTERVAL '4 hours' > NOW());
CREATE POLICY "Users can start session" ON public.park_mode_sessions FOR INSERT
  WITH CHECK (dog_id IN (
    SELECT d.id FROM public.dogs d 
    JOIN public.profiles p ON d.owner_id = p.id 
    WHERE p.user_id = auth.uid() AND d.deleted_at IS NULL
  ));
CREATE POLICY "Users can end own session" ON public.park_mode_sessions FOR UPDATE
  USING (dog_id IN (
    SELECT d.id FROM public.dogs d 
    JOIN public.profiles p ON d.owner_id = p.id 
    WHERE p.user_id = auth.uid()
  ));

-- DOG_LOST_PROFILE: Phone visible only to park-active users in same park
CREATE POLICY "Lost profile visible to park active users" ON public.dog_lost_profile FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dogs d WHERE d.id = dog_lost_profile.dog_id AND d.is_lost = TRUE
    )
    AND EXISTS (
      SELECT 1 FROM public.park_mode_sessions pms
      JOIN public.dogs viewer_dog ON viewer_dog.owner_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
      WHERE pms.dog_id = viewer_dog.id
        AND pms.park_id = dog_lost_profile.last_seen_park_id
        AND pms.ended_at IS NULL
        AND pms.started_at + INTERVAL '4 hours' > NOW()
    )
  );
CREATE POLICY "Owners can manage lost profile" ON public.dog_lost_profile FOR ALL
  USING (dog_id IN (
    SELECT d.id FROM public.dogs d 
    JOIN public.profiles p ON d.owner_id = p.id 
    WHERE p.user_id = auth.uid()
  ));

-- NOTIFICATIONS: Users can view notifications for their park
CREATE POLICY "Users can view park notifications" ON public.notifications FOR SELECT
  USING (
    park_id IN (
      SELECT up.park_id FROM public.user_parks up
      JOIN public.profiles p ON up.user_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- WAVES: Users can wave from their dogs, view waves involving their dogs
CREATE POLICY "Users can wave from their dogs" ON public.waves FOR INSERT
  WITH CHECK (from_dog_id IN (
    SELECT d.id FROM public.dogs d 
    JOIN public.profiles p ON d.owner_id = p.id 
    WHERE p.user_id = auth.uid() AND d.deleted_at IS NULL
  ));
CREATE POLICY "Users can view waves" ON public.waves FOR SELECT
  USING (
    from_dog_id IN (SELECT d.id FROM public.dogs d JOIN public.profiles p ON d.owner_id = p.id WHERE p.user_id = auth.uid())
    OR to_dog_id IN (SELECT d.id FROM public.dogs d JOIN public.profiles p ON d.owner_id = p.id WHERE p.user_id = auth.uid())
  );

-- DAILY_WAVE_LIMITS: Users can manage own limits
CREATE POLICY "Users can view own limits" ON public.daily_wave_limits FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own limits" ON public.daily_wave_limits FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own limits" ON public.daily_wave_limits FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- HARMONIES: Users can view their harmonies
CREATE POLICY "Users can view their harmonies" ON public.harmonies FOR SELECT
  USING (
    dog_a_id IN (SELECT d.id FROM public.dogs d JOIN public.profiles p ON d.owner_id = p.id WHERE p.user_id = auth.uid())
    OR dog_b_id IN (SELECT d.id FROM public.dogs d JOIN public.profiles p ON d.owner_id = p.id WHERE p.user_id = auth.uid())
  );
CREATE POLICY "System can create harmonies" ON public.harmonies FOR INSERT WITH CHECK (true);

-- MESSAGES: Users can view/send in their harmonies
CREATE POLICY "Users can view messages in their harmonies" ON public.messages FOR SELECT
  USING (harmony_id IN (
    SELECT h.id FROM public.harmonies h
    WHERE h.dog_a_id IN (SELECT d.id FROM public.dogs d JOIN public.profiles p ON d.owner_id = p.id WHERE p.user_id = auth.uid())
       OR h.dog_b_id IN (SELECT d.id FROM public.dogs d JOIN public.profiles p ON d.owner_id = p.id WHERE p.user_id = auth.uid())
  ));
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT
  WITH CHECK (
    sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND harmony_id IN (
      SELECT h.id FROM public.harmonies h
      WHERE h.dog_a_id IN (SELECT d.id FROM public.dogs d JOIN public.profiles p ON d.owner_id = p.id WHERE p.user_id = auth.uid())
         OR h.dog_b_id IN (SELECT d.id FROM public.dogs d JOIN public.profiles p ON d.owner_id = p.id WHERE p.user_id = auth.uid())
    )
  );

-- TEMPLATE_SEQUENCE: Users can manage own sequences
CREATE POLICY "Users can view own sequences" ON public.template_sequence FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage sequences" ON public.template_sequence FOR ALL
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- PARK_APPROVALS: Anyone can view, authenticated can approve
CREATE POLICY "Approvals viewable by all" ON public.park_approvals FOR SELECT USING (true);
CREATE POLICY "Users can approve parks" ON public.park_approvals FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));