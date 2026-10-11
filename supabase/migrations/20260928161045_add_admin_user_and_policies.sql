/*
# Add admin user and admin access policies

1. Admin User Setup
- Set is_admin = true for user with email 'wnsdud4569@naver.com'
- Create trigger to auto-set is_admin when a user with that email signs up

2. Admin Access Policies
- Allow admin users to manage all reports, posts, comments, profiles, and catches

3. Security
- All admin policies check is_admin flag in user_profiles table
*/

UPDATE user_profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'wnsdud4569@naver.com'
);

CREATE OR REPLACE FUNCTION set_admin_for_specific_email()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = NEW.id AND email = 'wnsdud4569@naver.com'
  ) THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_admin_on_profile_insert ON user_profiles;
CREATE TRIGGER set_admin_on_profile_insert
BEFORE INSERT ON user_profiles
FOR EACH ROW EXECUTE FUNCTION set_admin_for_specific_email();

DROP TRIGGER IF EXISTS check_admin_email_on_profile_update ON user_profiles;
CREATE TRIGGER check_admin_email_on_profile_update
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION set_admin_for_specific_email();

DROP POLICY IF EXISTS "admin_select_all_reports" ON reports;
CREATE POLICY "admin_select_all_reports" ON reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_all_reports" ON reports;
CREATE POLICY "admin_delete_all_reports" ON reports FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_all_posts" ON point_posts;
CREATE POLICY "admin_update_all_posts" ON point_posts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_all_posts" ON point_posts;
CREATE POLICY "admin_delete_all_posts" ON point_posts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_all_comments" ON point_comments;
CREATE POLICY "admin_update_all_comments" ON point_comments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_all_comments" ON point_comments;
CREATE POLICY "admin_delete_all_comments" ON point_comments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_select_all_profiles" ON user_profiles;
CREATE POLICY "admin_select_all_profiles" ON user_profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_all_profiles" ON user_profiles;
CREATE POLICY "admin_update_all_profiles" ON user_profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_select_all_catches" ON catches;
CREATE POLICY "admin_select_all_catches" ON catches FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_all_catches" ON catches;
CREATE POLICY "admin_delete_all_catches" ON catches FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );
