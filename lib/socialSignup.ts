import jwt from "jsonwebtoken";

// 간편가입 「가입표」.
//
// 카카오·네이버에서 프로필을 받아 왔다고 바로 회원을 만들면, 우리 약관에
// 동의하기 전에 개인정보가 저장된다. 그래서 신규는 users 에 넣지 않고
// 받아 온 값을 이 표에 담아 잠깐 들고 있다가, 동의를 받은 뒤에 만든다.
//
// 표는 서명해서 넘긴다 — 서명이 없으면 브라우저에서 kakao_id 를 지어내
// 남의 계정으로 가입할 수 있다. 10분이면 동의 화면을 채우기에 넉넉하다.
const SECRET = process.env.JWT_SECRET!;

export type 가입표 = {
  provider: "kakao" | "naver";
  providerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
};

export function 가입표만들기(v: 가입표): string {
  return jwt.sign({ ...v, kind: "social_signup" }, SECRET, { expiresIn: "10m" });
}

export function 가입표읽기(token: string): 가입표 {
  const p = jwt.verify(token, SECRET) as any;
  if (p?.kind !== "social_signup") throw new Error("가입표가 아니다");
  return {
    provider: p.provider,
    providerId: String(p.providerId),
    name: p.name || "",
    email: p.email || null,
    phone: p.phone || null,
    avatarUrl: p.avatarUrl || null,
  };
}
