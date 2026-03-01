-- Park announcements / bulletin board
CREATE TABLE public.park_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES public.parks(id),
  author_id UUID REFERENCES public.profiles(id),
  announcement_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.park_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements viewable by park users" ON public.park_announcements
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create announcements" ON public.park_announcements
  FOR INSERT WITH CHECK (
    author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Authors can update own announcements" ON public.park_announcements
  FOR UPDATE USING (
    author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Authors can delete own announcements" ON public.park_announcements
  FOR DELETE USING (
    author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Badges / achievements system
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.dog_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES public.dogs(id),
  badge_id UUID NOT NULL REFERENCES public.badges(id),
  earned_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(dog_id, badge_id)
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dog_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges viewable by all" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Dog badges viewable by all" ON public.dog_badges FOR SELECT USING (true);
CREATE POLICY "System can grant badges" ON public.dog_badges FOR INSERT WITH CHECK (true);

-- Seed initial badges
INSERT INTO public.badges (code, name, description, icon) VALUES
  ('founding_dog', 'Kurucu Köpek', 'Pilot bölgedeki ilk kullanıcılardan biri', '🏅'),
  ('harmony_streak', 'Harmony Serisi', 'Aynı parkta düzenli buluşmalar', '🤝'),
  ('best_playmates', 'En İyi Oyun Arkadaşları', 'En çok playdate yapan ikili', '🎯'),
  ('park_regular', 'Park Müdavimi', 'Düzenli park ziyaretleri', '🌳'),
  ('social_butterfly', 'Sosyal Kelebek', '10+ farklı köpekle harmony', '🦋');