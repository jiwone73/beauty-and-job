// 급여 표기 유틸 — salary_min(원 단위) + salary_type(ANNUAL/MONTHLY/WEEKLY/HOURLY)

export const SALARY_TYPE_LABEL: Record<string, string> = {
  ANNUAL: "연봉",
  MONTHLY: "월급",
  WEEKLY: "주급",
  HOURLY: "시급",
};

/** salary_min(원)과 급여유형으로 표시 문자열 생성. 값 없으면 "급여 협의". */
export function formatSalaryWon(
  salaryMin: number | null | undefined,
  salaryType: string | null | undefined
): string {
  if (!salaryMin) return "급여 협의";
  const won = Number(salaryMin);
  if (salaryType === "HOURLY") return `시급 ${won.toLocaleString()}원`;
  const man = Math.round(won / 10000);
  const prefix = salaryType === "ANNUAL" ? "연" : salaryType === "WEEKLY" ? "주" : "월";
  return `${prefix} ${man.toLocaleString()}만원`;
}
