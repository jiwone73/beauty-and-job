-- 매장 복리후생 태그에 '월8일 휴무' 추가(매장만).
-- 살롱 현장은 주 단위보다 "월 8일 휴무"처럼 한 달 기준으로 휴무를 약속하는
-- 채용공고가 흔하다. '주5일 근무'(BOTH)·'주말·공휴일 휴무'(STORE)와는 별개 표현.
-- 멱등: 있으면 그대로, 없으면 새로 넣는다.

INSERT INTO benefit_tags (name, job_type, is_curated)
VALUES
  ('월8일 휴무', 'STORE', true)
ON CONFLICT (name, job_type) DO NOTHING;
