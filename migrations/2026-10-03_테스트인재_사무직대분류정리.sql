-- 사무직 테스트 인재(btwk2026+uo*)의 대분류 칸에 소분류 이름이 들어 있던 것을, 현재 직군 목록(lib/data/jobGroups.ts)이
-- 정한 대분류로 채운다. 소분류 → 대분류는 목록에 이미 정해져 있어 임의로 고르는 값이 없다.
-- 이 파일은 그 목록에서 만든 (소분류, 대분류) 짝으로 실행했다(생성 스크립트: 작업 기록). 짝은 아래 VALUES 와 같다.
-- 실제 가입자는 건드리지 않는다(이메일이 btwk2026+uo 로 시작하는 테스트 계정만).

BEGIN;
UPDATE user_profiles up SET main_job_group = '기획·MD' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '뷰티 MD(H&B·이커머스·글로벌)' AND up.main_job_group = '뷰티 MD(H&B·이커머스·글로벌)';
UPDATE user_profiles up SET main_job_group = '경영지원·HR' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '뷰티 HR PM·잡매니저' AND up.main_job_group = '뷰티 HR PM·잡매니저';
UPDATE user_profiles up SET main_job_group = '마케팅·콘텐츠' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '뷰티 인플루언서·크리에이터' AND up.main_job_group = '뷰티 인플루언서·크리에이터';
UPDATE user_profiles up SET main_job_group = '마케팅·콘텐츠' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '뷰티 영상 PD·크리에이티브 디렉터' AND up.main_job_group = '뷰티 영상 PD·크리에이티브 디렉터';
UPDATE user_profiles up SET main_job_group = '마케팅·콘텐츠' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '라이브 커머스 호스트·쇼호스트' AND up.main_job_group = '라이브 커머스 호스트·쇼호스트';
UPDATE user_profiles up SET main_job_group = '마케팅·콘텐츠' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '해외 의료 마케터·바이어 영업' AND up.main_job_group = '해외 의료 마케터·바이어 영업';
UPDATE user_profiles up SET main_job_group = '영업·유통' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '영업 매니저(국내유통·면세·해외수출)' AND up.main_job_group = '영업 매니저(국내유통·면세·해외수출)';
UPDATE user_profiles up SET main_job_group = '연구·생산' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '화장품 연구원(R&D)' AND up.main_job_group = '화장품 연구원(R&D)';
UPDATE user_profiles up SET main_job_group = '연구·생산' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '제조·생산 관리(QA·QC)' AND up.main_job_group = '제조·생산 관리(QA·QC)';
UPDATE user_profiles up SET main_job_group = '디자인' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = 'VMD·매장 디스플레이 디자이너' AND up.main_job_group = 'VMD·매장 디스플레이 디자이너';
UPDATE user_profiles up SET main_job_group = '서비스기획·개발' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '뷰티 플랫폼 기획·개발' AND up.main_job_group = '뷰티 플랫폼 기획·개발';
UPDATE user_profiles up SET main_job_group = '교육' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '브랜드 에듀케이터' AND up.main_job_group = '브랜드 에듀케이터';
UPDATE user_profiles up SET main_job_group = '교육' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '교육 콘텐츠 기획' AND up.main_job_group = '교육 콘텐츠 기획';
UPDATE user_profiles up SET main_job_group = '경영지원·HR' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '경영지원(인사·재무·기획)' AND up.main_job_group = '경영지원(인사·재무·기획)';
UPDATE user_profiles up SET main_job_group = '경영지원·HR' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '뷰티 전문 헤드헌터' AND up.main_job_group = '뷰티 전문 헤드헌터';
UPDATE user_profiles up SET main_job_group = '기획·MD' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '브랜드 매니저(BM)·상품기획' AND up.main_job_group = '브랜드 매니저(BM)·상품기획';
UPDATE user_profiles up SET main_job_group = '영업·유통' FROM users u WHERE u.id = up.user_id AND u.email LIKE 'btwk2026+uo%' AND up.sub_job = '해외 유통·바이어 영업(수출)' AND up.main_job_group = '해외 유통·바이어 영업(수출)';
COMMIT;
