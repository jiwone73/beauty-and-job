-- 인재 프로필의 직군 이름을 지금 체계로 옮긴다.
--
-- 직군을 재편할 때 공고·폼·필터는 새 이름으로 바꿨는데 이력서에 저장된 값은
-- 옛 이름 그대로 남아 있었다. 그래서 인재검색에서 직군을 고르면 아무도 안
-- 걸렸다(104명 중 대분류가 맞는 사람 10명).
--
-- 애견미용은 다루지 않기로 한 직군이라 지운다. 그 사람들은 직군 없이 남고,
-- 다음에 이력서를 손볼 때 다시 고르게 된다 — 없는 직군으로 남겨 두면 영영
-- 검색에 안 걸린다.

BEGIN;

-- 애견미용(3명) — 없앤 직군이라 비운다.
UPDATE user_profiles SET main_job_group = NULL, sub_job = NULL
 WHERE main_job_group = '애견미용';

-- 매장 ─────────────────────────────────────────────
UPDATE user_profiles SET main_job_group = '헤어·바버' WHERE main_job_group = '헤어';
UPDATE user_profiles SET sub_job = '바버(Barber)'      WHERE sub_job = '바버(이용)';
UPDATE user_profiles SET sub_job = '헤어 스텝'          WHERE sub_job = '헤어스탭';

UPDATE user_profiles SET sub_job = '프로필·방송 메이크업 아티스트' WHERE sub_job = '웨딩·방송 메이크업';

UPDATE user_profiles SET main_job_group = '네일·속눈썹' WHERE main_job_group = '네일';
UPDATE user_profiles SET sub_job = '네일 아티스트'      WHERE sub_job = '젤·패디큐어 전문';

-- 속눈썹·왁싱·반영구는 두 곳으로 갈린다. 왁싱은 피부·바디로 옮겼다.
UPDATE user_profiles SET main_job_group = '피부·바디', sub_job = '왁싱·제모 전문가'
 WHERE main_job_group = '속눈썹·왁싱·반영구' AND sub_job = '왁싱';
UPDATE user_profiles SET main_job_group = '네일·속눈썹', sub_job = '속눈썹·반영구 아티스트'
 WHERE main_job_group = '속눈썹·왁싱·반영구';

UPDATE user_profiles SET main_job_group = '피부·바디' WHERE main_job_group = '피부·에스테틱';
UPDATE user_profiles SET sub_job = '바디 테라피스트·체형 관리사' WHERE sub_job = '바디·체형 관리';
UPDATE user_profiles SET sub_job = '피부 관리사(일반·경락)'      WHERE sub_job = '피부관리사(에스테티션)';

-- 매장 운영·판매는 자리에 따라 갈린다.
UPDATE user_profiles SET main_job_group = '샵 운영·상담', sub_job = '샵매니저'
 WHERE main_job_group = '매장 운영·판매' AND sub_job = '샵 매니저·실장';
UPDATE user_profiles SET main_job_group = '뷰티 리테일', sub_job = '로드숍 매니저·부매니저'
 WHERE main_job_group = '매장 운영·판매';

-- 본사 ─────────────────────────────────────────────
UPDATE user_profiles SET main_job_group = '뷰티 리테일 & 커머스', sub_job = '브랜드 매니저(BM)·상품기획'
 WHERE main_job_group IN ('MD·상품기획', '마케팅·브랜드') AND sub_job IN ('상품기획(제품기획)', '브랜드 마케팅');
UPDATE user_profiles SET main_job_group = '뷰티 플랫폼·콘텐츠', sub_job = '뷰티 인플루언서·크리에이터'
 WHERE main_job_group = '마케팅·브랜드' AND sub_job = '콘텐츠·SNS·인플루언서';
UPDATE user_profiles SET main_job_group = '뷰티 리테일 & 커머스', sub_job = 'VMD·매장 디스플레이 디자이너'
 WHERE main_job_group = '디자인·콘텐츠';
UPDATE user_profiles SET main_job_group = '뷰티 제조·OEM·ODM', sub_job = '경영지원(인사·재무·기획)'
 WHERE main_job_group = '경영지원';
UPDATE user_profiles SET main_job_group = '뷰티 제조·OEM·ODM', sub_job = '화장품 연구원(R&D)'
 WHERE main_job_group = '연구개발·생산·품질' AND sub_job = '화장품 연구개발(처방·제형)';
UPDATE user_profiles SET main_job_group = '뷰티 제조·OEM·ODM', sub_job = '제조·생산 관리(QA·QC)'
 WHERE main_job_group = '연구개발·생산·품질';
UPDATE user_profiles SET main_job_group = '뷰티 리테일 & 커머스', sub_job = '영업 매니저(국내유통·면세·해외수출)'
 WHERE main_job_group = '영업·이커머스';

COMMIT;
