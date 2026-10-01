-- 기업용 "추천 인재 메일" 토글이 구직자용 "추천 채용공고" 동의 문서(RECOMMENDATION)를
-- 그대로 재사용하고 있었다("3번은 구직자 페이지에 있어야 하는 내용아냐?") — 실제 회사
-- 4곳이 "추천 채용공고 알림 수신 동의"라는, 자신과 무관한 문구에 동의한 것으로 기록돼
-- 있었다. 기업 전용 동의 문서를 새로 만들어 분리한다.
ALTER TYPE term_type ADD VALUE IF NOT EXISTS 'TALENT_RECOMMEND';
