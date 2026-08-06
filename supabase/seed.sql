-- ════════════════════════════════════════════════════════════
-- Seed: Teacher account for Dinesh Wadhwani
-- Run AFTER schema.sql
-- ════════════════════════════════════════════════════════════

-- Step 1: Create the auth user via Supabase Dashboard or this call:
-- Go to Authentication > Users > Add User
-- Email: dinesh.k.wadhwani@gmail.com
-- Password: ChangeMe@123 (teacher should change this)
-- Copy the UUID from the created user, then run Step 2:

-- Step 2: Insert the profile (replace <PASTE_UUID_HERE> with actual UUID)
-- INSERT INTO public.profiles (id, full_name, email, phone, role, must_change_password)
-- VALUES (
--   '<PASTE_UUID_HERE>',
--   'Dinesh Wadhwani',
--   'dinesh.k.wadhwani@gmail.com',
--   '9767676738',
--   'teacher',
--   false
-- );

-- ALTERNATIVELY: Use the API route /api/seed-teacher once deployed
-- GET /api/seed-teacher?secret=SETUP_SECRET
