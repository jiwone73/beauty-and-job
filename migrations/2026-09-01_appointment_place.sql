-- 면접 약속에 장소를 붙인다.
--
-- 언제만 있고 어디가 없었다. 미용실은 지점이 여럿인 브랜드가 많아 '리안헤어'만으로는
-- 어느 지점인지 모른다. 기본값은 그 공고에 적힌 근무지이고, 다른 데서 보기로 했으면
-- 고쳐 쓸 수 있다.
ALTER TABLE proposal_messages ADD COLUMN IF NOT EXISTS appointment_place TEXT;
