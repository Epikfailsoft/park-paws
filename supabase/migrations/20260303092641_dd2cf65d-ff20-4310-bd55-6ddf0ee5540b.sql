
-- Group Waves table for park coordination
CREATE TABLE public.group_waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES public.parks(id) ON DELETE CASCADE,
  creator_dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  template TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.group_waves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group waves viewable by all authenticated" ON public.group_waves
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create group waves for their dogs" ON public.group_waves
  FOR INSERT TO authenticated
  WITH CHECK (creator_dog_id IN (
    SELECT d.id FROM dogs d JOIN profiles p ON d.owner_id = p.id WHERE p.user_id = auth.uid() AND d.deleted_at IS NULL
  ));

CREATE POLICY "Users can delete own group waves" ON public.group_waves
  FOR DELETE TO authenticated
  USING (creator_dog_id IN (
    SELECT d.id FROM dogs d JOIN profiles p ON d.owner_id = p.id WHERE p.user_id = auth.uid()
  ));

-- Group Wave RSVPs (count only visible)
CREATE TABLE public.group_wave_rsvps (
  group_wave_id UUID NOT NULL REFERENCES public.group_waves(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_wave_id, dog_id)
);

ALTER TABLE public.group_wave_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RSVPs viewable by all authenticated" ON public.group_wave_rsvps
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can RSVP with their dogs" ON public.group_wave_rsvps
  FOR INSERT TO authenticated
  WITH CHECK (dog_id IN (
    SELECT d.id FROM dogs d JOIN profiles p ON d.owner_id = p.id WHERE p.user_id = auth.uid() AND d.deleted_at IS NULL
  ));

CREATE POLICY "Users can remove own RSVPs" ON public.group_wave_rsvps
  FOR DELETE TO authenticated
  USING (dog_id IN (
    SELECT d.id FROM dogs d JOIN profiles p ON d.owner_id = p.id WHERE p.user_id = auth.uid()
  ));
