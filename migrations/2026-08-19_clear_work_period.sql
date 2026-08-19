-- 근무기간을 걷어낸다.
-- 매장 공고는 대부분 상시 근무라 이 칸을 거의 안 적었다(전체 3건). 그런데 그 반열이
-- 복리후생을 좁혀 태그가 여러 줄로 접혔다. 화면에서 뺐으니 남은 값도 비운다.
-- 칼럼은 지우지 않는다 — 되돌릴 여지를 남긴다.
UPDATE job_postings SET work_period = NULL WHERE work_period IS NOT NULL;
