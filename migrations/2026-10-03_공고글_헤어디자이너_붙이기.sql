-- 공고 제목·본문에 적힌 「헤어 디자이너」를 정식 이름 「헤어디자이너」로 붙인다(사용자 승인, 2026-10-03).
-- 대상: job_postings.title 3건, description 15건. 이전 값은 backups/2026-10-03_공고글_헤어디자이너_이전값.json
BEGIN;
UPDATE job_postings SET title = regexp_replace(title, '헤어\s+디자이너', '헤어디자이너', 'g') WHERE title ~ '헤어\s+디자이너';
UPDATE job_postings SET description = regexp_replace(description, '헤어\s+디자이너', '헤어디자이너', 'g') WHERE description ~ '헤어\s+디자이너';
COMMIT;
