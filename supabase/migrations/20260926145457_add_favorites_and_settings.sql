/*
# 즐겨찾기 테이블 + app_settings 컬럼 확장

1. 즐겨찾기 테이블 생성 (point_favorites)
2. app_settings에 wind_unit, notif_tide, notif_community 컬럼 추가
3. RLS: anon + authenticated 모두 CRUD 가능 (no-auth 앱)
*/

-- 즐겨찾기 테이블
CREATE TABLE IF NOT EXISTS point_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id uuid NOT NULL REFERENCES fishing_points(id) ON DELETE CASCADE,
  point_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE point_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_favorites" ON point_favorites FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_favorites" ON point_favorites FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_favorites" ON point_favorites FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_favorites" ON point_favorites FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX idx_favorites_point_id ON point_favorites(point_id);

-- app_settings 컬럼 확장
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS wind_unit text DEFAULT 'm/s';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS notif_tide boolean DEFAULT false;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS notif_community boolean DEFAULT false;