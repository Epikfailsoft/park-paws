-- DOGSPACE V1.2 SCHEMA UPDATE - FIXED ORDER
-- Add missing fields and tables per Master Prompt

-- 1. Add playdate_on and daily_energy to dogs table
ALTER TABLE public.dogs 
ADD COLUMN IF NOT EXISTS playdate_on boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS daily_energy integer DEFAULT NULL;

-- 2. Create dog_private table for sensitive info
CREATE TABLE IF NOT EXISTS public.dog_private (
  dog_id uuid PRIMARY KEY REFERENCES public.dogs(id) ON DELETE CASCADE,
  emergency_phone text NOT NULL,
  vaccination_expiry date,
  microchip_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dog_private ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can manage their dog's private info
CREATE POLICY "Owners can manage dog private info"
ON public.dog_private FOR ALL
USING (
  dog_id IN (
    SELECT d.id FROM public.dogs d
    JOIN public.profiles p ON d.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Policy: Emergency phone visible to park-active users when dog is lost
CREATE POLICY "Lost dog phone visible to park active users"
ON public.dog_private FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = dog_private.dog_id AND d.is_lost = true
  )
  AND EXISTS (
    SELECT 1 FROM public.park_mode_sessions pms
    JOIN public.dogs viewer_dog ON viewer_dog.id = pms.dog_id
    JOIN public.profiles p ON viewer_dog.owner_id = p.id
    JOIN public.dog_lost_profile dlp ON dlp.dog_id = dog_private.dog_id
    WHERE p.user_id = auth.uid()
      AND pms.park_id = dlp.last_seen_park_id
      AND pms.ended_at IS NULL
      AND (pms.started_at + interval '4 hours') > now()
  )
);

-- 3. Create park_requests table
CREATE TABLE IF NOT EXISTS public.park_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id uuid NOT NULL REFERENCES public.parks(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.park_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view park requests"
ON public.park_requests FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create requests"
ON public.park_requests FOR INSERT
WITH CHECK (
  requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- 4. Create presence_pings table for soft location validation
CREATE TABLE IF NOT EXISTS public.presence_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  park_id uuid NOT NULL REFERENCES public.parks(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.park_mode_sessions(id) ON DELETE CASCADE,
  approx_distance_m integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.presence_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create presence pings for their dogs"
ON public.presence_pings FOR INSERT
WITH CHECK (
  dog_id IN (
    SELECT d.id FROM public.dogs d
    JOIN public.profiles p ON d.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own pings"
ON public.presence_pings FOR SELECT
USING (
  dog_id IN (
    SELECT d.id FROM public.dogs d
    JOIN public.profiles p ON d.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- 5. Create events table for analytics
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_user ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_name ON public.events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_created ON public.events(created_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create events"
ON public.events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view own events"
ON public.events FOR SELECT
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 6. Create user_roles table FIRST
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- 7. Create admin role check function AFTER table exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- 8. Update send_wave RPC with harmony creation logic
CREATE OR REPLACE FUNCTION public.send_wave(
  p_sender_dog_id uuid,
  p_target_dog_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_profile_id uuid;
  v_target_owner_id uuid;
  v_wave_count integer;
  v_existing_wave uuid;
  v_reverse_wave uuid;
  v_harmony_id uuid;
  v_today date := CURRENT_DATE;
BEGIN
  -- Get sender's profile id
  SELECT p.id INTO v_sender_profile_id
  FROM profiles p
  WHERE p.user_id = auth.uid();

  -- Validate sender owns the dog
  IF NOT EXISTS (
    SELECT 1 FROM dogs d
    WHERE d.id = p_sender_dog_id
      AND d.owner_id = v_sender_profile_id
      AND d.deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Bu köpek size ait değil');
  END IF;

  -- Get target dog owner
  SELECT d.owner_id INTO v_target_owner_id
  FROM dogs d
  WHERE d.id = p_target_dog_id AND d.deleted_at IS NULL;

  IF v_target_owner_id IS NULL THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Hedef köpek bulunamadı');
  END IF;

  -- Prevent self-wave
  IF v_target_owner_id = v_sender_profile_id THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Kendi köpeğinize wave atamazsınız');
  END IF;

  -- Check daily wave limit (10/day)
  SELECT COALESCE(wave_count, 0) INTO v_wave_count
  FROM daily_wave_limits
  WHERE user_id = v_sender_profile_id AND date = v_today;

  IF COALESCE(v_wave_count, 0) >= 10 THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Günlük wave limitine ulaştınız (10/gün)');
  END IF;

  -- Check for existing wave today
  SELECT id INTO v_existing_wave
  FROM waves
  WHERE from_dog_id = p_sender_dog_id
    AND to_dog_id = p_target_dog_id
    AND wave_date = v_today;

  IF v_existing_wave IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Bu köpeğe bugün zaten wave attınız');
  END IF;

  -- Insert the wave
  INSERT INTO waves (from_dog_id, to_dog_id, wave_date)
  VALUES (p_sender_dog_id, p_target_dog_id, v_today);

  -- Increment daily wave count
  INSERT INTO daily_wave_limits (user_id, date, wave_count)
  VALUES (v_sender_profile_id, v_today, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET wave_count = daily_wave_limits.wave_count + 1;

  -- Check for reverse wave (any time, not just today) to create harmony
  SELECT id INTO v_reverse_wave
  FROM waves
  WHERE from_dog_id = p_target_dog_id AND to_dog_id = p_sender_dog_id;

  IF v_reverse_wave IS NOT NULL THEN
    -- Check if harmony already exists
    SELECT id INTO v_harmony_id
    FROM harmonies
    WHERE (dog_a_id = LEAST(p_sender_dog_id, p_target_dog_id)
       AND dog_b_id = GREATEST(p_sender_dog_id, p_target_dog_id));

    IF v_harmony_id IS NULL THEN
      -- Create harmony with normalized order
      INSERT INTO harmonies (dog_a_id, dog_b_id)
      VALUES (LEAST(p_sender_dog_id, p_target_dog_id), GREATEST(p_sender_dog_id, p_target_dog_id))
      RETURNING id INTO v_harmony_id;

      RETURN jsonb_build_object(
        'status', 'HARMONY_CREATED',
        'harmony_id', v_harmony_id,
        'message', 'Eşleştiniz! 🎉'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('status', 'WAVED', 'message', 'Wave gönderildi! 👋');
END;
$$;

-- 9. Create send_template RPC with ordered enforcement
CREATE OR REPLACE FUNCTION public.send_template(
  p_harmony_id uuid,
  p_template_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_is_participant boolean;
  v_sent_templates integer[];
  v_template_count integer;
  v_today date := CURRENT_DATE;
  v_template_text text;
BEGIN
  -- Get sender's profile
  SELECT id INTO v_profile_id
  FROM profiles WHERE user_id = auth.uid();

  -- Check if user is part of this harmony
  SELECT EXISTS (
    SELECT 1 FROM harmonies h
    JOIN dogs d ON (d.id = h.dog_a_id OR d.id = h.dog_b_id)
    WHERE h.id = p_harmony_id AND d.owner_id = v_profile_id
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Bu sohbete erişiminiz yok');
  END IF;

  -- Validate template_id
  IF p_template_id NOT IN (1, 2, 3) THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Geçersiz template');
  END IF;

  -- Get sent templates for this user in this harmony
  SELECT COALESCE(sent_templates, ARRAY[]::integer[])
  INTO v_sent_templates
  FROM template_sequence
  WHERE harmony_id = p_harmony_id AND user_id = v_profile_id;

  -- If no record, start fresh
  IF v_sent_templates IS NULL THEN
    v_sent_templates := ARRAY[]::integer[];
  END IF;

  -- Check if already sent
  IF p_template_id = ANY(v_sent_templates) THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Bu template zaten gönderildi');
  END IF;

  -- Enforce order: template N requires templates 1..N-1
  IF p_template_id = 2 AND NOT (1 = ANY(v_sent_templates)) THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Önce 1. template gönderilmeli');
  END IF;

  IF p_template_id = 3 AND NOT (1 = ANY(v_sent_templates) AND 2 = ANY(v_sent_templates)) THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Önce 1. ve 2. template gönderilmeli');
  END IF;

  -- Check daily template limit (5/day)
  SELECT COUNT(*) INTO v_template_count
  FROM messages
  WHERE sender_id = v_profile_id
    AND message_type = 'template'
    AND created_at::date = v_today;

  IF v_template_count >= 5 THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Günlük template limitine ulaştınız (5/gün)');
  END IF;

  -- Get template text
  v_template_text := CASE p_template_id
    WHEN 1 THEN 'Köpekler için kısa bir playdate yapalım mı?'
    WHEN 2 THEN 'Hangi park size daha uygun?'
    WHEN 3 THEN 'Hangi zaman aralığı daha iyi olur?'
  END;

  -- Insert message
  INSERT INTO messages (harmony_id, sender_id, message_type, template_id, content)
  VALUES (p_harmony_id, v_profile_id, 'template', p_template_id, v_template_text);

  -- Update template sequence
  INSERT INTO template_sequence (harmony_id, user_id, sent_templates)
  VALUES (p_harmony_id, v_profile_id, ARRAY[p_template_id])
  ON CONFLICT (harmony_id, user_id)
  DO UPDATE SET sent_templates = array_append(template_sequence.sent_templates, p_template_id);

  RETURN jsonb_build_object('status', 'SENT', 'message', 'Template gönderildi');
END;
$$;

-- 10. Create ping_presence RPC
CREATE OR REPLACE FUNCTION public.ping_presence(
  p_dog_id uuid,
  p_park_id uuid,
  p_distance_m integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_session_id uuid;
BEGIN
  -- Get profile
  SELECT id INTO v_profile_id
  FROM profiles WHERE user_id = auth.uid();

  -- Validate dog ownership
  IF NOT EXISTS (
    SELECT 1 FROM dogs d
    WHERE d.id = p_dog_id AND d.owner_id = v_profile_id AND d.deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Bu köpek size ait değil');
  END IF;

  -- Get active session
  SELECT id INTO v_session_id
  FROM park_mode_sessions
  WHERE dog_id = p_dog_id
    AND park_id = p_park_id
    AND ended_at IS NULL
    AND (started_at + interval '4 hours') > now();

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Aktif Park Mode oturumu bulunamadı');
  END IF;

  -- Insert ping
  INSERT INTO presence_pings (dog_id, park_id, session_id, approx_distance_m)
  VALUES (p_dog_id, p_park_id, v_session_id, p_distance_m);

  RETURN jsonb_build_object('status', 'PINGED', 'session_id', v_session_id);
END;
$$;

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dogs_playdate_on ON public.dogs(playdate_on) WHERE playdate_on = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_presence_pings_session ON public.presence_pings(session_id);
CREATE INDEX IF NOT EXISTS idx_presence_pings_created ON public.presence_pings(created_at);

-- 12. Add last_active tracking helper function
CREATE OR REPLACE FUNCTION public.get_last_active(p_dog_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    (SELECT MAX(started_at) FROM park_mode_sessions WHERE dog_id = p_dog_id),
    (SELECT MAX(created_at) FROM presence_pings WHERE dog_id = p_dog_id),
    (SELECT updated_at FROM dogs WHERE id = p_dog_id)
  )
$$;