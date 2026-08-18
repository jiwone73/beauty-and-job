-- 네이버 카페에서 찾은 구인글.
--
-- 개인 매장 공고는 채용 사이트가 아니라 지역 카페·직종 커뮤니티에 올라온다.
-- 카페 자체는 크롤링이 막혀 있어(robots 전면 차단) 검색 API 로 '발견'만 한다.
-- 본문·연락처는 사람이 카페에 들어가서 봐야 하므로, 여기 쌓인 것은 '확인할 목록'이다.
--
-- 검색 API 가 글 작성일을 주지 않는다(제목·요약·링크·카페명 넷뿐).
-- 그래서 링크로 중복만 걸러내고, 우리가 처음 본 시각을 first_seen_at 에 남긴다.
CREATE TABLE IF NOT EXISTS cafe_leads (
  link         text PRIMARY KEY,              -- 카페 글 주소 = 중복 판정 기준
  title        text NOT NULL,
  summary      text,                          -- 검색 API 요약(조건·급여가 담겨 오는 편)
  cafe_name    text,
  cafe_url     text,
  keyword      text,                          -- 어떤 검색어로 걸렸는지
  status       text NOT NULL DEFAULT 'NEW',   -- NEW · DONE(등록완료) · SKIP(제외)
  skip_reason  text,
  job_id       uuid,                          -- 등록으로 이어졌으면 그 공고
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cafe_leads_status ON cafe_leads (status, first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_cafe_leads_cafe ON cafe_leads (cafe_name);
