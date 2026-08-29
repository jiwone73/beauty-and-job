-- 복리후생 태그 '주차 가능' → '주차 지원'.
-- 가능은 매장에 자리가 있다는 말일 뿐이고, 사장님이 대는 것은 주차비다.
-- '교육비 지원'·'교통비 지원'과 같은 결로 맞춘다(띄어쓰기 규칙도 그대로).
-- 이 태그를 쓰는 공고는 아직 없어(benefit_tags 0건, benefits 텍스트 0건) 태그 이름만 고친다.
-- 멱등: 이미 '주차 지원'이 있으면 아무 일도 하지 않는다.

UPDATE benefit_tags
   SET name = '주차 지원'
 WHERE name = '주차 가능'
   AND NOT EXISTS (
     SELECT 1 FROM benefit_tags b2
      WHERE b2.name = '주차 지원' AND b2.job_type = benefit_tags.job_type
   );
