-- 사람이 올린 이슈도 같은 표에 담는다.
--
-- 여태 test_reports 는 클로드 테스트팀만 올렸다. 알바가 사이트를 돌아보다
-- 찾은 것은 담을 자리가 없었다 — 등록 이슈(app_notes)는 공고 원문 주소가
-- 열쇠라 사이트 화면 이슈를 담지 못한다.
--
-- 표를 새로 만들지 않는다. 클로드가 올린 것과 사람이 올린 것이 두 화면으로
-- 갈리면 무엇부터 고쳐야 하는지가 흩어진다. 누가 올렸는지만 적어 둔다.
ALTER TABLE test_reports ADD COLUMN IF NOT EXISTS reported_by text NOT NULL DEFAULT 'claude';

-- 어떤 계정으로 보다 만났는가. 로그인 상태에 따라 화면이 달라지는 곳이 많아
-- 이것이 없으면 재현할 때 갈린다.
ALTER TABLE test_reports ADD COLUMN IF NOT EXISTS as_who text;

-- 어떤 기기·브라우저였는가. 고르게 하지 않고 브라우저가 알려 주는 값을
-- 그대로 적는다 — 매번 고르는 일은 번거롭고, 고르다 틀리면 없느니만 못하다.
ALTER TABLE test_reports ADD COLUMN IF NOT EXISTS env text;

-- 화면 사진은 문의 첨부와 같은 자리(비공개 버킷)에 둔다. 갈래만 늘린다.
ALTER TABLE inquiry_files DROP CONSTRAINT IF EXISTS inquiry_files_kind_check;
ALTER TABLE inquiry_files ADD CONSTRAINT inquiry_files_kind_check
  CHECK (kind IN ('support', 'ad', 'report'));

-- 붙는 곳의 열쇠가 표마다 다르다 — 문의는 bigint, 테스트 리포트는 uuid 다.
-- 숫자 칸에 uuid 를 담을 수 없으므로 글자로 바꾼다. 지금 담긴 파일이 없어
-- 옮길 것도 없다.
ALTER TABLE inquiry_files ALTER COLUMN inquiry_id TYPE text USING inquiry_id::text;
