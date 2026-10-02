-- 테스트 인재 8명(btwk2026+us12·24·36·48·60·72·84·96)의 직군 「기타」를 현재 직군 체계의 값으로 바꾼다.
--
-- 「기타」는 지금 직군 목록(lib/data/jobGroups.ts)에 없는 옛 직종 이름이라 이력서·인재검색·추천 어디에도 걸리지
-- 않는다. 선택창에는 없어서 실제 가입자는 고를 수 없고, 9월 말 테스트 계정 100개를 만들 때 들어간 값이다
-- ("임의로 정하라고. 샘플인데."). 대분류·소분류·직군을 정식 이름으로 임의 배정한다.

BEGIN;

UPDATE user_profiles up SET main_job_group = v.대, sub_job = v.소, skill_areas = ARRAY[v.소]
  FROM users u,
       (VALUES
         ('btwk2026+us12@gmail.com', '헤어·바버',   '헤어디자이너'),
         ('btwk2026+us24@gmail.com', '헤어·바버',   '헤어스탭'),
         ('btwk2026+us36@gmail.com', '메이크업',     '메이크업 아티스트'),
         ('btwk2026+us48@gmail.com', '네일·속눈썹',  '네일 아티스트'),
         ('btwk2026+us60@gmail.com', '네일·속눈썹',  '속눈썹·반영구 아티스트'),
         ('btwk2026+us72@gmail.com', '피부·바디',    '피부 관리사(일반·경락)'),
         ('btwk2026+us84@gmail.com', '두피·탈모',    '두피 관리사'),
         ('btwk2026+us96@gmail.com', '헤어·바버',    '바버(Barber)')
       ) AS v(email, 대, 소)
 WHERE u.id = up.user_id AND u.email = v.email AND '기타' = ANY(up.skill_areas);

COMMIT;
