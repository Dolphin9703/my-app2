-- Fix: set_admin_for_specific_email trigger was causing "Database error saving new user"
-- because it queried auth.users during BEFORE INSERT on user_profiles,
-- and the function had no explicit search_path set.
-- Solution: Remove the BEFORE INSERT trigger that queries auth.users,
-- and instead handle admin assignment inside handle_new_user() which already
-- has access to the auth.users row being inserted.

-- Drop the problematic triggers
DROP TRIGGER IF EXISTS set_admin_on_profile_insert ON user_profiles;
DROP TRIGGER IF EXISTS check_admin_email_on_profile_update ON user_profiles;
DROP FUNCTION IF EXISTS set_admin_for_specific_email();

-- Update handle_new_user to also set is_admin if the email matches
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, nickname, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', '낚시꾼'),
    NEW.email = 'wnsdud4569@naver.com'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also update existing profile if email matches (for users who signed up before this fix)
UPDATE user_profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'wnsdud4569@naver.com'
);
