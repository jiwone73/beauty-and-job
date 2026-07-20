// 전화번호를 하이픈 형식으로 변환 (01012345678 → 010-1234-5678)
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const d = String(phone).replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return String(phone);
}
