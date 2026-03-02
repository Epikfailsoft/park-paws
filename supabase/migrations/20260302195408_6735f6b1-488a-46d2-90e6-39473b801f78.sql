
-- Update send_wave to skip daily limit for park-checked-in dogs
CREATE OR REPLACE FUNCTION public.send_wave(p_sender_dog_id uuid, p_target_dog_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_profile_id uuid;
  v_target_owner_id uuid;
  v_wave_count integer;
  v_rapid_count integer;
  v_existing_wave uuid;
  v_reverse_wave uuid;
  v_harmony_id uuid;
  v_today date := CURRENT_DATE;
  v_target_in_park boolean;
  v_is_free_wave boolean := false;
BEGIN
  SELECT p.id INTO v_sender_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM dogs d
    WHERE d.id = p_sender_dog_id AND d.owner_id = v_sender_profile_id AND d.deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Bu köpek size ait değil');
  END IF;

  SELECT d.owner_id INTO v_target_owner_id
  FROM dogs d WHERE d.id = p_target_dog_id AND d.deleted_at IS NULL;

  IF v_target_owner_id IS NULL THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Hedef köpek bulunamadı');
  END IF;

  IF v_target_owner_id = v_sender_profile_id THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Kendi köpeğinize wave atamazsınız');
  END IF;

  -- Rapid fire check
  SELECT COUNT(*) INTO v_rapid_count
  FROM waves w
  JOIN dogs d ON d.id = w.from_dog_id
  WHERE d.owner_id = v_sender_profile_id
    AND w.created_at > NOW() - INTERVAL '1 minute';

  IF v_rapid_count >= 5 THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Çok hızlı! Biraz bekleyin.');
  END IF;

  -- Check if target dog is in park (free wave)
  SELECT EXISTS (
    SELECT 1 FROM dogs d 
    WHERE d.id = p_target_dog_id 
      AND d.park_checkin_active = true 
      AND d.park_checkin_expires_at > NOW()
  ) INTO v_target_in_park;

  v_is_free_wave := v_target_in_park;

  -- Only check daily limit for non-free waves
  IF NOT v_is_free_wave THEN
    SELECT COALESCE(wave_count, 0) INTO v_wave_count
    FROM daily_wave_limits
    WHERE user_id = v_sender_profile_id AND date = v_today;

    IF COALESCE(v_wave_count, 0) >= 5 THEN
      INSERT INTO events (event_name, user_id, payload)
      VALUES ('wave_limit_reached', v_sender_profile_id, jsonb_build_object('date', v_today));
      
      RETURN jsonb_build_object('status', 'ERROR', 'message', 'Günlük wave limitine ulaştınız (5/gün)');
    END IF;
  END IF;

  -- Check duplicate
  SELECT id INTO v_existing_wave
  FROM waves
  WHERE from_dog_id = p_sender_dog_id AND to_dog_id = p_target_dog_id AND wave_date = v_today;

  IF v_existing_wave IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Bu köpeğe bugün zaten wave attınız');
  END IF;

  -- Insert wave
  INSERT INTO waves (from_dog_id, to_dog_id, wave_date)
  VALUES (p_sender_dog_id, p_target_dog_id, v_today);

  -- Only count against daily limit if not free
  IF NOT v_is_free_wave THEN
    INSERT INTO daily_wave_limits (user_id, date, wave_count)
    VALUES (v_sender_profile_id, v_today, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET wave_count = daily_wave_limits.wave_count + 1;
  END IF;

  INSERT INTO events (event_name, user_id, payload)
  VALUES ('wave_sent', v_sender_profile_id, jsonb_build_object(
    'from_dog_id', p_sender_dog_id, 'to_dog_id', p_target_dog_id, 'free_wave', v_is_free_wave
  ));

  -- Check for mutual wave = harmony
  SELECT id INTO v_reverse_wave
  FROM waves
  WHERE from_dog_id = p_target_dog_id AND to_dog_id = p_sender_dog_id;

  IF v_reverse_wave IS NOT NULL THEN
    SELECT id INTO v_harmony_id
    FROM harmonies
    WHERE (dog_a_id = LEAST(p_sender_dog_id, p_target_dog_id)
       AND dog_b_id = GREATEST(p_sender_dog_id, p_target_dog_id));

    IF v_harmony_id IS NULL THEN
      INSERT INTO harmonies (dog_a_id, dog_b_id)
      VALUES (LEAST(p_sender_dog_id, p_target_dog_id), GREATEST(p_sender_dog_id, p_target_dog_id))
      RETURNING id INTO v_harmony_id;

      -- Harmony returns 1 wave to both users
      UPDATE daily_wave_limits 
      SET wave_count = GREATEST(0, wave_count - 1)
      WHERE user_id = v_sender_profile_id AND date = v_today;

      UPDATE daily_wave_limits 
      SET wave_count = GREATEST(0, wave_count - 1)
      WHERE user_id = v_target_owner_id AND date = v_today;

      INSERT INTO events (event_name, user_id, payload)
      VALUES ('harmony_created', v_sender_profile_id, jsonb_build_object(
        'harmony_id', v_harmony_id,
        'dog_a_id', LEAST(p_sender_dog_id, p_target_dog_id),
        'dog_b_id', GREATEST(p_sender_dog_id, p_target_dog_id)
      ));

      RETURN jsonb_build_object('status', 'HARMONY_CREATED', 'harmony_id', v_harmony_id, 'message', 'Eşleştiniz! 🎉', 'free_wave', v_is_free_wave);
    END IF;
  END IF;

  RETURN jsonb_build_object('status', 'WAVED', 'message', v_is_free_wave::text || ' - Wave gönderildi! 👋', 'free_wave', v_is_free_wave);
END;
$function$;
