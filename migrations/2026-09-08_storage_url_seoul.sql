-- 저장된 파일 주소를 서울 프로젝트로 바꾼다.
--
-- 파일은 이름과 경로를 그대로 옮겼지만, 공고·이력서에 적힌 주소에는 옛 프로젝트
-- 이름(upbwhfppkrdhzijhghsb)이 박혀 있다. 그 부분만 갈아 끼운다.
--   .../upbwhfppkrdhzijhghsb.supabase.co/storage/...  →  .../iglvjgyjanvxeyuqurko.supabase.co/storage/...
--
-- v_active_jobs 는 뷰라 밑의 표만 고치면 따라온다.

BEGIN;

UPDATE companies    SET cover_images     = replace(cover_images::text,     'upbwhfppkrdhzijhghsb', 'iglvjgyjanvxeyuqurko')::jsonb
 WHERE cover_images::text LIKE '%upbwhfppkrdhzijhghsb%';
UPDATE companies    SET signboard_url    = replace(signboard_url,          'upbwhfppkrdhzijhghsb', 'iglvjgyjanvxeyuqurko')
 WHERE signboard_url LIKE '%upbwhfppkrdhzijhghsb%';

UPDATE job_postings SET cover_images     = replace(cover_images::text,     'upbwhfppkrdhzijhghsb', 'iglvjgyjanvxeyuqurko')::jsonb
 WHERE cover_images::text LIKE '%upbwhfppkrdhzijhghsb%';
UPDATE job_postings SET detail_images    = replace(detail_images::text,    'upbwhfppkrdhzijhghsb', 'iglvjgyjanvxeyuqurko')::jsonb
 WHERE detail_images::text LIKE '%upbwhfppkrdhzijhghsb%';

UPDATE users        SET avatar_url       = replace(avatar_url,             'upbwhfppkrdhzijhghsb', 'iglvjgyjanvxeyuqurko')
 WHERE avatar_url LIKE '%upbwhfppkrdhzijhghsb%';
UPDATE users        SET portfolio_images = replace(portfolio_images::text, 'upbwhfppkrdhzijhghsb', 'iglvjgyjanvxeyuqurko')::jsonb
 WHERE portfolio_images::text LIKE '%upbwhfppkrdhzijhghsb%';

-- 지원서 스냅샷. 지원한 그때의 이력서를 통째로 담고 있어 사진 주소도 들어 있다.
UPDATE applications SET resume_snapshot  = replace(resume_snapshot::text,  'upbwhfppkrdhzijhghsb', 'iglvjgyjanvxeyuqurko')::jsonb
 WHERE resume_snapshot::text LIKE '%upbwhfppkrdhzijhghsb%';

COMMIT;
