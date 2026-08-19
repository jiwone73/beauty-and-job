-- 포트폴리오를 PDF 한 개에서 사진 여러 장으로 바꾼다.
--
-- 미용사에게 PDF를 만들라는 것 자체가 문턱이었다. 시술 사진은 폰 앨범에 있는데
-- 그걸 묶는 단계를 요구했다. 사진을 그대로 올리게 하면 문턱이 사라지고,
-- 브라우저에서 압축해 올리므로 한 사람당 용량도 5MB에서 1MB 남짓으로 준다.
--
-- 순서가 있는 짧은 목록이라 표를 따로 두지 않고 jsonb 로 담는다
-- (job_postings.work_locations 와 같은 방식).
--   [{ "url": "...", "w": 1080, "h": 1440 }]
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_images jsonb;
