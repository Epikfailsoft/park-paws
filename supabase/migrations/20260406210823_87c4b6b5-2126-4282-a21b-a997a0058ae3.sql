
-- Update send_wave to remove daily limit
CREATE OR REPLACE FUNCTION public.send_wave(p_sender_dog_id uuid, p_target_dog_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender_profile_id uuid;
  v_target_owner_id uuid;
  v_rapid_count integer;
  v_existing_wave uuid;
  v_reverse_wave uuid;
  v_harmony_id uuid;
  v_today date := CURRENT_DATE;
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

  -- Rapid fire check (keep anti-spam)
  SELECT COUNT(*) INTO v_rapid_count
  FROM waves w
  JOIN dogs d ON d.id = w.from_dog_id
  WHERE d.owner_id = v_sender_profile_id
    AND w.created_at > NOW() - INTERVAL '1 minute';

  IF v_rapid_count >= 5 THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Çok hızlı! Biraz bekleyin.');
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

  INSERT INTO events (event_name, user_id, payload)
  VALUES ('wave_sent', v_sender_profile_id, jsonb_build_object(
    'from_dog_id', p_sender_dog_id, 'to_dog_id', p_target_dog_id
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

      INSERT INTO events (event_name, user_id, payload)
      VALUES ('harmony_created', v_sender_profile_id, jsonb_build_object(
        'harmony_id', v_harmony_id,
        'dog_a_id', LEAST(p_sender_dog_id, p_target_dog_id),
        'dog_b_id', GREATEST(p_sender_dog_id, p_target_dog_id)
      ));

      RETURN jsonb_build_object('status', 'HARMONY_CREATED', 'harmony_id', v_harmony_id, 'message', 'Eşleştiniz! 🎉');
    END IF;
  END IF;

  RETURN jsonb_build_object('status', 'WAVED', 'message', 'Wave gönderildi! 👋');
END;
$$;

-- Update get_remaining_waves to always return unlimited
CREATE OR REPLACE FUNCTION public.get_remaining_waves(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 999;
END;
$$;
