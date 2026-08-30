// 전화번호 표기. 저장은 숫자만 하고, 화면에 낼 때만 하이픈을 넣는다.
// 등록 화면과 공개 화면이 같은 함수를 써야 두 화면이 같은 모양으로 보인다.
export function 전화꼴(v: string): string {
  const d = String(v || "").replace(/\D/g, "").slice(0, 11);
  const 서울 = d.startsWith("02");
  const 앞 = 서울 ? 2 : 3;
  if (d.length <= 앞) return d;
  if (d.length <= 앞 + 4) return `${d.slice(0, 앞)}-${d.slice(앞)}`;
  return `${d.slice(0, 앞)}-${d.slice(앞, d.length - 4)}-${d.slice(-4)}`;
}
