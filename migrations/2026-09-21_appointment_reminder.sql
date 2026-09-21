-- 확정된 면접 약속이 다가오면 리마인드 알림을 보낸다.
-- 크론이 하루 한 번 도는데 같은 약속에 두 번 보내면 안 되니 보낸 시각을 남겨 둔다.
ALTER TABLE proposal_messages ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;
ALTER TYPE notif_type ADD VALUE IF NOT EXISTS 'APPT_SOON';
