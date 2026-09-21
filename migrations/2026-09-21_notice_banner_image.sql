-- 공지·이벤트 상단에 거는 배너 그림.
--
-- 지금까지 본문은 순수 글자만 담았다. 오픈 이벤트처럼 그림 한 장으로 다
-- 말하는 배너가 생기면서, 그 그림을 본문 위에 고정으로 얹을 자리가
-- 필요해졌다. 비어 있으면 원래대로 글자만 보여준다.
ALTER TABLE notices ADD COLUMN IF NOT EXISTS banner_image_url text;
COMMENT ON COLUMN notices.banner_image_url IS '본문 위에 거는 배너 그림 경로. 비면 그림 없이 글자만 보여준다';
