// 비밀번호 규칙 — 서버 쪽 검증은 여기 한 곳에만 둔다. 회원가입·비밀번호 변경·재설정이
// 저마다 규칙을 따로 두면 한 곳만 강화했다가 나머지가 뒤처지는 일이 생긴다.
// "보안이 너무 약하잖아" — 8자 이상에 특수문자·숫자 각 1개 이상을 더한다.
const SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;
const DIGIT = /\d/;

export function passwordError(password: string): string | null {
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (!DIGIT.test(password)) return "비밀번호에 숫자를 1개 이상 포함해주세요.";
  if (!SPECIAL.test(password)) return "비밀번호에 특수문자를 1개 이상 포함해주세요.";
  return null;
}

export const PASSWORD_HINT = "8자 이상, 숫자·특수문자 각 1개 이상 포함";
