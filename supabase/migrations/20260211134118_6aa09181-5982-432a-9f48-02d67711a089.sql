
-- 1. Toggle Lost Mode RPC
CREATE OR REPLACE FUNCTION public.toggle_lost_mode(
  p_dog_id UUID,
  p_enable BOOLEAN,
  p_emergency_phone TEXT DEFAULT NULL,
  p_last_seen_park_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Get profile
  SELECT id INTO v_profile_id
  FROM profiles WHERE user_id = auth.uid();
  
  -- Validate ownership
  IF NOT EXISTS (
    SELECT 1 FROM dogs d
    WHERE d.id = p_dog_id AND d.owner_id = v_profile_id AND d.deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Bu köpek size ait değil');
  END IF;
  
  IF p_enable THEN
    -- Require emergency phone
    IF p_emergency_phone IS NULL OR trim(p_emergency_phone) = '' THEN
      RETURN jsonb_build_object('status', 'ERROR', 'message', 'Acil telefon numarası gerekli');
    END IF;
    
    -- Validate Turkish phone format
    IF NOT (p_emergency_phone ~ '^\+90[0-9]{10}$' OR p_emergency_phone ~ '^0[0-9]{10}$') THEN
      RETURN jsonb_build_object('status', 'ERROR', 'message', 'Geçersiz telefon formatı. +90XXXXXXXXXX veya 0XXXXXXXXXX kullanın');
    END IF;
    
    -- Set dog as lost
    UPDATE dogs SET is_lost = TRUE, updated_at = NOW() WHERE id = p_dog_id;
    
    -- Upsert lost profile
    INSERT INTO dog_lost_profile (dog_id, emergency_phone, last_seen_park_id, lost_started_at)
    VALUES (p_dog_id, p_emergency_phone, p_last_seen_park_id, NOW())
    ON CONFLICT (dog_id)
    DO UPDATE SET 
      emergency_phone = p_emergency_phone,
      last_seen_park_id = p_last_seen_park_id,
      lost_started_at = NOW(),
      lost_ends_at = NULL;
    
    -- Also update dog_private emergency phone
    INSERT INTO dog_private (dog_id, emergency_phone)
    VALUES (p_dog_id, p_emergency_phone)
    ON CONFLICT (dog_id)
    DO UPDATE SET emergency_phone = p_emergency_phone;
    
    -- Log analytics event
    INSERT INTO events (event_name, user_id, payload)
    VALUES ('lost_mode_activated', v_profile_id, jsonb_build_object('dog_id', p_dog_id));
    
    RETURN jsonb_build_object('status', 'LOST_MODE_ON', 'message', 'Kayıp modu açıldı! Yakındaki kullanıcılar bilgilendirilecek.');
  ELSE
    -- Disable lost mode
    UPDATE dogs SET is_lost = FALSE, updated_at = NOW() WHERE id = p_dog_id;
    
    UPDATE dog_lost_profile SET lost_ends_at = NOW() WHERE dog_id = p_dog_id;
    
    -- Log analytics event
    INSERT INTO events (event_name, user_id, payload)
    VALUES ('lost_mode_deactivated', v_profile_id, jsonb_build_object('dog_id', p_dog_id));
    
    RETURN jsonb_build_object('status', 'LOST_MODE_OFF', 'message', 'Kayıp modu kapatıldı');
  END IF;
END;
$$;

-- 2. Update send_wave with rapid-fire rate limiting (5 waves/minute)
CREATE OR REPLACE FUNCTION public.send_wave(p_sender_dog_id uuid, p_target_dog_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_sender_profile_id uuid;
  v_target_owner_id uuid;
  v_wave_count integer;
  v_rapid_count integer;
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

  -- RAPID-FIRE CHECK: Max 5 waves per minute
  SELECT COUNT(*) INTO v_rapid_count
  FROM waves w
  JOIN dogs d ON d.id = w.from_dog_id
  WHERE d.owner_id = v_sender_profile_id
    AND w.created_at > NOW() - INTERVAL '1 minute';

  IF v_rapid_count >= 5 THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Çok hızlı! Biraz bekleyin.');
  END IF;

  -- Check daily wave limit (10/day)
  SELECT COALESCE(wave_count, 0) INTO v_wave_count
  FROM daily_wave_limits
  WHERE user_id = v_sender_profile_id AND date = v_today;

  IF COALESCE(v_wave_count, 0) >= 10 THEN
    -- Log limit reached event
    INSERT INTO events (event_name, user_id, payload)
    VALUES ('wave_limit_reached', v_sender_profile_id, jsonb_build_object('date', v_today));
    
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

  -- Log wave sent event
  INSERT INTO events (event_name, user_id, payload)
  VALUES ('wave_sent', v_sender_profile_id, jsonb_build_object(
    'from_dog_id', p_sender_dog_id, 
    'to_dog_id', p_target_dog_id
  ));

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
      INSERT INTO harmonies (dog_a_id, dog_b_id)
      VALUES (LEAST(p_sender_dog_id, p_target_dog_id), GREATEST(p_sender_dog_id, p_target_dog_id))
      RETURNING id INTO v_harmony_id;

      -- Log harmony created event
      INSERT INTO events (event_name, user_id, payload)
      VALUES ('harmony_created', v_sender_profile_id, jsonb_build_object(
        'harmony_id', v_harmony_id,
        'dog_a_id', LEAST(p_sender_dog_id, p_target_dog_id),
        'dog_b_id', GREATEST(p_sender_dog_id, p_target_dog_id)
      ));

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
