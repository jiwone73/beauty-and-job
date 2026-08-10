-- ============================================================
-- 뷰티워크 · 헤어샵 카테고리 채우기 (엑셀 헤어샵 시트엔 카테고리 열이 없어 비어있던 것 보완)
-- 특성 기반 6분류: 대형 프랜차이즈 / 프리미엄 프랜차이즈 / 하이엔드 살롱 / 남성 전문 / 중저가·정찰제 / 트렌디 스타일링
-- 이미 seed된 라이브 DB에 실행. (category가 비어있는 헤어샵만 갱신 → 멱등)
-- Supabase SQL Editor에서 실행.
-- ============================================================
UPDATE target_companies SET category = CASE seq
    WHEN 1 THEN '대형 프랜차이즈'
    WHEN 2 THEN '대형 프랜차이즈'
    WHEN 3 THEN '대형 프랜차이즈'
    WHEN 4 THEN '프리미엄 프랜차이즈'
    WHEN 5 THEN '중저가·정찰제'
    WHEN 6 THEN '프리미엄 프랜차이즈'
    WHEN 7 THEN '대형 프랜차이즈'
    WHEN 8 THEN '대형 프랜차이즈'
    WHEN 9 THEN '대형 프랜차이즈'
    WHEN 10 THEN '대형 프랜차이즈'
    WHEN 11 THEN '대형 프랜차이즈'
    WHEN 12 THEN '프리미엄 프랜차이즈'
    WHEN 13 THEN '남성 전문'
    WHEN 14 THEN '남성 전문'
    WHEN 15 THEN '대형 프랜차이즈'
    WHEN 16 THEN '중저가·정찰제'
    WHEN 17 THEN '트렌디 스타일링'
    WHEN 18 THEN '중저가·정찰제'
    WHEN 19 THEN '트렌디 스타일링'
    WHEN 20 THEN '트렌디 스타일링'
    WHEN 21 THEN '하이엔드 살롱'
    WHEN 22 THEN '하이엔드 살롱'
    WHEN 23 THEN '하이엔드 살롱'
    WHEN 24 THEN '프리미엄 프랜차이즈'
    WHEN 25 THEN '대형 프랜차이즈'
    WHEN 26 THEN '중저가·정찰제'
    WHEN 27 THEN '트렌디 스타일링'
    WHEN 28 THEN '트렌디 스타일링'
    WHEN 29 THEN '하이엔드 살롱'
    WHEN 30 THEN '하이엔드 살롱'
  END
WHERE group_name = '헤어샵' AND (category IS NULL OR category = '');
