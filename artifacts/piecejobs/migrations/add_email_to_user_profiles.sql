-- Migration: Add email column to user_profiles table
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- The email column is required so that notify.ts can resolve recipient
-- addresses for transactional emails (new application, accepted, payment, etc.)

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Back-fill existing users' email addresses from auth.users
UPDATE user_profiles p
SET    email = u.email
FROM   auth.users u
WHERE  p.id = u.id
  AND  p.email IS NULL;
