-- 문의에 파일을 붙일 수 있게 한다.
--
-- 여태는 어느 문의 폼에도 첨부가 없었다. 관리자가 답장 보낼 때 파일을 붙이는
-- 자리만 있었고 그건 메일에만 실려 나가고 남지 않았다. 그래서 「첨부 있음」을
-- 표에 보이려 해도 볼 값 자체가 없었다.
--
-- 1:1 문의(inquiries)와 사업문의(ad_inquiries) 둘이 쓰므로 한 표에 모으고
-- 어느 쪽 것인지를 갈래로 적는다. 파일은 비공개 버킷(inquiry-files)에 두고
-- 여기에는 그 안의 경로만 적는다 — 주소를 아는 사람이 바로 열지 못한다.
CREATE TABLE IF NOT EXISTS inquiry_files (
  id          bigserial PRIMARY KEY,
  kind        text   NOT NULL CHECK (kind IN ('support', 'ad')),
  inquiry_id  bigint NOT NULL,
  path        text   NOT NULL,
  file_name   text   NOT NULL,
  file_size   int    NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

-- 문의 하나를 열 때마다 그 문의의 파일만 골라 온다.
CREATE INDEX IF NOT EXISTS inquiry_files_owner_idx ON inquiry_files (kind, inquiry_id);
