-- 매장 SNS 를 개인회원 프로필과 같은 방식으로 — 여러 개를 담는다.
--   [{ "category": "인스타그램", "url": "https://instagram.com/xxx" }, ...]
-- website_url 은 그대로 둔다. 열다섯 곳에서 읽고 있어서, 목록의 첫 링크를 늘
-- 거기에 맞춰 둔다(기존 화면은 손대지 않아도 그대로 돈다).
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;
