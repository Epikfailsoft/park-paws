-- V1.22 Dual State System Migration
-- Add dual-state fields to dogs table for Park Check-in and Playdate ON/OFF

-- Add new columns for dual-state system
ALTER TABLE public.dogs
ADD COLUMN IF NOT EXISTS playdate_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS playdate_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS park_checkin_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS park_checkin_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS park_checkin_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_park_id UUID REFERENCES public.parks(id);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_dogs_playdate_on ON public.dogs(playdate_on) WHERE playdate_on = TRUE;
CREATE INDEX IF NOT EXISTS idx_dogs_park_checkin ON public.dogs(park_checkin_active) WHERE park_checkin_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_dogs_current_park ON public.dogs(current_park_id);

-- Create a care_documents table for Care Vault (3 docs max)
CREATE TABLE IF NOT EXISTS public.care_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('vaccine', 'vet', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT max_documents_per_dog CHECK (true)
);

-- Enable RLS on care_documents
ALTER TABLE public.care_documents ENABLE ROW LEVEL SECURITY;

-- RLS: Only owner can manage their dog's documents
CREATE POLICY "Owners can manage their dog documents"
ON public.care_documents FOR ALL
USING (
  dog_id IN (
    SELECT d.id FROM dogs d
    JOIN profiles p ON d.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Create playdate_history table
CREATE TABLE IF NOT EXISTS public.playdate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  partner_dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  park_id UUID REFERENCES public.parks(id),
  playdate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on playdate_history
ALTER TABLE public.playdate_history ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see playdates involving their dogs
CREATE POLICY "Users can view their playdate history"
ON public.playdate_history FOR SELECT
USING (
  dog_id IN (
    SELECT d.id FROM dogs d
    JOIN profiles p ON d.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
  OR partner_dog_id IN (
    SELECT d.id FROM dogs d
    JOIN profiles p ON d.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- RLS: Users can create playdates for their dogs
CREATE POLICY "Users can create playdate history"
ON public.playdate_history FOR INSERT
WITH CHECK (
  dog_id IN (
    SELECT d.id FROM dogs d
    JOIN profiles p ON d.owner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Update messages table to simplify for free-text
-- Remove template constraint since V1.22 allows free-text after Harmony
ALTER TABLE public.messages 
ALTER COLUMN message_type SET DEFAULT 'reply';

-- Create or replace function for park check-in toggle
CREATE OR REPLACE FUNCTION public.toggle_park_checkin(
  p_dog_id UUID,
  p_park_id UUID,
  p_activate BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_profile_id UUID;
  v_expires_at TIMESTAMPTZ;
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
  
  IF p_activate THEN
    -- Activate: Set 4-hour expiry
    v_expires_at := NOW() + INTERVAL '4 hours';
    
    UPDATE dogs
    SET 
      park_checkin_active = TRUE,
      park_checkin_started_at = NOW(),
      park_checkin_expires_at = v_expires_at,
      current_park_id = p_park_id
    WHERE id = p_dog_id;
    
    -- Also create a park_mode_session for compatibility
    INSERT INTO park_mode_sessions (dog_id, park_id, started_at)
    VALUES (p_dog_id, p_park_id, NOW());
    
    RETURN jsonb_build_object(
      'status', 'CHECKED_IN',
      'expires_at', v_expires_at,
      'message', 'Parka giriş yapıldı!'
    );
  ELSE
    -- Deactivate
    UPDATE dogs
    SET 
      park_checkin_active = FALSE,
      park_checkin_started_at = NULL,
      park_checkin_expires_at = NULL,
      current_park_id = NULL
    WHERE id = p_dog_id;
    
    -- End park_mode_session
    UPDATE park_mode_sessions
    SET ended_at = NOW()
    WHERE dog_id = p_dog_id AND ended_at IS NULL;
    
    RETURN jsonb_build_object('status', 'CHECKED_OUT', 'message', 'Parktan çıkış yapıldı');
  END IF;
END;
$$;

-- Create function for playdate toggle with 24h expiry
CREATE OR REPLACE FUNCTION public.toggle_playdate(
  p_dog_id UUID,
  p_activate BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_profile_id UUID;
  v_expires_at TIMESTAMPTZ;
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
  
  IF p_activate THEN
    v_expires_at := NOW() + INTERVAL '24 hours';
    
    UPDATE dogs
    SET 
      playdate_on = TRUE,
      playdate_started_at = NOW(),
      playdate_expires_at = v_expires_at
    WHERE id = p_dog_id;
    
    RETURN jsonb_build_object(
      'status', 'PLAYDATE_ON',
      'expires_at', v_expires_at,
      'message', 'Playdate açık!'
    );
  ELSE
    UPDATE dogs
    SET 
      playdate_on = FALSE,
      playdate_started_at = NULL,
      playdate_expires_at = NULL
    WHERE id = p_dog_id;
    
    RETURN jsonb_build_object('status', 'PLAYDATE_OFF', 'message', 'Playdate kapatıldı');
  END IF;
END;
$$;

-- Create send_message function for free-text messaging
CREATE OR REPLACE FUNCTION public.send_message(
  p_harmony_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_profile_id UUID;
  v_is_participant BOOLEAN;
  v_message_id UUID;
BEGIN
  -- Get sender's profile
  SELECT id INTO v_profile_id
  FROM profiles WHERE user_id = auth.uid();
  
  -- Check if user is part of this harmony
  SELECT EXISTS (
    SELECT 1 FROM harmonies h
    JOIN dogs d ON (d.id = h.dog_a_id OR d.id = h.dog_b_id)
    WHERE h.id = p_harmony_id AND d.owner_id = v_profile_id
  ) INTO v_is_participant;
  
  IF NOT v_is_participant THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Bu sohbete erişiminiz yok');
  END IF;
  
  -- Validate content
  IF p_content IS NULL OR trim(p_content) = '' THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Mesaj boş olamaz');
  END IF;
  
  -- Insert message
  INSERT INTO messages (harmony_id, sender_id, message_type, content)
  VALUES (p_harmony_id, v_profile_id, 'reply', p_content)
  RETURNING id INTO v_message_id;
  
  RETURN jsonb_build_object(
    'status', 'SENT',
    'message_id', v_message_id,
    'message', 'Mesaj gönderildi'
  );
END;
$$;