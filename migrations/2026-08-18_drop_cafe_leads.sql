-- 카페 구인글 수집을 접는다.
-- 카페 글을 목록으로 모아 두기보다 카페에서 직접 보며 붙여넣는 편이 낫다는 판단이라,
-- 화면·수집 크론과 함께 표도 걷어낸다. (걷어낼 당시 1,779건, 등록까지 간 건 0건)
DROP TABLE IF EXISTS cafe_collect_runs;
DROP TABLE IF EXISTS cafe_leads;
