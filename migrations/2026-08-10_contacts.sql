-- ============================================================
-- 뷰티워크 · target_companies 연락처/이메일 채우기 (공식 홈페이지에서 확인된 값만)
-- 대형 리테일 다수는 robots.txt/봇차단으로 미확인 → 비워둠(관리자 페이지에서 추가).
-- 신뢰 낮은 항목(대행사 의심 설화수/헤라, 오타 이메일 등)은 제외.
-- 멱등: 해당 칸이 비어있는 행만 채움(brand_name 기준, 동일 브랜드는 여러 탭 동시 반영).
-- Supabase SQL Editor에서 실행.
-- ============================================================
UPDATE target_companies t SET
  phone = COALESCE(NULLIF(t.phone, ''), NULLIF(v.phone, '')),
  email = COALESCE(NULLIF(t.email, ''), NULLIF(v.email, ''))
FROM (VALUES
  ('리안헤어 (RIAHN)', '02-588-1837', ''),
  ('박승철헤어스투디오', '02-543-9700', ''),
  ('로이드밤 (LLOYD BOMB)', '1522-0377', 'huuim_help@naver.com'),
  ('이철헤어커커', '02-543-2326', ''),
  ('모즈토리 (구 토리헤어)', '1577-9111', ''),
  ('블루클럽 (Blue Club)', '02-592-5818', ''),
  ('리챠드프로헤어', '1688-6284', ''),
  ('차홍아르더 / 차홍룸', '', 'pr@chahong.kr'),
  ('제니하우스 (JENNYHOUSE)', '02-545-7209', ''),
  ('라뷰티코아 (La Beauty Core)', '', 'hyuntae4u@naver.com'),
  ('차홍아르더 (CHAHONG ARDOR)', '', 'pr@chahong.kr'),
  ('조성아뷰티 / 아티스트 레이블', '010-4212-0878', 'business@chochosfactory.com'),
  ('제니하우스 (청담힐 / 프리모)', '02-545-7209', ''),
  ('알루 (ALUU 청담점/도산점)', '02-542-8123', 'aluupr@naver.com'),
  ('애브뉴준오 (Avenue JUNO)', '02-2138-0605', ''),
  ('포쉬네일 (Forsythe Nail)', '031-393-0040', ''),
  ('제니하우스 네일', '02-545-7209', ''),
  ('알루 (ALUU) 네일', '02-542-8123', 'aluupr@naver.com'),
  ('차홍아르더 네일/뷰티', '', 'pr@chahong.kr'),
  ('정샘물 플롭스 네일', '080-816-7671', 'jsmbeauty_cs@jsmbeauty.com'),
  ('정샘물 플롭스 (JUNGSAEMMOOL)', '080-816-7671', 'jsmbeauty_cs@jsmbeauty.com'),
  ('약손명가 (Yakson)', '1566-8500', ''),
  ('더 트리니티 스파', '', 'trinity@lnkwellness.co.kr'),
  ('여용국 (Yeoyongguk)', '02-412-0100', 'ringko@hanmail.net'),
  ('스파 드 엘르 (Spa de ELLE)', '0507-1438-3950', 'yangmuri1947@naver.com'),
  ('WT메소드 (WT-Method)', '02-521-1580', ''),
  ('웰킨 두피탈모센터 (Wellkin)', '1544-9296', 'cs@kobizstar.com'),
  ('이문원 모발한의원/헤어랩', '02-511-1079', 'leemoonwon.international@gmail.com'),
  ('더모락 (The Morak)', '1811-7637', ''),
  ('자올 닥터스파 (Zaol)', '1644-5026', 'thezaol_@naver.com'),
  ('리더스 피부과 두피케어', '1588-7833', 'master@beautyleader.co.kr'),
  ('케라스타즈 럭셔리 스파', '02-3497-9500', ''),
  ('아베다 헤드스파 (Aveda)', '', 'consumercare-kr@aveda.com'),
  ('준오헤어 에코 헤드스파', '02-548-0605', ''),
  ('헤드스파 K (HeadSpa K)', '042-826-3773', 'ecobio@psforyou.net'),
  ('아리따움 (ARITAUM)', '080-555-6006', 'support@aritaum.com'),
  ('온누리약국 뷰티 / 웰니스', '1833-3128', 'onns@onns.kr'),
  ('뷰티컬리 (Beauty Kurly)', '1644-1107', 'help@kurlycorp.com'),
  ('지그재그 뷰티 (ZIGZAG)', '02-1670-8050', 'info@kakaostyle.com'),
  ('쿠팡 R.LUX (알럭스)', '1577-7011', 'help@coupang.com'),
  ('쿠팡 뷰티 (Coupang Beauty)', '1577-7011', 'help@coupang.com'),
  ('G마켓 / 옥션 뷰티관', '1566-5701', ''),
  ('SK스토아 뷰티', '1566-0106', 'customercscenter@skstoa.com'),
  ('에이피알 D2C (메디큐브/에이프릴)', '1577-0719', 'cs123@apr-in.com'),
  ('클럽클리오 (Club Clio)', '080-080-1510', 'hnlee@clio.co.kr'),
  ('마녀공장 공식몰', '02-6013-0855', 'manyofactory_cs@manyo.co.kr'),
  ('VT 코스메틱 자사몰', '1661-9456', 'cs@vt-cosmetics.com'),
  ('가히 (KAHI) 공식몰', '02-3409-2104', 'kot@coreatech.kr'),
  ('달바 (d''Alba) 공식몰', '02-332-7727', 'dalba@dalba.com'),
  ('아누아 (ANUA) 공식몰', '1688-9407', 'business@anua.kr'),
  ('스킨1004 (SKIN1004)', '1644-9968', 'cs@skin1004korea.com'),
  ('롬앤 (rom&nd) 자사몰', '1670-2238', 'romandyou@romand.co.kr'),
  ('라운드랩 (Round Lab)', '070-7717-0675', 'cs@roundlab.co.kr'),
  ('토니모리 공식몰 (TMONEYMOLY)', '080-356-2222', ''),
  ('스킨푸드 공식몰', '080-012-7878', 'skinfood_cs@theskinfood.com'),
  ('이니스프리 공식몰', '080-380-0114', 'innisfree@innisfree.com'),
  ('바닐라코 (BANILA CO)', '080-225-6500', 'banila@banila.com'),
  ('투쿨포스쿨 공식몰', '1566-3128', 'toocoolgirl@toocool.co.kr')
) AS v(brand_name, phone, email)
WHERE t.brand_name = v.brand_name
  AND (NULLIF(v.phone,'') IS NOT NULL OR NULLIF(v.email,'') IS NOT NULL);
