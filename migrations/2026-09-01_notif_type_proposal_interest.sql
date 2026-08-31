-- 제안에 「관심 있어요」를 누르면 기업에 알림이 간다. notif_type 은 enum 이라
-- 값을 먼저 넣어야 INSERT 가 통과한다.
-- 멱등: 이미 있으면 아무 일도 하지 않는다.

ALTER TYPE notif_type ADD VALUE IF NOT EXISTS 'PROPOSAL_INTEREST';
