// SMS 발송 유틸 (알리고)
// 환경변수 필요: ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER (등록된 발신번호)
// 셋 다 설정돼 있으면 실제 발송, 하나라도 없으면 콘솔 스텁으로 동작(개발/테스트용).

// 알리고 연동 여부 (키가 모두 세팅됐는지)
export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.ALIGO_API_KEY &&
    process.env.ALIGO_USER_ID &&
    process.env.ALIGO_SENDER
  );
}

export async function sendSMS(phone: string, message: string): Promise<boolean> {
  const API_KEY = process.env.ALIGO_API_KEY;
  const USER_ID = process.env.ALIGO_USER_ID;
  const SENDER = process.env.ALIGO_SENDER;

  // 미연동 상태: 콘솔 스텁 (개발/테스트용)
  if (!API_KEY || !USER_ID || !SENDER) {
    console.log(`[SMS-stub] to ${phone}: ${message}`);
    return true;
  }

  const receiver = phone.replace(/[^0-9]/g, "");
  if (receiver.length < 10) {
    console.error("[SMS] 유효하지 않은 수신번호:", phone);
    return false;
  }

  // 한글 포함 바이트 계산: 90byte 초과면 LMS, 이하면 SMS
  const byteLen = [...message].reduce(
    (n, ch) => n + (ch.charCodeAt(0) > 127 ? 2 : 1),
    0
  );
  const msgType = byteLen > 90 ? "LMS" : "SMS";

  try {
    const form = new URLSearchParams();
    form.set("key", API_KEY);
    form.set("user_id", USER_ID);
    form.set("sender", SENDER);
    form.set("receiver", receiver);
    form.set("msg", message);
    form.set("msg_type", msgType);

    const resp = await fetch("https://apis.aligo.in/send/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await resp.json();

    // 알리고 응답: result_code === "1" 이면 성공
    if (String(data.result_code) === "1") return true;

    console.error("[SMS] 알리고 발송 실패:", data.result_code, data.message);
    return false;
  } catch (e) {
    console.error("[SMS] 발송 오류:", e);
    return false;
  }
}

// 6자리 인증번호 생성
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
