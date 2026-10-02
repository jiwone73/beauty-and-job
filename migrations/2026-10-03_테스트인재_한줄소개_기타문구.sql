-- 테스트 인재 8명의 한줄소개 「기타 분야에서 …」 의 「기타」를 새로 정한 소분류 이름으로 바꾼다
-- (직군은 2026-10-03_테스트인재_기타직군정리.sql 에서 바꿨다). 「기타는 절대 있어서는 안되」.
BEGIN;
UPDATE user_profiles
   SET intro = replace(intro, '기타 분야에서', sub_job || ' 분야에서')
 WHERE intro LIKE '기타 분야에서%' AND sub_job IS NOT NULL AND sub_job <> '';
COMMIT;
