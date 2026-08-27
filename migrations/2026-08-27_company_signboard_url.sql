-- 매장 헤더 아바타용 "간판 사진". 매장은 로고 파일이 없는 경우가 많아
-- 대신 헤더/아바타에 매장명을 확인할 수 있는 간판 사진을 선택적으로 올린다.
-- 없으면 기존처럼 공고 배너 이미지로 대체된다(app/api/company/me/route.ts thumb_url).
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS signboard_url text;
