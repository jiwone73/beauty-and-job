// 제안에 답이 없으면 언제까지 기다리나. 거절 통보를 만들지 않기로 한 대신,
// 기다리는 기간을 정해 둔다 — 매장이 다음 사람을 찾을 판단이 서야 한다.
// (원티드도 면접 제안을 7일 뒤 자동 거절로 처리한다.)
export const 제안유효일 = 7;

export function 제안만료(created_at: string | Date | null, interested_at?: string | Date | null): boolean {
  if (interested_at) return false;            // 답한 제안은 만료되지 않는다
  if (!created_at) return false;
  const 지난날 = (Date.now() - new Date(created_at).getTime()) / 86400000;
  return 지난날 >= 제안유효일;
}

// 며칠 남았나. 만료됐으면 0.
export function 제안남은날(created_at: string | Date | null): number {
  if (!created_at) return 제안유효일;
  const 지난날 = (Date.now() - new Date(created_at).getTime()) / 86400000;
  return Math.max(0, Math.ceil(제안유효일 - 지난날));
}
