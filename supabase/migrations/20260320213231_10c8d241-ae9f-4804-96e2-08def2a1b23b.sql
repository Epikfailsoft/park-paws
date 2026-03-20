
-- Add observer_mode flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS observer_mode boolean DEFAULT false;

-- Create function to grant first checkin badge
CREATE OR REPLACE FUNCTION public.grant_first_checkin_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_badge_id uuid;
  v_already_has boolean;
BEGIN
  -- Only trigger on first check-in activation
  IF NEW.park_checkin_active = true AND (OLD.park_checkin_active IS NULL OR OLD.park_checkin_active = false) THEN
    -- Check if dog already has this badge
    SELECT b.id INTO v_badge_id FROM badges b WHERE b.code = 'first_checkin';
    IF v_badge_id IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM dog_badges WHERE dog_id = NEW.id AND badge_id = v_badge_id) INTO v_already_has;
      IF NOT v_already_has THEN
        INSERT INTO dog_badges (dog_id, badge_id, metadata)
        VALUES (NEW.id, v_badge_id, jsonb_build_object('park_id', NEW.current_park_id, 'earned_via', 'first_checkin'));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for first checkin badge
DROP TRIGGER IF EXISTS trg_first_checkin_badge ON public.dogs;
CREATE TRIGGER trg_first_checkin_badge
  AFTER UPDATE ON public.dogs
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_first_checkin_badge();

-- Add report_count to park_announcements for tracking reports
ALTER TABLE public.park_announcements ADD COLUMN IF NOT EXISTS report_count integer DEFAULT 0;
