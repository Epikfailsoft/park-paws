-- Add missing fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT CHECK (length(bio) <= 50);

-- Add missing fields to dogs table
ALTER TABLE public.dogs
ADD COLUMN IF NOT EXISTS bio TEXT CHECK (length(bio) <= 150),
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female')),
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC CHECK (weight_kg > 0);

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;