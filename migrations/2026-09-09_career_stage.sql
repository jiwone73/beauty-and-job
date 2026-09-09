-- 본인이 밝힌 경력 단계.
--
-- 인재 검색의 경력 필터는 지금까지 user_careers(경력 이력)에서 계산했다.
-- 이력을 안 쓴 사람은 「신입」으로 잡혔는데, 10년차가 신입으로 뜨는 것은
-- 빈 값이 아니라 틀린 값이라 기업이 그걸 보고 거른다.
--
-- 가입할 때 직군 대분류를 고르면 그에 맞는 사다리가 정해진다
-- (헤어·바버: 인턴·신입·경력·실장 / 본사: 신입·1~2년·3~5년·5~10년·10년+).
-- 거기서 고른 값이 여기 산다. 경력 이력은 그 근거로 남는다.
--
-- 대분류·신입여부(main_job_group, is_entry_level)가 이미 이 표에 살아서
-- 같은 자리에 둔다.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS career_stage TEXT;

COMMENT ON COLUMN user_profiles.career_stage IS
  '본인이 고른 경력 단계. 직군 대분류마다 사다리가 다르다(lib/data/jobGroups.ts 의 경력단계).';
