/** 기업 알림설정 — 무엇을 켜고 끌 수 있는지 한 곳에서 정한다.
 *
 *  실제로 그 알림을 보내는 자리(지원 접수 등)와 설정 화면이 같은 목록을 봐야
 *  화면에만 있고 실은 안 지켜지는 스위치가 생기지 않는다.
 *
 *  두 갈래다.
 *   - 우리 일에 대한 알림: companies.notification_settings 에 산다.
 *   - 광고성 정보 수신 동의: term_agreements 에 산다. 가입 때 받은 그 동의와
 *     같은 기록이라 따로 둘 수 없다(끄면 철회 시각이 남아야 증빙이 된다).
 */
export const 알림칸 = [
  { key: "new_applicant",       title: "화면 알림", desc: "대시보드 상단 알림창에 띄워드려요." },
  { key: "new_applicant_email", title: "이메일",   desc: "등록하신 이메일로 지원 알림을 보내드려요." },
] as const;

export type 알림열쇠 = (typeof 알림칸)[number]["key"];

/** 광고성 정보 수신 동의 — terms.type 과 짝이다.
 *  "추천 인재 메일"은 구직자용 "추천 채용공고" 동의 문서(RECOMMENDATION)를 잘못
 *  재사용하고 있었다("3번은 구직자 페이지에 있어야 하는 내용아냐?") — 기업 전용
 *  문서(TALENT_RECOMMEND)로 분리했다. */
export const 동의칸 = [
  { key: "MARKETING",        title: "이메일",        desc: "뷰티워크의 이벤트·혜택·공지 소식을 메일로 보내드려요." },
  { key: "TALENT_RECOMMEND", title: "추천 인재 메일", desc: "등록하신 공고에 관심 표시한 인재만 메일로 추천해드려요." },
] as const;

export type 동의열쇠 = (typeof 동의칸)[number]["key"];

/** 비워 두면 켜진 것으로 본다 — 지원자가 왔는데 아무 말도 없는 쪽이 더 나쁘다.
 *  이미 쓰고 있던 기업들의 동작이 이 설정이 생겼다고 바뀌지 않는다는 뜻이기도 하다. */
export function 켜져있나(settings: any, key: 알림열쇠): boolean {
  const v = settings?.[key];
  return typeof v === "boolean" ? v : true;
}

/** 저장된 값을 화면이 그대로 쓸 수 있는 꼴로 편다(빠진 칸은 기본값으로 채운다). */
export function 펴기(settings: any): Record<알림열쇠, boolean> {
  return Object.fromEntries(알림칸.map((c) => [c.key, 켜져있나(settings, c.key)])) as Record<알림열쇠, boolean>;
}
