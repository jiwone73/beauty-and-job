-- 학력 구분(중학교/고등학교/대학(2,3년제)/대학(4년제)/대학원) 저장용 컬럼
ALTER TABLE user_educations ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT '';
