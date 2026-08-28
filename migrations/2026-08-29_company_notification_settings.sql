-- 기업 알림설정. 지금 기업에게 실제로 가는 알림은 '새 지원자' 하나뿐이라
-- 칸도 그 하나로 시작한다. 빈 객체면 모두 기본값(켜짐)으로 읽는다.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS notification_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
