// 국세청 사업자등록 상태조회(data.go.kr / odcloud.kr)로 사업자번호 검증
// env DATAGO_SERVICE_KEY = data.go.kr '디코딩' 인증키. 없거나 API 오류면 형식검증만 하고 통과(fail-open).
const KEY = process.env.DATAGO_SERVICE_KEY;
const ENDPOINT = "https://api.odcloud.kr/api/nts-businessman/v1/status";
const TIMEOUT_MS = 4000;
const DEV = process.env.NODE_ENV !== "production";
const dlog = (...a: unknown[]) => { if (DEV) console.warn("[bizverify]", ...a); };

export type BizVerify = {
  valid: boolean;
  skipped?: boolean;   // 키 없음/외부오류로 실검증 생략
  status?: string;     // 계속사업자 / 휴업자 / 폐업자
  message?: string;
};

export async function verifyBusinessNumber(input: string): Promise<BizVerify> {
  const bno = (input || "").replace(/\D/g, "");
  if (bno.length !== 10) return { valid: false, message: "사업자등록번호는 10자리 숫자입니다." };
  if (!KEY) { dlog("skip: DATAGO_SERVICE_KEY 없음 (서버 재시작 필요할 수 있음)"); return { valid: true, skipped: true }; }
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
    if (!res.ok) { dlog("skip: HTTP", res.status, await res.text().catch(() => "")); return { valid: true, skipped: true }; }
    const data = await res.json();
    const item = data?.data?.[0];
    if (!item) { dlog("skip: 응답 data 비어있음", JSON.stringify(data).slice(0, 300)); return { valid: true, skipped: true }; }
    const stt: string = item.b_stt || "";
    dlog("응답 b_stt=", JSON.stringify(stt), "tax_type=", item.tax_type);
    if (!stt) return { valid: false, message: "국세청에 등록되지 않은 사업자등록번호입니다." };
    if (stt.includes("폐업")) return { valid: false, status: stt, message: "폐업된 사업자등록번호입니다." };
    return { valid: true, status: stt };
  } catch (e) {
    dlog("skip: 예외", (e as Error)?.name, (e as Error)?.message);
    return { valid: true, skipped: true };
  } finally {
    clearTimeout(timer);
  }
}
