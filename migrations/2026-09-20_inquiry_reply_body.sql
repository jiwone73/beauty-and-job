-- 답변한 문의 목록에 무슨 답을 보냈는지 보여주려면 보낸 글이 있어야 한다.
-- 여태는 이메일만 나가고 본문은 어디에도 남지 않아, 목록에서는 원래 문의
-- 제목만 되풀이해 보였다 — 실제로 뭐라고 답했는지는 메일함을 뒤져야 알았다.
ALTER TABLE ad_inquiries ADD COLUMN IF NOT EXISTS reply_body text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS reply_body text;
