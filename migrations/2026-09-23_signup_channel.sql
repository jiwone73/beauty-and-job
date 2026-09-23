-- 유입 경로 자동 분석.
--
-- 일반 검색·SNS는 referrer 도메인만 보고 자동으로 채널을 가른다(네이버 검색,
-- 인스타그램, 카카오톡 등). 광고·이벤트·제휴·문자처럼 성과를 따로 재야 하는
-- 링크는 UTM(utm_source·utm_medium·utm_campaign)을 달아 두면 그 값이 앞선다
-- — 어느 캠페인인지까지 갈라 봐야 하기 때문이다.
--
-- site_visits 는 방문자(visitor_key)·날짜별로 한 줄씩 쌓인다. 채널은 그날의
-- 첫 핑(INSERT) 때만 적고 이후 같은 날 재방문(UPDATE)에는 손대지 않는다 —
-- 가입 시점의 진짜 유입 경로는 그 방문자의 가장 이른 날짜 줄을 보면 된다.
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS utm_campaign text;
COMMENT ON COLUMN site_visits.channel IS '그날 첫 핑에서 가른 유입 채널 — UTM 있으면 UTM 기준, 없으면 referrer 기준';
COMMENT ON COLUMN site_visits.utm_campaign IS '광고·이벤트·제휴·문자 등 캠페인별 성과를 보려고 남기는 원본 utm_campaign 값';

-- 가입 시점의 유입 채널을 회원 자신에게도 옮겨 적는다 — site_visits 는 날짜별로
-- 계속 쌓여 나중에 지워지거나 합쳐질 수 있지만, 가입 채널은 그 사람에게 영영
-- 붙어 있어야 「이 채널에서 실제로 몇 명 가입했나」를 뒤늦게도 셀 수 있다.
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_channel text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_campaign text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS signup_channel text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS signup_campaign text;
COMMENT ON COLUMN users.signup_channel IS '가입 당시 유입 채널(네이버 검색·인스타그램·카카오톡·UTM 라벨 등). 이전 가입자는 비어 있다';
COMMENT ON COLUMN companies.signup_channel IS '가입 당시 유입 채널. 이전 가입자는 비어 있다';
