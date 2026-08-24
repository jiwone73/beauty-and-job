-- 국적. 살롱 채용에는 외국인 구직자가 적지 않고, 매장은 비자·의사소통 때문에
-- 지원 전에 알아야 한다. 안 밝혀도 되도록 NULL 을 허용한다.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nationality text;
