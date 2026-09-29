-- 구직자가 제안을 거절할 때 사유를 남길 수 있게 한다.
-- 받은제안 "종료" 탭에서 기업 입장을 보여주는 것과 같은 자리에,
-- 구직자가 왜 거절했는지도 보여주기 위함(선택 입력, 비워 둘 수 있다).
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS decline_reason text;
