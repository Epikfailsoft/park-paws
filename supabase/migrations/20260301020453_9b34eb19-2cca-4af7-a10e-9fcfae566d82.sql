-- Update parks required_approvals to 10
UPDATE public.parks SET required_approvals = 10 WHERE id = 'a36dde81-ecf5-4b73-b7d9-81e6b2acbe00';

-- Insert Bebek and Maçka parks as REQUESTED with waitlist
INSERT INTO public.parks (name, status, location, required_approvals, approval_count, requested_at)
VALUES 
  ('Bebek Parkı', 'REQUESTED', '{"lat": 41.0761, "lng": 29.0438}', 10, 3, NOW()),
  ('Maçka Parkı', 'REQUESTED', '{"lat": 41.0472, "lng": 28.9953}', 10, 5, NOW())
ON CONFLICT DO NOTHING;