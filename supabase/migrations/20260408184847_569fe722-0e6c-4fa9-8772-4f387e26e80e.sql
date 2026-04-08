
CREATE TABLE public.dog_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dog_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dog photos viewable by all"
ON public.dog_photos FOR SELECT
USING (true);

CREATE POLICY "Owners can insert dog photos"
ON public.dog_photos FOR INSERT
WITH CHECK (dog_id IN (
  SELECT d.id FROM dogs d JOIN profiles p ON d.owner_id = p.id
  WHERE p.user_id = auth.uid() AND d.deleted_at IS NULL
));

CREATE POLICY "Owners can update dog photos"
ON public.dog_photos FOR UPDATE
USING (dog_id IN (
  SELECT d.id FROM dogs d JOIN profiles p ON d.owner_id = p.id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Owners can delete dog photos"
ON public.dog_photos FOR DELETE
USING (dog_id IN (
  SELECT d.id FROM dogs d JOIN profiles p ON d.owner_id = p.id
  WHERE p.user_id = auth.uid()
));

CREATE INDEX idx_dog_photos_dog_id ON public.dog_photos(dog_id);
