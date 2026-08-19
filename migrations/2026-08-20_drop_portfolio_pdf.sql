-- 포트폴리오를 사진 여러 장(portfolio_images)으로 옮기면서 PDF 한 개를 가리키던
-- 칸이 남았다. 실제 데이터가 하나도 없어 옮길 것이 없다.
ALTER TABLE users DROP COLUMN IF EXISTS portfolio_url;
ALTER TABLE users DROP COLUMN IF EXISTS portfolio_filename;
