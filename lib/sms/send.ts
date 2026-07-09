// SMS 발송 유틸 (알리고)
// 환경변수: ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER, SMS_ENABLED
//
// 실발송 조건: 키 3개 + SMS_ENABLED=true
// → 로컬(.env.local)에 키가 있어도 SMS_ENABLED를 켜지 않으면 콘솔 스텁으로만 동작.
//
// ⚠️ 알리고를 호출하는 코드는 이 파일이 유일해야 한다.

const ALIGO_ENDPOINT = "https://apis.aligo.in/send/";

export function isSmsConfigured(): boolean {
  if (process.env.SMS_ENABLED !== "true") return false;
  return Boolean(
    process.env.ALIGO_API_KEY &&
    process.env.ALIGO_USER_ID &&
    process.env.ALIGO_SENDER
  );
}

// 한글 포함 바이트 계산: 90byte 초과면 LMS
export function getMsgType(message: string): "SMS" | "LMS" {
  const byteLen = [...message].reduce(
    (n, ch) => n + (ch.charCodeAt(0) > 127 ? 2 : 1),
    0
  );
  return byteLen > 90 ? "LMS" : "SMS";
}

// 번호 정규화 + 유효성 필터
export function normalizePhones(list: string[]): string[] {
  return list
    .map((r) => (r || "").replace(/[^0-9]/g, ""))
    .filter((r) => r.length >= 10 && r.length <= 11);
}

type SendResult = {
  sent: boolean;
  count: number;
  type: "SMS" | "LMS";
  stub: boolean;
  error?: string;
};

// 내부 공통 발송기
async function dispatch(receivers: string[], message: string): Promise<SendResult> {
  const API_KEY = process.env.ALIGO_API_KEY;
  const USER_ID = process.env.ALIGO_USER_ID;
  const SENDER = process.env.ALIGO_SENDER;
  const msgType = getMsgType(message);

  if (!isSmsConfigured() || !API_KEY || !USER_ID || !SENDER) {
    console.log(`[SMS-stub] to ${receivers.join(",")}: ${message}`);
    return { sent: true, count: receivers.length, type: msgType, stub: true };
  }

  try {
    const form = new URLSearchParams();
    form.set("key", API_KEY);
    form.set("user_id", USER_ID);
    form.set("sender", SENDER);
    form.set("receiver", receivers.join(","));
    form.set("msg", message);
    form.set("msg_type", msgType);

    const resp = await fetch(ALIGO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await resp.json();

    if (String(data.result_code) === "1") {
      return { sent: true, count: receivers.length, type: msgType, stub: false };
    }

    console.error("[SMS] 알리고 발송 실패:", data.result_code, data.message);
    return {
      sent: false,
      count: 0,
      type: msgType,
      stub: false,
      error: data.message || "발송 실패",
    };
  } catch (e) {
    console.error("[SMS] 발송 오류:", e);
    return { sent: false, count: 0, type: msgType, stub: false, error: "발송 오류" };
  }
}

// 단건 발송 (휴대폰 인증용)
export async function sendSMS(phone: string, message: string): Promise<boolean> {
  const [receiver] = normalizePhones([phone]);
  if (!receiver) {
    console.error("[SMS] 유효하지 않은 수신번호:", phone);
    return false;
  }
  const r = await dispatch([receiver], message);
  return r.sent;
}

// 다중 발송 (어드민 안내 문자 — 현재 UI 보류)
export async function sendBulkSMS(
  phones: string[],
  message: string
): Promise<SendResult> {
  const receivers = normalizePhones(phones);
  if (receivers.length === 0) {
    return { sent: false, count: 0, type: getMsgType(message), stub: false, error: "유효한 수신번호 없음" };
  }
  return dispatch(receivers, message);
}

// 6자리 인증번호 생성
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}