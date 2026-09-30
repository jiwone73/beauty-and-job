-- 런칭(10/12) 전 알바 테스트용으로 만드는 계정을 표시해 둔다.
--
-- is_sample 은 재활용하면 안 된다 — 그 플래그가 붙은 행은 추천·검색 등 공개
-- 화면에서 일부러 숨겨지도록 짜여 있어(v_active_jobs, jobs API 등), 알바가
-- 실제 흐름처럼 보려면 is_member=true 로 정상 노출돼야 한다. 그래서 별도
-- 플래그를 둔다 — 런칭 직전엔 이 컬럼 하나로 전부 걸러 지운다.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN companies.is_test_account IS '런칭 전 알바 테스트용 계정(실제 회사명을 빌린 내부 테스트 로그인) — 10/12 전 전량 삭제 대상';
COMMENT ON COLUMN users.is_test_account IS '런칭 전 알바 테스트용 계정 — 10/12 전 전량 삭제 대상';
