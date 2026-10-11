/*
# 낚시 앱 데이터베이스 스키마 (Fishing App Schema)

1. 목적
   - 한국 낚시꾼을 위한 모바일 낚시 앱의 데이터 저장
   - 조과 일기(잡은 물고기 기록) 저장
   - 선택한 지역 설정 저장

2. 새 테이블
   - `catches` (조과 기록)
     - id (uuid, PK)
     - photo_url (text, 물고기 사진 URL)
     - species (text, 어종명)
     - size_cm (numeric, 물고기 크기 cm)
     - caught_at (date, 낚시 날짜)
     - point (text, 낚시 포인트명)
     - region (text, 지역명)
     - memo (text, 메모)
     - created_at (timestamptz)
   - `app_settings` (앱 설정 - 선택 지역)
     - id (uuid, PK)
     - selected_region (text, 선택한 지역)
     - updated_at (timestamptz)

3. 스토리지
   - `fish-photos` 버킷 생성 (공개 읽기, 인증 쓰기)

4. 보안 (RLS)
   - 싱글 테넌트 앱 (로그인 없음)
   - anon + authenticated 모두 CRUD 가능
   - 모든 데이터는 공개/공유 목적
*/

-- 조과 기록 테이블
CREATE TABLE IF NOT EXISTS catches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url text,
  species text NOT NULL,
  size_cm numeric,
  caught_at date NOT NULL DEFAULT CURRENT_DATE,
  point text,
  region text,
  memo text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE catches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_catches" ON catches;
CREATE POLICY "anon_select_catches" ON catches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_catches" ON catches;
CREATE POLICY "anon_insert_catches" ON catches FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_catches" ON catches;
CREATE POLICY "anon_update_catches" ON catches FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_catches" ON catches;
CREATE POLICY "anon_delete_catches" ON catches FOR DELETE
  TO anon, authenticated USING (true);

-- 앱 설정 테이블 (선택 지역 저장)
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selected_region text NOT NULL DEFAULT '태안',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON app_settings;
CREATE POLICY "anon_select_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON app_settings;
CREATE POLICY "anon_insert_settings" ON app_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON app_settings;
CREATE POLICY "anon_update_settings" ON app_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON app_settings;
CREATE POLICY "anon_delete_settings" ON app_settings FOR DELETE
  TO anon, authenticated USING (true);

-- 기본 설정 행 삽입
INSERT INTO app_settings (id, selected_region)
SELECT gen_random_uuid(), '태안'
WHERE NOT EXISTS (SELECT 1 FROM app_settings);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_catches_caught_at ON catches (caught_at DESC);
CREATE INDEX IF NOT EXISTS idx_catches_region ON catches (region);

-- 스토리지 버킷 (물고기 사진)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fish-photos', 'fish-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 스토리지 정책 (공개 읽기, 인증 쓰기)
DROP POLICY IF EXISTS "Public read access on fish-photos" ON storage.objects;
CREATE POLICY "Public read access on fish-photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'fish-photos');

DROP POLICY IF EXISTS "anon upload fish-photos" ON storage.objects;
CREATE POLICY "anon upload fish-photos" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'fish-photos');

DROP POLICY IF EXISTS "anon update fish-photos" ON storage.objects;
CREATE POLICY "anon update fish-photos" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'fish-photos') WITH CHECK (bucket_id = 'fish-photos');

DROP POLICY IF EXISTS "anon delete fish-photos" ON storage.objects;
CREATE POLICY "anon delete fish-photos" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'fish-photos');