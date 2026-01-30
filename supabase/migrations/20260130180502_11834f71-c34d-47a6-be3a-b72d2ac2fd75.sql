-- DOGSPACE V1.2 Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name_initial TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Dogs table
CREATE TABLE public.dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  approximate_age TEXT NOT NULL,
  energy_level INTEGER NOT NULL CHECK (energy_level >= 1 AND energy_level <= 5),
  -- Optional behavior fields
  behavior TEXT CHECK (behavior IN ('social', 'selective', 'shy', 'dominant')),
  sensitivities TEXT[],
  -- Optional rhythm fields
  active_times TEXT[],
  avg_park_duration TEXT,
  weekly_frequency TEXT,
  -- Optional health fields
  is_neutered BOOLEAN,
  vaccination_notes TEXT,
  allergies_notes TEXT,
  -- Optional fun fields
  zodiac_sign TEXT,
  favorite_game TEXT,
  dislikes TEXT,
  -- Presence
  is_active_in_park BOOLEAN DEFAULT false,
  park_mode_started_at TIMESTAMP WITH TIME ZONE,
  current_park_id UUID,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Parks table
CREATE TABLE public.parks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('closed', 'requested', 'active')),
  requested_by UUID REFERENCES public.profiles(id),
  requested_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  approval_count INTEGER DEFAULT 0,
  is_beta BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Park approvals table
CREATE TABLE public.park_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID REFERENCES public.parks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(park_id, user_id)
);

-- Waves table (one-directional interest)
CREATE TABLE public.waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  to_dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(from_dog_id, to_dog_id)
);

-- Harmonies table (mutual waves)
CREATE TABLE public.harmonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_1_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  dog_2_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(dog_1_id, dog_2_id)
);

-- Template messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  harmony_id UUID REFERENCES public.harmonies(id) ON DELETE CASCADE NOT NULL,
  from_dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  template_number INTEGER NOT NULL CHECK (template_number >= 1 AND template_number <= 3),
  template_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Daily wave count tracking
CREATE TABLE public.daily_wave_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0,
  UNIQUE(dog_id, date)
);

-- Daily template send count tracking
CREATE TABLE public.daily_template_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0,
  UNIQUE(dog_id, date)
);

-- Insert initial parks
INSERT INTO public.parks (name, location, status) VALUES 
  ('Arnavutköy Parkı', 'Arnavutköy, İstanbul', 'active'),
  ('Maçka Parkı', 'Beşiktaş, İstanbul', 'requested');

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.park_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harmonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_wave_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_template_counts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Dogs policies
CREATE POLICY "Anyone can view dogs" ON public.dogs FOR SELECT USING (true);
CREATE POLICY "Owners can insert dogs" ON public.dogs FOR INSERT WITH CHECK (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Owners can update their dogs" ON public.dogs FOR UPDATE USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Owners can delete their dogs" ON public.dogs FOR DELETE USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Parks policies
CREATE POLICY "Anyone can view parks" ON public.parks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can request parks" ON public.parks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "System can update parks" ON public.parks FOR UPDATE USING (true);

-- Park approvals policies
CREATE POLICY "Anyone can view approvals" ON public.park_approvals FOR SELECT USING (true);
CREATE POLICY "Authenticated users can approve" ON public.park_approvals FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Waves policies
CREATE POLICY "Users can view waves involving their dogs" ON public.waves FOR SELECT USING (
  from_dog_id IN (SELECT id FROM public.dogs WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  OR to_dog_id IN (SELECT id FROM public.dogs WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "Users can create waves from their dogs" ON public.waves FOR INSERT WITH CHECK (
  from_dog_id IN (SELECT id FROM public.dogs WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Harmonies policies
CREATE POLICY "Users can view their harmonies" ON public.harmonies FOR SELECT USING (
  dog_1_id IN (SELECT id FROM public.dogs WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  OR dog_2_id IN (SELECT id FROM public.dogs WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "System can create harmonies" ON public.harmonies FOR INSERT WITH CHECK (true);

-- Messages policies
CREATE POLICY "Users can view messages in their harmonies" ON public.messages FOR SELECT USING (
  harmony_id IN (
    SELECT id FROM public.harmonies WHERE 
      dog_1_id IN (SELECT id FROM public.dogs WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
      OR dog_2_id IN (SELECT id FROM public.dogs WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  )
);
CREATE POLICY "Users can send messages from their dogs" ON public.messages FOR INSERT WITH CHECK (
  from_dog_id IN (SELECT id FROM public.dogs WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Daily counts policies
CREATE POLICY "Users can view own wave counts" ON public.daily_wave_counts FOR SELECT USING (
  dog_id IN (SELECT id FROM public.dogs WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "Users can manage own wave counts" ON public.daily_wave_counts FOR ALL USING (
  dog_id IN (SELECT id FROM public.dogs WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "Users can view own template counts" ON public.daily_template_counts FOR SELECT USING (
  dog_id IN (SELECT id FROM public.dogs WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "Users can manage own template counts" ON public.daily_template_counts FOR ALL USING (
  dog_id IN (SELECT id FROM public.dogs WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Function to auto-create harmony when mutual wave exists
CREATE OR REPLACE FUNCTION public.check_and_create_harmony()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if reverse wave exists
  IF EXISTS (
    SELECT 1 FROM public.waves 
    WHERE from_dog_id = NEW.to_dog_id AND to_dog_id = NEW.from_dog_id
  ) THEN
    -- Create harmony if it doesn't exist
    INSERT INTO public.harmonies (dog_1_id, dog_2_id)
    SELECT LEAST(NEW.from_dog_id, NEW.to_dog_id), GREATEST(NEW.from_dog_id, NEW.to_dog_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.harmonies 
      WHERE dog_1_id = LEAST(NEW.from_dog_id, NEW.to_dog_id) 
        AND dog_2_id = GREATEST(NEW.from_dog_id, NEW.to_dog_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_wave_check_harmony
  AFTER INSERT ON public.waves
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_create_harmony();

-- Function to auto-disable park mode after 4 hours
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dogs_updated_at BEFORE UPDATE ON public.dogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for dog photos
INSERT INTO storage.buckets (id, name, public) VALUES ('dog-photos', 'dog-photos', true);

-- Storage policies for dog photos
CREATE POLICY "Anyone can view dog photos" ON storage.objects FOR SELECT USING (bucket_id = 'dog-photos');
CREATE POLICY "Authenticated users can upload dog photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'dog-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their dog photos" ON storage.objects FOR UPDATE USING (bucket_id = 'dog-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete their dog photos" ON storage.objects FOR DELETE USING (bucket_id = 'dog-photos' AND auth.uid() IS NOT NULL);