# 뷰티워크 작업 인수인계 노트

> 새 채팅방에서 이어서 작업할 때 이 파일을 읽고 시작하면 됩니다.
> 마지막 업데이트: 2026-07-20

## 새 채팅방에서 이렇게 말하면 이어집니다
아래 한 줄만 붙여넣으면 맥락 그대로 이어서 코딩합니다.

> "뷰티워크 프로젝트 이어서 하자. `/Users/jiwon/Desktop/beauty-and-job/HANDOFF.md` 읽고, 지금처럼 알아서 코딩·검증·배포까지 해줘."

## 프로젝트 개요
- **스택**: Next.js 14 App Router, React 클라이언트 컴포넌트, Tailwind + inline style + `app/globals.css`
- **작업 폴더**: `/Users/jiwon/Desktop/beauty-and-job`
- **DB**: Postgres(Supabase). 샌드박스에서 DB 직접 접속은 불가(EAI_AGAIN). SQL 마이그레이션은 사용자에게 실행 요청.

## 작업 방식(사용자 선호 — 반드시 지킬 것)
- 답변은 **항상 한국어**, 간결·직접적으로. 추측 최소화, 검증된 사실 기반.
- **툴 호출을 일일이 나레이션하지 말 것**(예: "이제 ~하겠습니다" 금지). 내용이 밀려서 싫어함.
- 전문가 수준 + 바로 쓸 수 있는 산출물.
- 폰트는 **평체(weight 400)**, 테이블 본문 색상 **#555**, 개인프로필 스타일과 통일 지향.

## 검증 & 배포 절차
```bash
# 타입 체크
cd /sessions/<세션>/mnt/beauty-and-job && timeout 40 npx tsc --noEmit
# 배포
rm -f .git/index.lock && git add -A && git commit -m "..." && git pull --rebase && git push
```
> ⚠️ 클라우드 세션(데스크톱 브리지)에서는 device_bash에 네트워크가 없어 `git push` 불가.
> 커밋까지만 하고, push는 (a) 사용자가 직접 `cd ~/Desktop/beauty-and-job && git push`,
> 또는 (b) 데스크톱 앱에서 이 작업을 "내 컴퓨터에서 실행"으로 재시작. 또한 device_bash는
> 파일 삭제가 안 돼 `.git/*.lock` 정리가 안 되므로, 락은 `mv 파일 파일.stale`로 치울 것.

## 핵심 파일
- `app/admin/members/page.tsx` — 회원관리(필터: 직군/상태/성별/나이/프로필/이력서/가입/가입일, 카운트 카드 클릭 필터)
- `app/api/admin/members/route.ts` — 회원 목록/상태변경(PATCH: ACTIVE·INACTIVE·SUSPENDED만)/삭제(DELETE 하드삭제)
- `components/jobs/JobPostForm.tsx` — 채용공고 등록/수정 폼(팝오버 기반, 600+600 컬럼, 급여단위·근무요일/시간)
- `components/jobs/JobDetailView.tsx` — 실제 공고 상세 = 미리보기 공용 컴포넌트
- `components/company/FilterDropdown.tsx` — "라벨 · 값" 커스텀 풀다운(기업/관리자 전역 사용)
- `lib/salary.ts`(`formatSalaryWon`), `lib/phone.ts`(`formatPhone`)
- `app/globals.css` — `.filter-dd-*`, 테이블 색상 #555, `.jobpost-form` 레이아웃 등

## 상태값 정리(방금 확인)
- 회원 `user_status` enum: **ACTIVE(정상) / INACTIVE(휴면) / SUSPENDED(정지) / WITHDRAWN(탈퇴)**
- 탈퇴 = 소프트삭제(행 유지, `withdrawn_at`). 관리자 "선택 삭제" = 하드삭제(`DELETE FROM users`).
- 회원관리에 **탈퇴(WITHDRAWN) 반영 완료**: 라벨·카운트 카드·상태 필터 추가, 행 상태 셀은 탈퇴 회원을 읽기전용 배지로 표시(관리자가 임의 전환 불가, PATCH는 여전히 ACTIVE/INACTIVE/SUSPENDED만 허용).

## 남은/후속 작업 후보
1. (대기) Supabase 마이그레이션: 직군 "상품기획(제품기획)" → "상품기획"
2. (선택) `salary_type` enum 마이그레이션(주급/시급 공고 등록 실패 시)
3. (선택) 미사용 `/api/community/report` 라우트 정리(신고기능 UI는 이미 제거됨)

## 최근 완료(요약)
- 회원관리 탈퇴(WITHDRAWN) 상태 반영: 라벨·카운트·필터 추가, 탈퇴 회원 읽기전용 배지(`.admin-status-withdrawn`) — 커밋 `e46f40c`(origin/main 대비 1 ahead, 패스트포워드, **push 대기**)
- 신고 기능 전면 제거(공개 스토리 신고 버튼, 관리자 신고댓글 탭/신고 열)
- 현장이야기 관리: 행별 관리 제거 + 일괄 숨김/복구, "승인대기"→"AI 글 승인"
- 회원관리: 카운트 카드 클릭 필터, 가입/성별/나이/프로필/이력서 필터 추가
- 이력서 에디터 경력 필수(*) 표시
- 테이블 폰트/색상 통일, 전화번호 하이픈(formatPhone) + nowrap
- 북마크 저장 버그 수정(store 연동)
