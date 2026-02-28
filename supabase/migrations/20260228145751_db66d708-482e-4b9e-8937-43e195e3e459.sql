
-- Dog care tracking table for vaccination, vet visits, parasite protection
CREATE TABLE public.dog_care (
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  vaccination_status TEXT NOT NULL DEFAULT 'unknown' CHECK (vaccination_status IN ('up_to_date', 'due_soon', 'overdue', 'unknown')),
  vaccination_date DATE,
  vaccination_next_date DATE,
  last_vet_visit DATE,
  parasite_protection_date DATE,
  parasite_protection_next_date DATE,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (dog_id)
);

-- RLS
ALTER TABLE public.dog_care ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage dog care" ON public.dog_care
  FOR ALL USING (
    dog_id IN (
      SELECT d.id FROM dogs d
      JOIN profiles p ON d.owner_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Dog care viewable by all" ON public.dog_care
  FOR SELECT USING (true);
