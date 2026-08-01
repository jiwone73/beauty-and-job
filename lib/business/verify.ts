// 사업자등록번호 검증 — 국세청 API 없이 체크섬(형식)만 즉시 확인.
// (국세청 상태조회 API는 응답이 느려 제거. 체크섬으로 형식 유효성만 판별한다.)

export type BizVerify = {
  valid: boolean;
  skipped?: boolean;   // 실검증 생략(체크섬만) 표시
  status?: string;
  message?: string;
  reason?: string;
};

// 국세청 공식 체크섬 알고리즘
function isValidBizChecksum(n: string): boolean {
  if (n.length !== 10) return false;
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(n[i], 10) * w[i];
  sum += Math.floor((parseInt(n[8], 10) * 5) / 10);
  return (10 - (sum % 10)) % 10 === parseInt(n[9], 10);
}

export async function verifyBusinessNumber(input: string): Promise<BizVerify> {
  const bno = (input || "").replace(/\D/g, "");
  if (bno.length !== 10) return { valid: false, message: "사업자등록번호는 10자리 숫자입니다." };
  if (!isValidBizChecksum(bno)) return { valid: false, message: "유효하지 않은 사업자등록번호입니다." };
  return { valid: true, skipped: true, reason: "CHECKSUM_ONLY" };
}
