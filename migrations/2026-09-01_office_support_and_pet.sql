-- 남아 있던 목록 밖 값 넷을 정리한다.
--
-- · 인사·재무·기획 → 「경영지원(인사·재무·기획)」. 화장품 회사도 이 사람들을
--   뽑는데 분류표에 자리가 없어 떠 있었다. 뷰티 제조·OEM·ODM 아래에 세운다.
-- · 애견 미용 → 뷰티워크가 다루지 않는 업종이라 직군 값에서 뺀다. 공고 자체는
--   두되 직군만 비운다 — 지우는 것은 다른 판단이라 여기서 하지 않는다.

UPDATE job_postings  SET categories       = array_replace(categories,       '경영기획·전략',    '경영지원(인사·재무·기획)') WHERE '경영기획·전략'    = ANY(categories);
UPDATE job_postings  SET categories       = array_replace(categories,       '재무·회계·법무',   '경영지원(인사·재무·기획)') WHERE '재무·회계·법무'   = ANY(categories);
UPDATE job_postings  SET categories       = array_replace(categories,       '인사·총무',        '경영지원(인사·재무·기획)') WHERE '인사·총무'        = ANY(categories);
UPDATE user_profiles SET office_job_areas = array_replace(office_job_areas, '경영기획·전략',    '경영지원(인사·재무·기획)') WHERE '경영기획·전략'    = ANY(office_job_areas);
UPDATE user_profiles SET office_job_areas = array_replace(office_job_areas, '재무·회계·법무',   '경영지원(인사·재무·기획)') WHERE '재무·회계·법무'   = ANY(office_job_areas);
UPDATE user_profiles SET office_job_areas = array_replace(office_job_areas, '인사·총무',        '경영지원(인사·재무·기획)') WHERE '인사·총무'        = ANY(office_job_areas);

UPDATE job_postings  SET categories       = array_remove(categories,       '애견 미용사(그루머)') WHERE '애견 미용사(그루머)' = ANY(categories);
UPDATE user_profiles SET skill_areas      = array_remove(skill_areas,      '애견 미용사(그루머)') WHERE '애견 미용사(그루머)' = ANY(skill_areas);

-- 중복 정리(경영기획·재무·인사를 함께 적어 둔 경우 한 줄로 합쳐진다).
UPDATE job_postings SET categories = (SELECT array_agg(DISTINCT v) FROM unnest(categories) v) WHERE array_length(categories,1) > 1;
UPDATE user_profiles SET office_job_areas = (SELECT array_agg(DISTINCT v) FROM unnest(office_job_areas) v) WHERE array_length(office_job_areas,1) > 1;

-- 칸이 뒤바뀌어 들어간 것들. 본사 직군이 매장 칸(skill_areas)에, 애견이 본사 칸에
-- 저장돼 있었다 — 예전 화면이 한쪽 칸에 몰아 넣던 흔적이다. 같은 규칙을 양쪽에 건다.
UPDATE user_profiles SET skill_areas = array_replace(skill_areas, '경영기획·전략',  '경영지원(인사·재무·기획)') WHERE '경영기획·전략'  = ANY(skill_areas);
UPDATE user_profiles SET skill_areas = array_replace(skill_areas, '재무·회계·법무', '경영지원(인사·재무·기획)') WHERE '재무·회계·법무' = ANY(skill_areas);
UPDATE user_profiles SET skill_areas = array_replace(skill_areas, '인사·총무',      '경영지원(인사·재무·기획)') WHERE '인사·총무'      = ANY(skill_areas);
UPDATE user_profiles SET office_job_areas = array_remove(office_job_areas, '애견 미용사(그루머)') WHERE '애견 미용사(그루머)' = ANY(office_job_areas);

UPDATE user_profiles SET skill_areas = (SELECT array_agg(DISTINCT v) FROM unnest(skill_areas) v) WHERE array_length(skill_areas,1) > 1;
