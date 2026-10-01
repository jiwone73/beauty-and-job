-- 무료 공고의 게재기간(listed_until)이 끝났을 때 "노출이 종료됐다"는 알림을
-- 한 번만 보내기 위한 표시. 재등록(다시 걸기)해서 listed_until이 새로 잡히면
-- 이 값을 NULL로 되돌려, 다음에 또 끝났을 때 다시 알림이 가게 한다.
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS exposure_notified_at timestamptz;
