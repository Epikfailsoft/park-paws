
-- Enable PostGIS extension for distance-based sorting
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- Add location column to dogs for distance sorting
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS location extensions.geography(Point, 4326);
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add owner stub columns for privacy (no need to join profiles for public display)
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS owner_name_stub TEXT;
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS owner_photo_stub TEXT;

-- Create spatial index for fast distance queries
CREATE INDEX IF NOT EXISTS idx_dogs_location ON public.dogs USING GIST (location);

-- Populate owner stubs from existing profile data
UPDATE public.dogs d
SET 
  owner_name_stub = p.display_name,
  owner_photo_stub = p.photo_url
FROM public.profiles p
WHERE d.owner_id = p.id;

-- Trigger: sync owner stubs when profile updates
CREATE OR REPLACE FUNCTION public.sync_dog_owner_stub()
RETURNS trigger AS $$
BEGIN
  UPDATE public.dogs
  SET owner_name_stub = NEW.display_name,
      owner_photo_stub = NEW.photo_url,
      updated_at = NOW()
  WHERE owner_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_dog_owner_stub
AFTER UPDATE OF display_name, photo_url ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_dog_owner_stub();

-- Also sync on profile insert (for new users)
CREATE OR REPLACE FUNCTION public.sync_dog_owner_stub_on_insert()
RETURNS trigger AS $$
BEGIN
  UPDATE public.dogs
  SET owner_name_stub = NEW.display_name,
      owner_photo_stub = NEW.photo_url,
      updated_at = NOW()
  WHERE owner_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_dog_owner_stub_insert
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_dog_owner_stub_on_insert();

-- RPC: Get Discover dogs with PostGIS distance sorting
-- Adapted to work with existing schema (profiles, approximate_age, photo_url)
CREATE OR REPLACE FUNCTION public.get_discover_dogs(
  p_user_lat FLOAT DEFAULT NULL,
  p_user_lng FLOAT DEFAULT NULL,
  p_max_distance_km NUMERIC DEFAULT 10,
  p_limit INT DEFAULT 30,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  dog_id UUID,
  dog_name TEXT,
  breed_name TEXT,
  approximate_age TEXT,
  energy_level INT,
  daily_energy INT,
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
) AS $$
DECLARE
  v_profile_id UUID;
  v_user_location extensions.geography;
BEGIN
  -- Get caller's profile id
  SELECT p.id INTO v_profile_id
  FROM public.profiles p WHERE p.user_id = auth.uid();

  -- Build user location if coordinates provided
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
      (d.playdate_on = true AND d.playdate_expires_at > NOW())
      OR (d.park_checkin_active = true AND d.park_checkin_expires_at > NOW())
      OR (d.is_lost = true)
    )
    AND (
      v_user_location IS NULL 
      OR d.location IS NULL
      OR extensions.ST_DWithin(d.location, v_user_location, p_max_distance_km * 1000)
    )
  ORDER BY
    COALESCE(d.park_checkin_active, false) DESC,
    CASE 
      WHEN v_user_location IS NOT NULL AND d.location IS NOT NULL 
      THEN extensions.ST_Distance(d.location, v_user_location)
      ELSE 999999999
    END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- RPC: Get Park dogs (who is here now)
CREATE OR REPLACE FUNCTION public.get_park_dogs(
  p_park_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  dog_id UUID,
  dog_name TEXT,
  breed_name TEXT,
  approximate_age TEXT,
  energy_level INT,
  daily_energy INT,
  is_neutered BOOLEAN,
  photo_url TEXT,
  bio TEXT,
  gender TEXT,
  social_style TEXT,
  triggers TEXT[],
  owner_name_stub TEXT,
  owner_photo_stub TEXT,
  owner_id UUID,
  park_checkin_expires_at TIMESTAMPTZ,
  is_lost BOOLEAN,
  emergency_phone TEXT
) AS $$
BEGIN
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- RPC: Update dog location (called from frontend with geolocation)
CREATE OR REPLACE FUNCTION public.update_dog_location(
  p_dog_id UUID,
  p_lat FLOAT,
  p_lng FLOAT
)
RETURNS JSON AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  SELECT p.id INTO v_profile_id
  FROM public.profiles p WHERE p.user_id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM public.dogs d
    WHERE d.id = p_dog_id AND d.owner_id = v_profile_id AND d.deleted_at IS NULL
  ) THEN
    RETURN json_build_object('status', 'ERROR', 'message', 'Bu köpek size ait değil');
  END IF;

  UPDATE public.dogs
  SET 
    location = extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography,
    location_updated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_dog_id;

  RETURN json_build_object('status', 'OK', 'message', 'Konum güncellendi');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
