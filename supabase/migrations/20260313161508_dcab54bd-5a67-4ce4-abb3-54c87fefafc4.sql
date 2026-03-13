
-- Drop all overloads of get_discover_dogs and recreate a single clean version
DROP FUNCTION IF EXISTS public.get_discover_dogs(double precision, double precision, double precision, integer, integer);
DROP FUNCTION IF EXISTS public.get_discover_dogs(double precision, double precision, numeric, integer, integer);

CREATE OR REPLACE FUNCTION public.get_discover_dogs(
  p_user_lat DOUBLE PRECISION DEFAULT NULL,
  p_user_lng DOUBLE PRECISION DEFAULT NULL,
  p_max_distance_km DOUBLE PRECISION DEFAULT 10,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  dog_id UUID,
  dog_name TEXT,
  breed_name TEXT,
  approximate_age TEXT,
  energy_level INTEGER,
  daily_energy INTEGER,
  is_neutered BOOLEAN,
  photo_url TEXT,
  bio TEXT,
  gender TEXT,
  weight_kg NUMERIC,
  social_style TEXT,
  triggers TEXT[],
  distance_km NUMERIC,
  park_checkin_active BOOLEAN,
  current_park_id UUID,
  current_park_name TEXT,
  playdate_on BOOLEAN,
  playdate_expires_at TIMESTAMPTZ,
  owner_name_stub TEXT,
  owner_photo_stub TEXT,
  already_waved BOOLEAN,
  is_lost BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_user_location extensions.geography;
BEGIN
  SELECT p.id INTO v_profile_id
  FROM public.profiles p WHERE p.user_id = auth.uid();

  IF p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
    v_user_location := extensions.ST_SetSRID(extensions.ST_MakePoint(p_user_lng, p_user_lat), 4326)::extensions.geography;
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
    d.weight_kg,
    d.social_style::TEXT,
    d.triggers,
    CASE 
      WHEN v_user_location IS NOT NULL AND d.location IS NOT NULL 
      THEN (extensions.ST_Distance(d.location, v_user_location) / 1000)::NUMERIC(10,2)
      ELSE NULL
    END AS distance_km,
    COALESCE(d.park_checkin_active, false) AS park_checkin_active,
    d.current_park_id,
    pk.name AS current_park_name,
    COALESCE(d.playdate_on, false) AS playdate_on,
    d.playdate_expires_at,
    d.owner_name_stub,
    d.owner_photo_stub,
    EXISTS (
      SELECT 1 FROM public.waves w
      JOIN public.dogs my_dog ON my_dog.owner_id = v_profile_id
      WHERE w.from_dog_id = my_dog.id AND w.to_dog_id = d.id
    ) AS already_waved,
    COALESCE(d.is_lost, false) AS is_lost
  FROM public.dogs d
  LEFT JOIN public.breeds b ON b.id = d.breed_id
  LEFT JOIN public.parks pk ON pk.id = d.current_park_id
  WHERE
    d.owner_id != v_profile_id
    AND d.deleted_at IS NULL
    AND (
      v_user_location IS NULL 
      OR d.location IS NULL
      OR extensions.ST_DWithin(d.location, v_user_location, p_max_distance_km * 1000)
    )
  ORDER BY
    COALESCE(d.is_lost, false) DESC,
    COALESCE(d.park_checkin_active, false) DESC,
    COALESCE(d.playdate_on, false) DESC,
    d.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
