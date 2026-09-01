-- 저장된 직군 값을 지금 분류표(2026.08.02)로 강제 정렬한다.
--
-- 직군 이름을 분류표에 맞추면서 저장된 값을 안 옮겨, 공고 59%·이력서 86%가
-- 목록 밖 값으로 남아 있었다. 그 상태로는 직군 필터에 걸리지 않는다.
--
-- 짝이 분명한 것만 옮긴다. 분류표에 자리가 없는 값(애견 미용, 본사 공통 경영지원
-- 계열)은 손대지 않는다 — 억지로 가까운 데 밀어 넣으면 나중에 되돌릴 수 없다.

DO $$
DECLARE
  짝 text[][] := ARRAY[
    -- 이름만 바뀐 것
    ['헤어스탭',                     '헤어 스탭(시니어·주니어)'],
    ['헤어디자이너',                 '헤어 디자이너'],
    ['바버(이용)',                   '바버(Barber)'],
    ['피부관리사(에스테티션)',       '피부 관리사(일반·경락)'],
    ['바디·체형 관리',               '바디 테라피스트·체형 관리사'],
    ['네일스탭·인턴',                '네일 스탭·인턴'],
    ['왁싱',                         '왁싱·제모 전문가'],
    ['웨딩·방송 메이크업',           '프로필·방송 메이크업 아티스트'],
    -- 뜻이 같은 것으로 모으기
    ['속눈썹 연장',                  '속눈썹·반영구 아티스트'],
    ['반영구 화장(눈썹·아이라인·입술)', '속눈썹·반영구 아티스트'],
    ['젤·패디큐어 전문',             '네일 아티스트'],
    ['샵 매니저·실장',               '매장 점장·샵마스터(직영)'],
    ['샵매니저',                     '매장 점장·샵마스터(직영)'],
    ['매니저',                       '매장 점장·샵마스터(직영)'],
    ['뷰티 어드바이저(BA)·화장품 판매', '로드숍 매니저·부매니저'],
    ['파트너',                       '헤어 스탭(시니어·주니어)'],
    -- 본사
    ['상품기획(제품기획)',           '브랜드 매니저(BM)·상품기획'],
    ['상품기획',                     '브랜드 매니저(BM)·상품기획'],
    ['브랜드 마케팅',                '브랜드 매니저(BM)·상품기획'],
    ['MD(머천다이징)',               '뷰티 MD(H&B·이커머스·글로벌)'],
    ['온라인·이커머스 영업',         '뷰티 MD(H&B·이커머스·글로벌)'],
    ['국내영업(H&B·백화점·면세)',    '영업 매니저(국내유통·면세·해외수출)'],
    ['화장품 연구개발(처방·제형)',   '화장품 연구원(R&D)'],
    ['품질관리(QC·QA)·인허가(RA)',   '제조·생산 관리(QA·QC)'],
    ['생산관리·SCM',                 '제조·생산 관리(QA·QC)'],
    ['콘텐츠·SNS·인플루언서',        '뷰티 인플루언서·크리에이터'],
    ['퍼포먼스·디지털 마케팅',       '뷰티 플랫폼 기획·개발'],
    ['패키지·제품 디자인',           'VMD·매장 디스플레이 디자이너'],
    ['그래픽·웹 디자인',             'VMD·매장 디스플레이 디자이너']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(짝, 1) LOOP
    UPDATE job_postings  SET categories       = array_replace(categories,       짝[i][1], 짝[i][2]) WHERE 짝[i][1] = ANY(categories);
    UPDATE user_profiles SET skill_areas      = array_replace(skill_areas,      짝[i][1], 짝[i][2]) WHERE 짝[i][1] = ANY(skill_areas);
    UPDATE user_profiles SET office_job_areas = array_replace(office_job_areas, 짝[i][1], 짝[i][2]) WHERE 짝[i][1] = ANY(office_job_areas);
  END LOOP;
END $$;

-- 같은 값이 두 번 들어간 경우 정리(예: '속눈썹 연장'과 '반영구 화장'이 한 줄에 다 있던 것).
UPDATE job_postings SET categories = (SELECT array_agg(DISTINCT v) FROM unnest(categories) v)
 WHERE array_length(categories, 1) > 1;
UPDATE user_profiles SET skill_areas = (SELECT array_agg(DISTINCT v) FROM unnest(skill_areas) v)
 WHERE array_length(skill_areas, 1) > 1;
UPDATE user_profiles SET office_job_areas = (SELECT array_agg(DISTINCT v) FROM unnest(office_job_areas) v)
 WHERE array_length(office_job_areas, 1) > 1;
