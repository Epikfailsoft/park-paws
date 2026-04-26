-- 1. dog_care: remove public read
DROP POLICY IF EXISTS "Dog care viewable by all" ON public.dog_care;

-- 2. parks: restrict update to admins
DROP POLICY IF EXISTS "System can update parks" ON public.parks;
CREATE POLICY "Admins can update parks" ON public.parks
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. notifications: remove open INSERT
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- 4. storage: enforce folder-based ownership for dog-photos
DROP POLICY IF EXISTS "Users can delete their dog photos" ON storage.objects;
CREATE POLICY "Users can delete own dog photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'dog-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their dog photos" ON storage.objects;
CREATE POLICY "Users can update own dog photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'dog-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Also tighten INSERT to enforce folder ownership
DROP POLICY IF EXISTS "Authenticated users can upload dog photos" ON storage.objects;
CREATE POLICY "Users can upload own dog photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'dog-photos'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. get_park_dogs: require auth
CREATE OR REPLACE FUNCTION public.get_park_dogs(p_park_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(dog_id uuid, dog_name text, breed_name text, approximate_age text, energy_level integer, daily_energy integer, is_neutered boolean, photo_url text, bio text, gender text, social_style text, triggers text[], owner_name_stub text, owner_photo_stub text, owner_id uuid, park_checkin_expires_at timestamp with time zone, is_lost boolean, emergency_phone text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    d.id AS dog_id,
    d.name AS dog_name,
    b.name AS breed_name,
    d.approximate_age,
    d.energy_level,
    d.daily_energy,
    d.neutered AS is_neutered,
    d.photo_url,
    d.bio,
    d.gender,
    d.social_style::TEXT,
    d.triggers,
    d.owner_name_stub,
    d.owner_photo_stub,
    d.owner_id,
    d.park_checkin_expires_at,
    COALESCE(d.is_lost, false) AS is_lost,
    CASE 
      WHEN d.is_lost = true THEN dp.emergency_phone
      ELSE NULL
    END AS emergency_phone
  FROM public.dogs d
  LEFT JOIN public.breeds b ON b.id = d.breed_id
  LEFT JOIN public.dog_private dp ON dp.dog_id = d.id
  WHERE
    d.deleted_at IS NULL
    AND d.current_park_id = p_park_id
    AND d.park_checkin_active = true
    AND d.park_checkin_expires_at > NOW()
  ORDER BY
    COALESCE(d.is_lost, false) DESC,
    d.park_checkin_started_at DESC
  LIMIT p_limit;
END;
$function$;