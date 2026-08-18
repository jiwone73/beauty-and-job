-- 외부업체의 인스타 계정을 담을 칸.
--
-- 매장 구인글은 채용 사이트보다 인스타에 먼저 올라오는 일이 잦다.
-- 그런데 인스타 계정을 적을 자리가 없어, 홈페이지 칸에 인스타 주소를 넣어 둔 곳이 20곳 있었다.
-- 홈페이지와 인스타는 다른 것이므로 칸을 나눈다.
--
-- 값은 주소가 아니라 핸들(예: junohair_dongtan)만 저장한다.
-- 주소는 화면에서 만들어 붙이면 되고, 핸들로 두면 표에서 눈에 잘 들어온다.
ALTER TABLE target_companies ADD COLUMN IF NOT EXISTS instagram text;

-- 홈페이지 칸에 들어와 있던 인스타 주소를 옮긴다.
--   https://www.instagram.com/goldennail_company/ → goldennail_company
UPDATE target_companies
   SET instagram = NULLIF(
         regexp_replace(
           regexp_replace(homepage, '^.*instagram\.com/', '', 'i'),  -- 앞의 주소부 제거
           '[/?#].*$', ''                                            -- 뒤의 슬래시·쿼리 제거
         ), ''),
       homepage = NULL
 WHERE homepage ILIKE '%instagram.com%'
   AND COALESCE(instagram, '') = '';
