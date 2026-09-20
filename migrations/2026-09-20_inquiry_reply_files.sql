-- 답변 메일에 붙인 첨부도 남긴다.
--
-- 문의 첨부(inquiry_files)는 지금까지 "문의 온 글"의 파일만 담았다. 관리자가
-- 답장 보낼 때 붙인 파일은 메일로만 나가고 여기엔 안 남아, 답변한 문의를
-- 다시 열어도 그때 뭘 같이 보냈는지 알 수 없었다. 갈래를 늘려 답변 첨부도
-- 같은 표, 같은 버킷에 담는다.
ALTER TABLE inquiry_files DROP CONSTRAINT IF EXISTS inquiry_files_kind_check;
ALTER TABLE inquiry_files ADD CONSTRAINT inquiry_files_kind_check
  CHECK (kind IN ('support', 'ad', 'report', 'support_reply', 'ad_reply'));
