-- 탈퇴 상태를 실제로 넣을 수 있게 한다.
--
-- users.withdrawn_at · companies.withdrawn_at 칸도 있고, 탈퇴 API 도
-- status 를 'WITHDRAWN' 으로 바꾸도록 짜여 있고, 관리자 대시보드도 그 값을
-- 세고 있는데, 정작 상태 목록에 그 값이 없었다. 그래서 탈퇴를 누르면
-- 본문 없는 500 이 떨어지고 화면에는 아무 말도 안 떴다 — 나갈 수가 없었다.
-- 개인회원·기업회원 둘 다 같은 병이다.

ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE company_status ADD VALUE IF NOT EXISTS 'WITHDRAWN';
