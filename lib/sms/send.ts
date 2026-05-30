// SMS 발송 유틸
// [1단계] 현재는 콘솔 출력 스텁입니다.
// [상용화] 아래 sendSMS 함수 내부만 알리고/네이버 SENS API 호출로 교체하면 됩니다.

export async function sendSMS(phone: string, message: string): Promise<boolean> {
  // ===== 상용화 시 이 블록만 교체 =====
  console.log(`[SMS] to ${phone}: ${message}`);
  return true;
  // ===================================

  // 예시 (알리고):
  // const res = await fetch("https://apis.aligo.in/send/", {
  //   method: "POST",
  //   body: new URLSearchParams({
  //     key: process.env.ALIGO_API_KEY!,
  //     user_id: process.env.ALIGO_USER_ID!,
  //     sender: process.env.ALIGO_SENDER!,
  //     receiver: phone,
  //     msg: message,
  //   }),
  // });
  // return res.ok;
}

// 6자리 인증번호 생성
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
