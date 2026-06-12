// 생년월일(YYYYMMDD) 검증 - 프론트/백엔드 공용
const MIN_AGE = 14;  // 만 14세 이상 (개인정보보호법 법정대리인 동의 기준)
const MAX_AGE = 100; // 만 100세 이하

export function validateBirth(
  birth: string
): { ok: true } | { ok: false; message: string } {
  // 1) 형식: 8자리 숫자
  if (!/^\d{8}$/.test(birth)) {
    return { ok: false, message: "생년월일을 YYYYMMDD 8자리로 입력해주세요. (예: 19900115)" };
  }

  const year = Number(birth.slice(0, 4));
  const month = Number(birth.slice(4, 6));
  const day = Number(birth.slice(6, 8));

  // 2) 실존하는 날짜인지 (2월 30일, 13월 등 차단)
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return { ok: false, message: "올바른 날짜가 아닙니다. 생년월일을 다시 확인해주세요." };
  }

  // 3) 미래 날짜 금지
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d > today) {
    return { ok: false, message: "생년월일은 오늘 이후일 수 없습니다." };
  }

  // 4) 만 나이 하한/상한
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() < month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() < day);
  if (beforeBirthday) age--;

  if (age < MIN_AGE) {
    return { ok: false, message: `만 ${MIN_AGE}세 이상만 가입할 수 있습니다.` };
  }
  if (age > MAX_AGE) {
    return { ok: false, message: "생년월일을 다시 확인해주세요." };
  }

  return { ok: true };
}