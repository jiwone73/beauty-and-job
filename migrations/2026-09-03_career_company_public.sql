-- 재직 매장 이름을 가릴 수 있게 한다.
--
-- 뷰티업계는 좁아서 지금 다니는 곳이 드러나는 것이 무서워 이력서를 아예 안
-- 여는 사람이 있다. 이름을 안 적는 길은 열어 두었지만(매장명 선택), 적어 두고
-- 남에게만 가리고 싶은 경우가 따로 있다 — 지원한 곳에는 보여야 하니까.
ALTER TABLE user_careers ADD COLUMN IF NOT EXISTS company_public boolean NOT NULL DEFAULT true;
