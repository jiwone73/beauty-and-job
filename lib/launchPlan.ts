/** 10월 1일 오픈까지 할 일.
 *
 *  항목은 여기 두고 「어디까지 했나」만 표에 쌓는다(launch_tasks).
 *  날짜는 거꾸로 잡았다 — 바깥 기관이 걸린 일은 추석 연휴(9/24~26) 전에 끝나야 한다.
 */
export const 오픈일 = "2026-10-01";
export const 일정시작 = "2026-09-10";
/** 관공서·PG 심사가 멈추는 구간. 막대 뒤에 옅게 깔아 「여기는 못 쓴다」를 보여 준다. */
export const 연휴 = { start: "2026-09-24", end: "2026-09-26", label: "추석" };

export type 묶음 = "바깥 기관" | "정하실 것" | "보안·뒷정리" | "클로드";
export type LaunchTask = {
  id: string;
  group: 묶음;
  title: string;
  /** 시작일 — 없으면 마감일 하루짜리로 그린다. */
  start?: string;
  due: string;
  owner: "관리자" | "클로드";
  /** 이것이 끝나야 시작할 수 있는 일. 막대 사이 이음선으로 그린다. */
  after?: string;
  note?: string;
};

export const GROUP_COLOR: Record<묶음, string> = {
  "바깥 기관": "#c0392b",
  "정하실 것": "#582681",
  "보안·뒷정리": "#9a9aa0",
  "클로드": "#2f7a4d",
};

export const LAUNCH_TASKS: LaunchTask[] = [
  // ── 바깥 기관 — 리드타임이 있어 제일 먼저 움직여야 한다 ──
  { id: "pg-apply", group: "바깥 기관", owner: "관리자", title: "PG사 정하고 가입 신청",
    start: "2026-09-10", due: "2026-09-11", note: "심사 3~7영업일. 여기가 밀리면 뒤가 다 밀린다" },
  { id: "pg-docs", group: "바깥 기관", owner: "관리자", title: "PG 서류 — 사업자등록증·통장사본·신분증",
    start: "2026-09-10", due: "2026-09-11", note: "대표 정은우 명의" },
  { id: "biz-report", group: "바깥 기관", owner: "관리자", title: "통신판매업 신고",
    start: "2026-09-14", due: "2026-09-15", after: "pg-apply", note: "구매안전서비스 이용확인증이 있어야 접수됨. 처리 3영업일" },
  { id: "terms-refund", group: "바깥 기관", owner: "관리자", title: "이용약관에 청약철회·환불 규정",
    start: "2026-09-15", due: "2026-09-17", note: "전자상거래법상 필수. PG 심사에서도 본다" },
  { id: "sms-number", group: "바깥 기관", owner: "관리자", title: "SMS 발신번호 등록 마무리",
    start: "2026-09-14", due: "2026-09-18", note: "통신서비스 이용증명원 — 스카이라이프 1588-3002" },
  { id: "kakao-biz", group: "바깥 기관", owner: "관리자", title: "카카오 채널 비즈니스 인증 결과 확인",
    due: "2026-09-18", note: "심사 접수만 된 상태" },
  { id: "privacy-pg", group: "바깥 기관", owner: "관리자", title: "개인정보처리방침에 PG사 위탁현황 추가",
    start: "2026-09-21", due: "2026-09-23", note: "결제가 붙는 순간 수탁자가 생긴다" },

  // ── 정하실 것 — 정해지면 클로드가 만든다 ──
  { id: "bm-plan", group: "정하실 것", owner: "관리자", title: "유료 요금제 정하기",
    due: "2026-09-11", note: "결제 케이스 7건이 이걸 기다린다" },
  { id: "worklocation", group: "정하실 것", owner: "관리자", title: "근무지 여러 곳을 공고에 어떻게 보일지",
    due: "2026-09-11", note: "리포트 3갈래 — 「이걸로」만 누르면 된다" },
  { id: "proposal-cap", group: "정하실 것", owner: "관리자", title: "제안 발송 상한",
    due: "2026-09-16", note: "지금 상한 없음. 없이 열면 구직자 쪽이 먼저 망가진다" },
  { id: "refund-rule", group: "정하실 것", owner: "관리자", title: "환불 시 유료기간 되돌리는 규칙",
    due: "2026-09-16" },

  // ── 보안·뒷정리 ──
  { id: "drop-sydney", group: "보안·뒷정리", owner: "클로드", title: "시드니 Supabase 프로젝트 삭제",
    due: "2026-09-15", note: "옮긴 지 일주일. 승인 뒤 실행" },
  { id: "rotate-keys", group: "보안·뒷정리", owner: "클로드", title: "DB 비밀번호·service_role 키 재발급",
    due: "2026-09-15", note: "예전에 대화창에 노출됐다" },
  { id: "test-account", group: "보안·뒷정리", owner: "클로드", title: "시험 기업계정 비밀번호 변경·메모리에서 삭제",
    due: "2026-09-29" },

  // ── 클로드 ──
  { id: "t-jobs", group: "클로드", owner: "클로드", title: "공고등록·기업공고관리 케이스 완주",
    start: "2026-09-10", due: "2026-09-14" },
  { id: "t-apply", group: "클로드", owner: "클로드", title: "지원·회원가입 케이스 완주",
    start: "2026-09-15", due: "2026-09-18" },
  { id: "pg-build", group: "클로드", owner: "클로드", title: "PG 연동 붙이기",
    start: "2026-09-21", due: "2026-09-23", after: "pg-apply" },
  { id: "t-pay", group: "클로드", owner: "클로드", title: "결제 케이스 완주",
    start: "2026-09-27", due: "2026-09-28", after: "pg-build" },
  { id: "regression", group: "클로드", owner: "클로드", title: "전 영역 회귀 재실행 · 코드 동결",
    start: "2026-09-29", due: "2026-09-30" },
];

export const GROUPS: 묶음[] = ["바깥 기관", "정하실 것", "보안·뒷정리", "클로드"];

/** 가장 긴 사슬. 여기 한 칸이 밀리면 오픈일이 그대로 밀린다.
 *
 *  PG 가입 → (구매안전서비스 확인증) → 통신판매업 신고 → 결제 연동 → 결제 시험 →
 *  회귀 → 오픈. 나머지 일은 이 사슬 옆에서 병렬로 돈다. */
export const CRITICAL_PATH = ["pg-apply", "biz-report", "pg-build", "t-pay", "regression"];

/** 주말과 추석 연휴를 뺀 날 수. 남은 여유를 셀 때 달력 날짜로 세면 실제보다 넉넉해 보인다. */
export function 영업일(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00+09:00`);
  const b = new Date(`${toISO}T00:00:00+09:00`);
  const 연휴s = new Date(`${연휴.start}T00:00:00+09:00`).getTime();
  const 연휴e = new Date(`${연휴.end}T00:00:00+09:00`).getTime();
  let n = 0;
  for (let t = a.getTime(); t <= b.getTime(); t += 86400000) {
    const d = new Date(t);
    const 요일 = d.getDay();
    if (요일 === 0 || 요일 === 6) continue;
    if (t >= 연휴s && t <= 연휴e) continue;
    n++;
  }
  return n;
}
