-- 1. user_profiles table (nickname, ban status, admin)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL DEFAULT '낚시꾼',
  is_banned boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_profiles" ON user_profiles FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Add user_id and is_blind to point_posts
ALTER TABLE point_posts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE point_posts ADD COLUMN IF NOT EXISTS is_blind boolean DEFAULT false;

-- 3. Add user_id and is_blind to point_comments
ALTER TABLE point_comments ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE point_comments ADD COLUMN IF NOT EXISTS is_blind boolean DEFAULT false;

-- 4. Add user_id, quantity, rig to catches
ALTER TABLE catches ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS rig text;

-- 5. Reports table with unique constraint to prevent duplicate reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES point_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES point_comments(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT one_report_per_user_post UNIQUE (reporter_id, post_id),
  CONSTRAINT one_report_per_user_comment UNIQUE (reporter_id, comment_id),
  CONSTRAINT check_target CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_reports" ON reports FOR SELECT
  TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "insert_reports" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "delete_reports" ON reports FOR DELETE
  TO authenticated USING (auth.uid() = reporter_id);

-- 6. Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_feedback" ON feedback FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_feedback" ON feedback FOR INSERT
  TO authenticated WITH CHECK (true);

-- 7. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'community',
  title text NOT NULL,
  body text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 8. Update point_posts RLS to require auth for insert, allow read for all
DROP POLICY IF EXISTS "insert_point_posts" ON point_posts;
CREATE POLICY "insert_point_posts_auth" ON point_posts FOR INSERT
  TO authenticated WITH CHECK (true);

-- 9. Update point_comments RLS to require auth for insert
DROP POLICY IF EXISTS "insert_point_comments" ON point_comments;
CREATE POLICY "insert_point_comments_auth" ON point_comments FOR INSERT
  TO authenticated WITH CHECK (true);

-- 10. Update catches RLS to require auth for insert
DROP POLICY IF EXISTS "insert_catches" ON catches;
CREATE POLICY "insert_catches_auth" ON catches FOR INSERT
  TO authenticated WITH CHECK (true);

-- 11. Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, nickname)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nickname', '낚시꾼'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 12. Function: auto-blind posts after 3 reports
CREATE OR REPLACE FUNCTION check_and_blind_post()
RETURNS TRIGGER AS $$
DECLARE
  report_count integer;
  author_id uuid;
BEGIN
  SELECT COUNT(*) INTO report_count FROM reports WHERE post_id = NEW.post_id;
  IF report_count >= 3 THEN
    UPDATE point_posts SET is_blind = true WHERE id = NEW.post_id;
    SELECT user_id INTO author_id FROM point_posts WHERE id = NEW.post_id;
    IF author_id IS NOT NULL THEN
      UPDATE user_profiles SET is_banned = true WHERE id = author_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_report_inserted ON reports;
CREATE TRIGGER on_report_inserted
  AFTER INSERT ON reports
  FOR EACH ROW WHEN (NEW.post_id IS NOT NULL)
  EXECUTE FUNCTION check_and_blind_post();

-- 13. Function: auto-blind comments after 3 reports
CREATE OR REPLACE FUNCTION check_and_blind_comment()
RETURNS TRIGGER AS $$
DECLARE
  report_count integer;
  author_id uuid;
BEGIN
  SELECT COUNT(*) INTO report_count FROM reports WHERE comment_id = NEW.comment_id;
  IF report_count >= 3 THEN
    UPDATE point_comments SET is_blind = true WHERE id = NEW.comment_id;
    SELECT user_id INTO author_id FROM point_comments WHERE id = NEW.comment_id;
    IF author_id IS NOT NULL THEN
      UPDATE user_profiles SET is_banned = true WHERE id = author_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_report_inserted ON reports;
CREATE TRIGGER on_comment_report_inserted
  AFTER INSERT ON reports
  FOR EACH ROW WHEN (NEW.comment_id IS NOT NULL)
  EXECUTE FUNCTION check_and_blind_comment();