-- 「발 관리사(풋케어)」를 「문제성 네일 손발톱 관리사」로 합친다.
--
-- 발 관리사를 스킨 & 바디케어에 따로 세웠는데, 네일 & 속눈썹의 「문제성 네일
-- 손발톱 관리사」가 이름에 이미 '발톱'을 달고 있어 같은 사람을 두 군데서 고를 수
-- 있게 됐다. 분류표에도 손발톱 하나뿐이고, 실제로 발관리 전문샵은 내성발톱·각질·
-- 굳은살을 다 한다. 나눌 이유가 없다.

UPDATE job_postings  SET categories       = array_replace(categories,       '발 관리사(풋케어)', '문제성 네일 손발톱 관리사') WHERE '발 관리사(풋케어)' = ANY(categories);
UPDATE user_profiles SET skill_areas      = array_replace(skill_areas,      '발 관리사(풋케어)', '문제성 네일 손발톱 관리사') WHERE '발 관리사(풋케어)' = ANY(skill_areas);
UPDATE user_profiles SET office_job_areas = array_replace(office_job_areas, '발 관리사(풋케어)', '문제성 네일 손발톱 관리사') WHERE '발 관리사(풋케어)' = ANY(office_job_areas);
