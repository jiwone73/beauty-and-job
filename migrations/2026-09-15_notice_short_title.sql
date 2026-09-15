-- 짧은 제목 — 좁은 자리에 거는 한 줄.
--
-- 이벤트 제목은 혜택을 다 담느라 길어진다(「10월 오픈 기념 · 채용공고
-- 등록하면 라이트 1개월 무료 + 선착순 메인/검색 페이지 상단노출」).
-- 메인 배너처럼 한 줄밖에 없는 자리에서는 그대로 쓰면 두 줄로 넘치거나
-- 잘린다. 자리마다 문구를 따로 박는 대신 짧은 것을 하나 더 들고 있는다.
--
-- 비어 있으면 화면이 title 을 쓴다 — 굳이 둘 다 적을 필요는 없다.

ALTER TABLE notices ADD COLUMN IF NOT EXISTS short_title text;
COMMENT ON COLUMN notices.short_title IS '좁은 자리(메인 배너 등)에 거는 짧은 제목. 비면 title 을 쓴다';
