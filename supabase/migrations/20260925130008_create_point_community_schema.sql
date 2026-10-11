/*
# 낚시 포인트 커뮤니티 스키마 (Fishing Point Community Schema)

1. 목적
   - 지도 탭에서 지역별 낚시 포인트 표시
   - 포인트별 커뮤니티 게시판 (사진, 글, 댓글)

2. 새 테이블
   - `fishing_points` (낚시 포인트)
     - id, name, region, lat, lon, description, fish_types
   - `point_posts` (포인트 게시글)
     - id, point_id(FK), author_name, title, content, photo_url, created_at
   - `point_comments` (댓글)
     - id, post_id(FK), author_name, content, created_at

3. 시드 데이터
   - 부산, 태안, 여수 지역의 낚시 포인트 3~4곳씩
   - 각 포인트에 샘플 게시글 2~3개
   - 일부 게시글에 댓글 1~2개

4. 보안 (RLS)
   - 싱글 테넌트 (로그인 없음)
   - anon + authenticated 모두 CRUD 가능
*/

-- 낚시 포인트 테이블
CREATE TABLE IF NOT EXISTS fishing_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  description text,
  fish_types text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fishing_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_points" ON fishing_points;
CREATE POLICY "anon_select_points" ON fishing_points FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_points" ON fishing_points;
CREATE POLICY "anon_insert_points" ON fishing_points FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_points" ON fishing_points;
CREATE POLICY "anon_update_points" ON fishing_points FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_points" ON fishing_points;
CREATE POLICY "anon_delete_points" ON fishing_points FOR DELETE
  TO anon, authenticated USING (true);

-- 포인트 게시글 테이블
CREATE TABLE IF NOT EXISTS point_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id uuid REFERENCES fishing_points(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '익명 낚시꾼',
  title text NOT NULL,
  content text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE point_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_posts" ON point_posts;
CREATE POLICY "anon_select_posts" ON point_posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_posts" ON point_posts;
CREATE POLICY "anon_insert_posts" ON point_posts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_posts" ON point_posts;
CREATE POLICY "anon_update_posts" ON point_posts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_posts" ON point_posts;
CREATE POLICY "anon_delete_posts" ON point_posts FOR DELETE
  TO anon, authenticated USING (true);

-- 댓글 테이블
CREATE TABLE IF NOT EXISTS point_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES point_posts(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '익명 낚시꾼',
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE point_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_comments" ON point_comments;
CREATE POLICY "anon_select_comments" ON point_comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_comments" ON point_comments;
CREATE POLICY "anon_insert_comments" ON point_comments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_comments" ON point_comments;
CREATE POLICY "anon_delete_comments" ON point_comments FOR DELETE
  TO anon, authenticated USING (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_fishing_points_region ON fishing_points (region);
CREATE INDEX IF NOT EXISTS idx_point_posts_point_id ON point_posts (point_id);
CREATE INDEX IF NOT EXISTS idx_point_comments_post_id ON point_comments (post_id);

-- 시드 데이터: 낚시 포인트
INSERT INTO fishing_points (name, region, lat, lon, description, fish_types) VALUES
-- 부산
('가덕도', '부산', 35.0267, 128.8106, '부산 서쪽 끝 섬, 벵에돔·감성돔 대표 포인트', '벵에돔,감성돔,농어'),
('오륙도', '부산', 35.0750, 129.1267, '부산 남항 앞바다 5개 바위섬, 갯바위 낚시 명소', '벵에돔,볼락,우럭'),
('영도 갯바위', '부산', 35.0767, 129.0406, '영도 끝단 갯바위, 접근성 좋은 도심 낚시 포인트', '벵에돔,감성돔,볼락'),
('태종대', '부산', 35.0556, 129.0861, '영도 태종대 일대, 파도가 세고 대물 기대 가능', '벵에돔,돌돔,긴꼬리벵에돔'),
-- 태안
('몽산포 방파제', '태안', 36.7344, 126.3725, '태안 몽산포 항 방파제, 우럭·광어 좋은 포인트', '우럭,광어,농어'),
('신진도', '태안', 36.7900, 126.3100, '태안 신진도 갯바위, 벵에돔 자원 풍부', '벵에돔,감성돔,농어'),
('안면도 꽂지', '태안', 36.5800, 126.3500, '안면도 남단 갯바위, 수심 깊고 조류 빠름', '벵에돔,감성돔,참돔'),
('원산도', '태안', 36.6500, 126.2200, '태안 원산도 일대, 서해 대표 갯바위 포인트', '벵에돔,광어,우럭'),
-- 여수
('돌산도', '여수', 34.7436, 127.7331, '여수 돌산도 남단, 감성돔 대표 포인트', '감성돔,벵에돔,돌돔'),
('거문도', '여수', 34.6283, 127.7350, '여수 외곽 거문도, 대물 감성돔 명소', '감성돔,벵에돔,돌돔,부시리'),
('향일암 갯바위', '여수', 34.7700, 127.6900, '여수 향일암 일대, 접근 좋고 어종 다양', '벵에돔,감성돔,볼락'),
('적량포 방파제', '여수', 34.7300, 127.6500, '여수 적량포 항 방파제, 가족 낚시 좋음', '우럭,볼락,광어')
ON CONFLICT DO NOTHING;

-- 시드 데이터: 샘플 게시글
INSERT INTO point_posts (point_id, author_name, title, content, photo_url) VALUES
((SELECT id FROM fishing_points WHERE name = '가덕도' AND region = '부산'), '부산낚시왕', '오늘 가덕도 45cm 벵에돔!', '새벽물때에 45cm 벵에돔 올라왔습니다. 수온 18도, 조류 좋았어요. 찌낚시로 채비했습니다.', 'https://images.pexels.com/photos/2897531/pexels-photo-2897531.jpeg?auto=compress&cs=tinysrgb&w=600'),
((SELECT id FROM fishing_points WHERE name = '가덕도' AND region = '부산'), '갯바위꾼', '가덕도 조과 공유 - 감성돔 38cm', '어제 저녁 물때에 감성돔 나왔네요. 크릴 미끼에 3호 목줄 사용했습니다. 파도 약간 있었지만 잡았습니다!', 'https://images.pexels.com/photos/325044/pexels-photo-325044.jpeg?auto=compress&cs=tinysrgb&w=600'),
((SELECT id FROM fishing_points WHERE name = '오륙도' AND region = '부산'), '오륙도헌터', '오륙도 볼락 낚시 후기', '오륙도 방파제에서 볼락 20~25cm급 여러 마리 나왔습니다. 웜 채비 사용, 씨알 좋았어요.', NULL),
((SELECT id FROM fishing_points WHERE name = '몽산포 방파제' AND region = '태안'), '태안꾼', '몽산포 우럭 조과', '몽산포 방파제에서 우럭 30cm급 나왔습니다. 아침 물때가 좋았고, 샤드 채비 사용했습니다.', 'https://images.pexels.com/photos/1630704/pexels-photo-1630704.jpeg?auto=compress&cs=tinysrgb&w=600'),
((SELECT id FROM fishing_points WHERE name = '신진도' AND region = '태안'), '서해낚시', '신진도 벵에돔 좋네요', '신진도 갯바위에서 벵에돔 30~35cm급 여러 마리 나왔습니다. 조류가 살아나면서 입질이 좋았어요.', 'https://images.pexels.com/photos/327510/pexels-photo-327510.jpeg?auto=compress&cs=tinysrgb&w=600'),
((SELECT id FROM fishing_points WHERE name = '돌산도' AND region = '여수'), '여수마스터', '돌산도 감성돔 42cm!', '돌산도 남단 갯바위에서 42cm 감성돔 올라왔습니다. 수심 7m, 조류 빠를 때 집중적으로 입질하더라고요.', 'https://images.pexels.com/photos/1688663/pexels-photo-1688663.jpeg?auto=compress&cs=tinysrgb&w=600'),
((SELECT id FROM fishing_points WHERE name = '거문도' AND region = '여수'), '거문도사나이', '거문도 원정 다녀왔습니다', '거문도 1박2일 원정. 대물 감성돔 48cm 나왔습니다. 수온 16도, 조류 빠르고 수심 깊은 곳이 좋았어요.', 'https://images.pexels.com/photos/1287330/pexels-photo-1287330.jpeg?auto=compress&cs=tinysrgb&w=600'),
((SELECT id FROM fishing_points WHERE name = '향일암 갯바위' AND region = '여수'), '남해안꾼', '향일암 벵에돔 조과', '향일암 갯바위 접근 좋고 벵에돔 잘 나옵니다. 30cm급 3마리 조과. 가족과 함께 가기 좋은 포인트네요.', 'https://images.pexels.com/photos/26326/pexels-photo-26326.jpg?auto=compress&cs=tinysrgb&w=600')
ON CONFLICT DO NOTHING;

-- 시드 데이터: 댓글
INSERT INTO point_comments (post_id, author_name, content) VALUES
((SELECT id FROM point_posts WHERE title = '오늘 가덕도 45cm 벵에돔!' LIMIT 1), '조용한낚시꾼', '와 대박이네요! 채비 자세히 알려주실 수 있나요?'),
((SELECT id FROM point_posts WHERE title = '오늘 가덕도 45cm 벵에돔!' LIMIT 1), '초보낚시', '45cm면 대물이네요 축하드립니다!'),
((SELECT id FROM point_posts WHERE title = '가덕도 조과 공유 - 감성돔 38cm' LIMIT 1), '부산낚시왕', '좋은 조과 축하합니다. 다음엔 저도 가봐야겠어요.'),
((SELECT id FROM point_posts WHERE title = '몽산포 우럭 조과' LIMIT 1), '태안꾼', '몽산포 요즘 우럭 잘 나오나보네요. 시간 될 때 가봐야겠습니다.'),
((SELECT id FROM point_posts WHERE title = '돌산도 감성돔 42cm!' LIMIT 1), '여수마스터', '대물 축하합니다! 수심 7m면 꽤 깊네요.'),
((SELECT id FROM point_posts WHERE title = '거문도 원정 다녀왔습니다' LIMIT 1), '돌산도사나이', '48cm면 진짜 대물이네요. 원정 갈 가치가 있었겠네요!')
ON CONFLICT DO NOTHING;