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
