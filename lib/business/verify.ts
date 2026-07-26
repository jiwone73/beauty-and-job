// 국세청 사업자등록 상태조회(data.go.kr / odcloud.kr)로 사업자번호 검증
// env DATAGO_SERVICE_KEY = data.go.kr '디코딩' 인증키. 없거나 API 오류면 형식검증만 하고 통과(fail-open).
const KEY = process.env.DATAGO_SERVICE_KEY;
const ENDPOINT = "https://api.odcloud.kr/api/nts-businessman/v1/status";
const TIMEOUT_MS = 3500;
const RETRIES = 1; // 5xx(국세청 서버 오류) 시 추가 재시도 횟수
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type BizVerify = {
  valid: boolean;
  skipped?: boolean;   // 키 없음/외부오류로 실검증 생략
  status?: string;     // 계속사업자 / 휴업자 / 폐업자
  message?: string;
  reason?: string;     // (임시 진단용) skip 사유
};

export async function verifyBusinessNumber(input: string): Promise<BizVerify> {
  const bno = (input || "").replace(/\D/g, "");
  if (bno.length !== 10) return { valid: false, message: "사업자등록번호는 10자리 숫자입니다." };
  if (!KEY) return { valid: true, skipped: true, reason: "NO_KEY" };

  let lastReason = "UNKNOWN";
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(500);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${ENDPOINT}?serviceKey=${encodeURIComponent(KEY)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ b_no: [bno] }),
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = (await res.text().catch(() => "")).slice(0, 140).replace(/\s+/g, " ");
        lastReason = `HTTP_${res.status}:${body}`;
        if (res.status >= 500 && attempt < RETRIES) continue; // 국세청 서버 오류 → 재시도
        return { valid: true, skipped: true, reason: lastReason };
      }
      const data = await res.json();
      const item = data?.data?.[0];
      if (!item) return { valid: true, skipped: true, reason: `EMPTY:${JSON.stringify(data).slice(0, 140)}` };
      const stt: string = item.b_stt || "";
      if (!stt) return { valid: false, message: "국세청에 등록되지 않은 사업자등록번호입니다." };
      if (stt.includes("폐업")) return { valid: false, status: stt, message: "폐업된 사업자등록번호입니다." };
      return { valid: true, status: stt };
    } catch (e) {
      lastReason = `ERR_${(e as Error)?.name || "?"}`;
      if (attempt < RETRIES) continue;
    } finally {
      clearTimeout(timer);
    }
  }
  return { valid: true, skipped: true, reason: lastReason };
}
