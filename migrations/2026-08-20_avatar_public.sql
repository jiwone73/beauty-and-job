-- 프로필 사진만 따로 감출 수 있게 한다.
--
-- 얼굴은 경력보다 민감하다. 지금 일하는 매장에 이직 준비가 알려질까 봐 사진만
-- 빼고 싶은 사람이 있다. 그것 때문에 인재검색을 통째로 닫아 버리면, 본인도
-- 기회를 잃고 매장도 인재를 못 본다.
--
-- 기본은 공개. 이미 사진을 올린 사람은 보이던 대로 두는 것이 덜 놀랍다.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_public boolean NOT NULL DEFAULT true;
