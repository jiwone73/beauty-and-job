-- 본사 대분류를 업종 축에서 직무 축으로 옮긴다.
--
-- 「뷰티 제조·OEM·ODM」처럼 어떤 회사인지로 나눠 두었더니 경영지원 공고가
-- 제조 칩 밑에 숨고 영업이 세 대분류에 흩어졌다. 대분류는 무슨 일을 하는가로
-- 나눈다(lib/data/jobGroups.ts 의 OFFICE_JOB_GROUPS).
--
-- 공고는 소분류 이름을 저장하므로 손대지 않는다. 옮길 것은 구직자가 골라 둔
-- 대분류 30행뿐이다. 옛 대분류에는 여러 직무가 섞여 있었으니 **그 안에서 제일
-- 많던 쪽**으로 보낸다 — 사람이 고른 것을 지우지 않고 가장 가까운 상자에 둔다.
--
-- 되돌릴 값: backups/2026-09-14_본사_대분류_재편_변경전.json

UPDATE user_profiles SET main_job_group = '기획·MD',        updated_at = now()
 WHERE main_job_group = '뷰티 리테일 & 커머스';   -- BM·상품기획 / MD 가 네 자리 중 둘

UPDATE user_profiles SET main_job_group = '연구·생산',      updated_at = now()
 WHERE main_job_group = '뷰티 제조·OEM·ODM';      -- R&D / QA·QC 가 네 자리 중 둘

UPDATE user_profiles SET main_job_group = '마케팅·콘텐츠',  updated_at = now()
 WHERE main_job_group = '뷰티 플랫폼·콘텐츠';     -- 인플루언서·영상PD·라이브커머스가 넷 중 셋

UPDATE user_profiles SET main_job_group = '교육',           updated_at = now()
 WHERE main_job_group = '교육·아카데미';

UPDATE user_profiles SET main_job_group = '경영지원·HR',    updated_at = now()
 WHERE main_job_group = 'HR 서비스';

-- 「의료통역 스페셜리스트」는 없앴다. 뷰티 일이 아니다.
-- 지금 이 값을 쓰는 공고도 이력서도 없어 지우기만 하면 된다(검증 완료).
