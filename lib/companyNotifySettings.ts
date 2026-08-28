/** 기업 알림설정 — 무엇을 켜고 끌 수 있는지 한 곳에서 정한다.
 *
 *  실제로 그 알림을 보내는 자리(지원 접수 등)와 설정 화면이 같은 목록을 봐야
 *  화면에만 있고 실은 안 지켜지는 스위치가 생기지 않는다.
 *
 *  지금 기업에게 가는 알림은 '새 지원자' 하나뿐이라, 끌지 말지가 아니라
 *  어느 길로 받을지(사이트 종 / 메일)를 고르게 했다.
 */
export const 알림칸 = [
  { key: "new_applicant",       title: "새 지원자 알림",  desc: "우리 공고에 지원이 들어오면 화면 위 종에 알려드려요." },
  { key: "new_applicant_email", title: "새 지원자 메일",  desc: "같은 소식을 담당자 이메일로도 보내드려요." },
] as const;

export type 알림열쇠 = (typeof 알림칸)[number]["key"];

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
