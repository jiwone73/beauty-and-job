# 유료서비스 전 구간 검증

`node scripts/검증/유료전구간.mjs`

`npm run dev` 를 띄워 두고 돌린다. 서울 DB 에 `[검증]` 표를 단 기업을 하나
만들어 주문 → 입금 확인 → 채용관 노출 → 만료까지 실제로 태우고, 끝에 지운다.
`plan_sales` 스위치도 잠깐 켰다가 원래대로 돌려놓는다.

중간에 끊겼으면 남은 것을 손으로 지운다:

```sql
DELETE FROM job_postings WHERE company_id IN (SELECT id FROM companies WHERE company_name LIKE '[검증]%');
DELETE FROM company_orders WHERE company_id IN (SELECT id FROM companies WHERE company_name LIKE '[검증]%');
DELETE FROM companies WHERE company_name LIKE '[검증]%';
UPDATE app_settings SET value='off' WHERE key='plan_sales';
```

# 이벤트 무료 체험 · 등급별 기능 · 스위치 검증

`node scripts/검증/이벤트체험.mjs`

`npm run dev` 를 띄워 두고 돌린다. 서울 DB 에 `[검증]` 표를 단 기업(스타트·라이트·스탠다드·프리미엄·이벤트)을
만들어 다음을 확인하고 끝에 지운다. `app_settings.event_showcase` 는 잠깐 바꿨다가 원래대로 돌려놓는다.

1. 이벤트 기간 가입 기업이 프리미엄을 가입일 + 3개월 − 1일까지 받는다(출처 `plan_source='EVENT'`), 기간 밖 가입은 받지 않는다
2. 등급 × 인재 열람(스탠다드부터 열림)
3. 등급 × 공고 건수(스타트 한 번에 1건, 라이트부터 여러 건)
4. 검색 목록 순서(등급 → 같은 등급 안은 최근 로그인)
5. 메인 채용관 줄서기(이벤트 기간)
6. 상품소개 표시용 스위치 값(`/api/plans` 의 `trial`)
7. 종료일이 지나면 스타트로 내려간다(일반 이용권 만료와 같은 길)
8. 스위치 끄기(설정에서 `months` 를 빼면 유료화 모드: 체험 없음, 구매 등급 방식으로 복귀)
9. 활동 기록(`activity_events`): 공고 등록·수정, 인재검색, 이력서 열람, 공고 조회

중간에 끊겼으면 남은 것을 손으로 지운다:

```sql
DELETE FROM activity_events WHERE actor_id IN (SELECT id FROM companies WHERE company_name LIKE '[검증]%');
DELETE FROM job_postings WHERE company_id IN (SELECT id FROM companies WHERE company_name LIKE '[검증]%');
DELETE FROM companies WHERE company_name LIKE '[검증]%';
-- event_showcase 는 backups/2026-10-03_event_showcase_이전값.json 이나 아래 값으로 되돌린다
-- {"from":"2026-10-12","to":"2026-12-30","until":"2027-03-30","title":"오픈이벤트 채용관","months":3,"plan":"PREMIUM"}
```
