export function formatDeadline(deadline: string | null): string {
  if (!deadline) return "상시";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline); dl.setHours(0, 0, 0, 0);
  const dDay = Math.round((dl.getTime() - today.getTime()) / 86400000);
  if (dDay < 0) return "마감";
  if (dDay === 0) return "오늘 마감";
  return `D-${dDay}`;
}

export function expLevelLabel(level: string | null): string {
  if (level === "NEW") return "신입";
  if (level === "EXPERIENCED") return "경력";
  return "경력 무관";
}