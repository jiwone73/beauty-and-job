-- 공고마다 "뷰티워크 보고 연락드립니다" 한마디를 붙일지 고른다.
-- 전화로 지원받는 매장이 많은데, 받는 쪽은 어느 공고를 보고 온 전화인지 모른다.
-- 여러 곳에 공고를 올린 매장일수록 그렇다.
-- 컬럼 기본값은 꺼짐 — 이미 올라가 있는 공고에 문구가 새로 달리면 안 된다.
-- 새로 쓰는 공고는 등록 화면에서 켜진 채로 시작한다.

ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS mention_source boolean NOT NULL DEFAULT false;
