-- ===========================================================
-- 뷰티워크 · 비회원(외부) 컨택 대상 업체 리스트 (아웃리치/영업 관리대장)
-- 엑셀 "채용공고 등록 DB 정리본"을 인앱 온라인 DB로 이관.
--   흐름: 리스트 확보 → (업데이트: 9개 채용사이트 조회로 채용유무 자동확인)
--         → 컨택(연락처/이메일/메모) → 비회원 공고 등록(등록유무)
--   · is_hiring      : 채용중 | 없음 | 확인필요 | 미확인  (업데이트 버튼이 자동 갱신)
--   · is_registered  : 미등록 | 등록완료 | 보류         (관리자 수동)
--   · found_jobs      : 채용사이트 조회 결과 [{source,title,url,idx}]
-- Supabase SQL Editor에서 실행. (멱등)
-- ===========================================================

CREATE TABLE IF NOT EXISTS target_companies (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name     text NOT NULL,                    -- 헤어샵/메이크업/네일&속눈썹/스킨&바디케어/두피&탈모/리테일&커머스
  seq            int,                               -- 원본 엑셀 번호
  brand_name     text NOT NULL,                     -- 브랜드/샵명
  category       text,                              -- 서브카테고리·운영사 형태
  homepage       text,                              -- 홈페이지 URL
  is_hiring      text NOT NULL DEFAULT '미확인',     -- 채용중 | 없음 | 확인필요 | 미확인
  is_registered  text NOT NULL DEFAULT '미등록',     -- 미등록 | 등록완료 | 보류
  phone          text,                              -- 연락처
  email          text,                              -- 이메일
  scale          text,                              -- 네트워크 형태·규모
  features       text,                              -- 주요 특징·컨셉
  note           text,                              -- 관리자 메모(컨택 이력)
  found_jobs     jsonb NOT NULL DEFAULT '[]'::jsonb, -- 채용사이트 조회 결과
  found_count    int NOT NULL DEFAULT 0,            -- 조회된 활성 공고 수
  last_checked_at timestamptz,                      -- 채용유무 마지막 조회 시각
  linked_company_id uuid,                           -- 등록된 비회원 기업(companies)과 연결(선택)
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_target_companies_group  ON target_companies(group_name);
CREATE INDEX IF NOT EXISTS idx_target_companies_brand  ON target_companies(brand_name);
CREATE INDEX IF NOT EXISTS idx_target_companies_hiring ON target_companies(is_hiring);
CREATE INDEX IF NOT EXISTS idx_target_companies_reg    ON target_companies(is_registered);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_target_companies_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_target_companies_updated_at ON target_companies;
CREATE TRIGGER trg_target_companies_updated_at
  BEFORE UPDATE ON target_companies
  FOR EACH ROW EXECUTE FUNCTION set_target_companies_updated_at();
